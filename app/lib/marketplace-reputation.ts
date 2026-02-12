/**
 * Fetch and aggregate seller reputation from FSBD, eBay, Etsy.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getValidToken } from '@/lib/marketplace-tokens'

const EBAY_SANDBOX = process.env.EBAY_SANDBOX === 'true'
const EBAY_BASE = EBAY_SANDBOX ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com'
const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID

export type ReputationData = {
  fsbd_rating_avg: number | null
  fsbd_review_count: number
  ebay_rating_avg: number | null
  ebay_feedback_count: number
  etsy_rating_avg: number | null
  etsy_review_count: number
  combined_score: number | null
  platforms_count: number
}

/** Fetch eBay feedback rating for a seller (by username). */
export async function fetchEbayReputation(
  walletHash: string,
  ebayUsername: string
): Promise<{ ratingAvg: number | null; feedbackCount: number }> {
  const token = await getValidToken(walletHash, 'ebay')
  if (!token || !ebayUsername) return { ratingAvg: null, feedbackCount: 0 }

  try {
    const url = `${EBAY_BASE}/commerce/feedback/v1/feedback_rating_summary?user_id=${encodeURIComponent(ebayUsername)}&filter=ratingType:OVERALL_EXPERIENCE,period:365`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { ratingAvg: null, feedbackCount: 0 }

    const data = (await res.json()) as {
      feedbackRatingSummary?: Array<{
        ratingSummaryByRatingType?: Array<{
          userRoleType?: string
          feedbackMetrics?: Array<{ metricName?: string; metricValue?: number }>
          feedbackRatingValueDistribution?: Array<{ value?: string; count?: number }>
        }>
      }>
    }

    const summary = data.feedbackRatingSummary?.[0]
    const sellerSummary = summary?.ratingSummaryByRatingType?.find((s) => s.userRoleType === 'SELLER')
    if (!sellerSummary) return { ratingAvg: null, feedbackCount: 0 }

    let ratingAvg: number | null = null
    const avgMetric = sellerSummary.feedbackMetrics?.find((m) => m.metricName === 'AVG')
    if (avgMetric?.metricValue != null) ratingAvg = avgMetric.metricValue

    let feedbackCount = 0
    const countMetric = sellerSummary.feedbackMetrics?.find((m) => m.metricName === 'COUNT')
    if (countMetric?.metricValue != null) feedbackCount = Math.floor(countMetric.metricValue)
    else if (sellerSummary.feedbackRatingValueDistribution) {
      feedbackCount = sellerSummary.feedbackRatingValueDistribution.reduce((s, d) => s + (d.count ?? 0), 0)
    }

    if (ratingAvg == null && sellerSummary.feedbackRatingValueDistribution?.length) {
      const dist = sellerSummary.feedbackRatingValueDistribution
      const posCount = dist.find((d) => d.value === 'POSITIVE')?.count ?? 0
      const total = dist.reduce((s, d) => s + (d.count ?? 0), 0)
      if (total > 0) ratingAvg = (posCount / total) * 5
    }

    return { ratingAvg, feedbackCount }
  } catch {
    return { ratingAvg: null, feedbackCount: 0 }
  }
}

/** Fetch Etsy shop rating. */
export async function fetchEtsyReputation(walletHash: string): Promise<{ ratingAvg: number | null; reviewCount: number }> {
  const token = await getValidToken(walletHash, 'etsy')
  if (!token || !ETSY_CLIENT_ID) return { ratingAvg: null, reviewCount: 0 }

  try {
    const userId = token.split('.')[0]
    if (!userId) return { ratingAvg: null, reviewCount: 0 }

    const shopsRes = await fetch(`https://api.etsy.com/v3/application/users/${userId}/shops`, {
      headers: {
        'x-api-key': ETSY_CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
    })
    if (!shopsRes.ok) return { ratingAvg: null, reviewCount: 0 }

    const shopsData = (await shopsRes.json()) as { results?: Array<{ shop_id: number }> }
    const shopId = shopsData.results?.[0]?.shop_id
    if (shopId == null) return { ratingAvg: null, reviewCount: 0 }

    const shopRes = await fetch(`https://api.etsy.com/v3/application/shops/${shopId}`, {
      headers: {
        'x-api-key': ETSY_CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
    })
    if (!shopRes.ok) return { ratingAvg: null, reviewCount: 0 }

    const shop = (await shopRes.json()) as {
      rating?: number
      rating_count?: number
      review_count?: number
    }

    const ratingAvg = typeof shop.rating === 'number' ? shop.rating : null
    const reviewCount = shop.review_count ?? shop.rating_count ?? 0

    return { ratingAvg, reviewCount }
  } catch {
    return { ratingAvg: null, reviewCount: 0 }
  }
}

/** Fetch FSBD reputation (placeholder - no native reviews yet). */
export async function fetchFsbdReputation(_walletHash: string): Promise<{ ratingAvg: number | null; reviewCount: number }> {
  return { ratingAvg: null, reviewCount: 0 }
}

/** Aggregate reputation from all connected platforms and upsert to seller_reputation. */
export async function aggregateReputation(walletHash: string): Promise<ReputationData> {
  const result: ReputationData = {
    fsbd_rating_avg: null,
    fsbd_review_count: 0,
    ebay_rating_avg: null,
    ebay_feedback_count: 0,
    etsy_rating_avg: null,
    etsy_review_count: 0,
    combined_score: null,
    platforms_count: 0,
  }

  const [fsbd, ebayVerification, etsyToken, wooConnected] = await Promise.all([
    fetchFsbdReputation(walletHash),
    supabaseAdmin
      ? supabaseAdmin
          .from('seller_verifications')
          .select('platform_username')
          .eq('wallet_address_hash', walletHash)
          .eq('platform', 'ebay')
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getValidToken(walletHash, 'etsy'),
    supabaseAdmin
      ? supabaseAdmin
          .from('woocommerce_connections')
          .select('id')
          .eq('wallet_address_hash', walletHash)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  result.fsbd_rating_avg = fsbd.ratingAvg
  result.fsbd_review_count = fsbd.reviewCount

  if (fsbd.reviewCount > 0) result.platforms_count++
  if (ebayVerification?.data) {
    const ebay = await fetchEbayReputation(
      walletHash,
      (ebayVerification.data as { platform_username?: string }).platform_username ?? ''
    )
    result.ebay_rating_avg = ebay.ratingAvg
    result.ebay_feedback_count = ebay.feedbackCount
    if (ebay.feedbackCount > 0 || ebay.ratingAvg != null) result.platforms_count++
  }
  if (etsyToken) {
    const etsy = await fetchEtsyReputation(walletHash)
    result.etsy_rating_avg = etsy.ratingAvg
    result.etsy_review_count = etsy.reviewCount
    if (etsy.reviewCount > 0 || etsy.ratingAvg != null) result.platforms_count++
  }

  const ratings: number[] = []
  if (result.fsbd_rating_avg != null) ratings.push(result.fsbd_rating_avg)
  if (result.ebay_rating_avg != null) ratings.push(result.ebay_rating_avg)
  if (result.etsy_rating_avg != null) ratings.push(result.etsy_rating_avg)

  if (ratings.length > 0) {
    result.combined_score = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
  }

  if (supabaseAdmin) {
    await supabaseAdmin.from('seller_reputation').upsert(
      {
        wallet_address_hash: walletHash,
        fsbd_rating_avg: result.fsbd_rating_avg,
        fsbd_review_count: result.fsbd_review_count,
        ebay_rating_avg: result.ebay_rating_avg,
        ebay_feedback_count: result.ebay_feedback_count,
        etsy_rating_avg: result.etsy_rating_avg,
        etsy_review_count: result.etsy_review_count,
        combined_score: result.combined_score,
        platforms_count: result.platforms_count,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: 'wallet_address_hash' }
    )
  }

  return result
}
