/**
 * GET /api/seller/reputation?wallet=xxx
 * Returns aggregated seller reputation (FSBD + eBay + Etsy) for hub badge display.
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'
import { aggregateReputation } from '@/lib/marketplace-reputation'

export async function GET(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'general')
  if (rateLimited) return rateLimited

  const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  }

  const walletHash = hashWalletAddress(wallet)

  try {
    const fresh = request.nextUrl.searchParams.get('fresh') === 'true'
    if (!fresh && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('seller_reputation')
        .select('*')
        .eq('wallet_address_hash', walletHash)
        .maybeSingle()

      if (!error && data) {
        const r = data as {
          fsbd_rating_avg?: number | null
          fsbd_review_count?: number
          ebay_rating_avg?: number | null
          ebay_feedback_count?: number
          etsy_rating_avg?: number | null
          etsy_review_count?: number
          combined_score?: number | null
          platforms_count?: number
          last_updated_at?: string
        }
        const ageMs = r.last_updated_at ? Date.now() - new Date(r.last_updated_at).getTime() : Infinity
        if (ageMs < 60 * 60 * 1000) {
          return NextResponse.json({
            fsbd_rating_avg: r.fsbd_rating_avg,
            fsbd_review_count: r.fsbd_review_count ?? 0,
            ebay_rating_avg: r.ebay_rating_avg,
            ebay_feedback_count: r.ebay_feedback_count ?? 0,
            etsy_rating_avg: r.etsy_rating_avg,
            etsy_review_count: r.etsy_review_count ?? 0,
            combined_score: r.combined_score,
            platforms_count: r.platforms_count ?? 0,
          })
        }
      }
    }

    const reputation = await aggregateReputation(walletHash)
    return NextResponse.json(reputation)
  } catch (err) {
    console.error('[seller/reputation]', err)
    return NextResponse.json(
      { error: 'Failed to fetch reputation' },
      { status: 500 }
    )
  }
}
