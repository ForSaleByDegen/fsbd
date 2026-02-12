/**
 * Cross-post FSBD listings to eBay, Etsy, WooCommerce.
 * Runs in background after listing creation.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getValidToken } from '@/lib/marketplace-tokens'
import { decryptSellerToken } from '@/lib/seller-verification-encrypt'

export type CrossPostPlatform = 'ebay' | 'etsy' | 'woocommerce'

export type CrossPostListing = {
  id: string
  title: string
  description: string
  price: number
  images: string[]
  quantity: number
  category?: string | null
}

export type CrossPostResult = {
  platform: CrossPostPlatform
  status: 'synced' | 'error'
  external_listing_id?: string
  external_url?: string
  error?: string
}

const EBAY_SANDBOX = process.env.EBAY_SANDBOX === 'true'
const EBAY_BASE = EBAY_SANDBOX ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com'
const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID

async function fetchEbayPolicyIds(token: string): Promise<{
  fulfillmentPolicyId?: string
  paymentPolicyId?: string
  returnPolicyId?: string
}> {
  const [fulfillmentRes, paymentRes, returnRes] = await Promise.all([
    fetch(`${EBAY_BASE}/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${EBAY_BASE}/sell/account/v1/payment_policy?marketplace_id=EBAY_US`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${EBAY_BASE}/sell/account/v1/return_policy?marketplace_id=EBAY_US`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ])

  const [fp, pp, rp] = await Promise.all([
    fulfillmentRes.ok ? fulfillmentRes.json().then((d: { fulfillmentPolicies?: Array<{ fulfillmentPolicyId?: string }> }) => d.fulfillmentPolicies?.[0]?.fulfillmentPolicyId) : Promise.resolve(undefined),
    paymentRes.ok ? paymentRes.json().then((d: { paymentPolicies?: Array<{ paymentPolicyId?: string }> }) => d.paymentPolicies?.[0]?.paymentPolicyId) : Promise.resolve(undefined),
    returnRes.ok ? returnRes.json().then((d: { returnPolicies?: Array<{ returnPolicyId?: string }> }) => d.returnPolicies?.[0]?.returnPolicyId) : Promise.resolve(undefined),
  ])

  return { fulfillmentPolicyId: fp, paymentPolicyId: pp, returnPolicyId: rp }
}

/** Cross-post to eBay: create inventory item + offer. May fail if seller has no policies. */
export async function crossPostToEbay(
  walletHash: string,
  listing: CrossPostListing
): Promise<CrossPostResult> {
  const token = await getValidToken(walletHash, 'ebay')
  if (!token) {
    return { platform: 'ebay', status: 'error', error: 'eBay not connected' }
  }

  const sku = `fsbd-${listing.id}`.slice(0, 50)
  const price = listing.price > 0 ? listing.price : 1
  const images = (listing.images ?? []).slice(0, 12).filter(Boolean)

  try {
    const policies = await fetchEbayPolicyIds(token)
    if (!policies.fulfillmentPolicyId || !policies.paymentPolicyId || !policies.returnPolicyId) {
      return { platform: 'ebay', status: 'error', error: 'Set up fulfillment, payment, and return policies in eBay Seller Hub first' }
    }

    const invPayload = {
      product: {
        title: listing.title.slice(0, 80),
        description: listing.description.slice(0, 5000),
        imageUrls: images,
      },
      availability: {
        shipToLocationAvailability: { quantity: Math.max(1, listing.quantity) },
      },
      condition: 'NEW',
    }

    const invRes = await fetch(`${EBAY_BASE}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Language': 'en-US',
      },
      body: JSON.stringify(invPayload),
    })

    if (!invRes.ok) {
      const txt = await invRes.text()
      return { platform: 'ebay', status: 'error', error: `Inventory: ${invRes.status} ${txt.slice(0, 200)}` }
    }

    const offerPayload = {
      sku,
      marketplaceId: 'EBAY_US',
      format: 'FIXED_PRICE',
      listingDescription: listing.description.slice(0, 5000),
      listingPolicies: {
        paymentPolicyId: policies.paymentPolicyId,
        returnPolicyId: policies.returnPolicyId,
        fulfillmentPolicyId: policies.fulfillmentPolicyId,
      },
      merchantLocationKey: 'default',
      pricingSummary: {
        price: { value: price.toFixed(2), currency: 'USD' },
      },
      quantityLimitPerBuyer: 10,
      categoryId: '9355',
    }

    const offerRes = await fetch(`${EBAY_BASE}/sell/inventory/v1/offer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Language': 'en-US',
      },
      body: JSON.stringify(offerPayload),
    })

    if (!offerRes.ok) {
      const txt = await offerRes.text()
      return { platform: 'ebay', status: 'error', error: `Offer: ${offerRes.status} ${txt.slice(0, 200)}` }
    }

    const offerData = (await offerRes.json()) as { offerId?: string }
    const offerId = offerData.offerId
    if (!offerId) return { platform: 'ebay', status: 'error', error: 'No offerId returned' }

    const publishRes = await fetch(
      `${EBAY_BASE}/sell/inventory/v1/offer/${offerId}/publish`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en-US',
        },
      }
    )

    if (!publishRes.ok) {
      const txt = await publishRes.text()
      return { platform: 'ebay', status: 'error', error: `Publish: ${publishRes.status} ${txt.slice(0, 200)}` }
    }

    const listingId = (await publishRes.json()) as { listingId?: string }
    const externalId = listingId.listingId ?? offerId
    const externalUrl = `https://www.ebay.com/itm/${externalId}`

    return {
      platform: 'ebay',
      status: 'synced',
      external_listing_id: externalId,
      external_url: externalUrl,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { platform: 'ebay', status: 'error', error: msg.slice(0, 300) }
  }
}

/** Cross-post to Etsy: create draft listing. Etsy may require image upload separately. */
export async function crossPostToEtsy(
  walletHash: string,
  listing: CrossPostListing
): Promise<CrossPostResult> {
  const token = await getValidToken(walletHash, 'etsy')
  if (!token || !ETSY_CLIENT_ID) {
    return { platform: 'etsy', status: 'error', error: 'Etsy not connected' }
  }

  const userId = token.split('.')[0]
  if (!userId) return { platform: 'etsy', status: 'error', error: 'Invalid token' }

  try {
    const shopsRes = await fetch(`https://api.etsy.com/v3/application/users/${userId}/shops`, {
      headers: {
        'x-api-key': ETSY_CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
    })
    if (!shopsRes.ok) return { platform: 'etsy', status: 'error', error: 'Failed to get shop' }

    const shopsData = (await shopsRes.json()) as { results?: Array<{ shop_id: number }> }
    const shopId = shopsData.results?.[0]?.shop_id
    if (shopId == null) return { platform: 'etsy', status: 'error', error: 'No shop found' }

    const priceAmount = Math.round((listing.price > 0 ? listing.price : 1) * 100)
    const body = {
      quantity: Math.max(1, listing.quantity),
      title: listing.title.slice(0, 140),
      description: listing.description.slice(0, 5000),
      price: { amount: priceAmount, divisor: 100, currency_code: 'USD' },
      state: 'draft',
    }

    const createRes = await fetch(
      `https://api.etsy.com/v3/application/shops/${shopId}/listings`,
      {
        method: 'POST',
        headers: {
          'x-api-key': ETSY_CLIENT_ID,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!createRes.ok) {
      const txt = await createRes.text()
      return { platform: 'etsy', status: 'error', error: `${createRes.status} ${txt.slice(0, 200)}` }
    }

    const data = (await createRes.json()) as { listing_id?: number }
    const listingId = data.listing_id
    if (listingId == null) return { platform: 'etsy', status: 'error', error: 'No listing_id returned' }

    const externalUrl = `https://www.etsy.com/listing/${listingId}`

    return {
      platform: 'etsy',
      status: 'synced',
      external_listing_id: String(listingId),
      external_url: externalUrl,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { platform: 'etsy', status: 'error', error: msg.slice(0, 300) }
  }
}

/** Cross-post to WooCommerce: create product. */
export async function crossPostToWooCommerce(
  walletHash: string,
  listing: CrossPostListing
): Promise<CrossPostResult> {
  if (!supabaseAdmin) return { platform: 'woocommerce', status: 'error', error: 'Database not configured' }

  const { data, error } = await supabaseAdmin
    .from('woocommerce_connections')
    .select('store_url, consumer_key_encrypted, consumer_secret_encrypted')
    .eq('wallet_address_hash', walletHash)
    .maybeSingle()

  if (error || !data) return { platform: 'woocommerce', status: 'error', error: 'WooCommerce not connected' }

  const storeUrl = (data as { store_url?: string }).store_url
  const keyEncrypted = (data as { consumer_key_encrypted?: string }).consumer_key_encrypted
  const secretEncrypted = (data as { consumer_secret_encrypted?: string }).consumer_secret_encrypted
  if (!storeUrl || !keyEncrypted || !secretEncrypted) {
    return { platform: 'woocommerce', status: 'error', error: 'Missing store credentials' }
  }

  let consumerKey: string
  let consumerSecret: string
  try {
    consumerKey = decryptSellerToken(keyEncrypted)
    consumerSecret = decryptSellerToken(secretEncrypted)
  } catch {
    return { platform: 'woocommerce', status: 'error', error: 'Failed to decrypt credentials' }
  }

  const base = storeUrl.replace(/\/$/, '')
  const url = `${base}/wp-json/wc/v3/products`
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
  const images = (listing.images ?? []).slice(0, 12).filter(Boolean)

  const body = {
    name: listing.title.slice(0, 500),
    description: listing.description.slice(0, 5000),
    regular_price: String(listing.price > 0 ? listing.price : 1),
    stock_quantity: Math.max(1, listing.quantity),
    images: images.map((src) => ({ src })),
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const txt = await res.text()
      return { platform: 'woocommerce', status: 'error', error: `${res.status} ${txt.slice(0, 200)}` }
    }

    const product = (await res.json()) as { id?: number; permalink?: string }
    const externalId = product.id != null ? String(product.id) : undefined
    const externalUrl = product.permalink ?? (externalId ? `${base}/product/?p=${externalId}` : undefined)

    return {
      platform: 'woocommerce',
      status: 'synced',
      external_listing_id: externalId,
      external_url: externalUrl,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { platform: 'woocommerce', status: 'error', error: msg.slice(0, 300) }
  }
}

/** Cross-post to all requested platforms and update listing.external_sync_status. */
export async function crossPost(
  listingId: string,
  walletHash: string,
  listing: CrossPostListing,
  platforms: CrossPostPlatform[]
): Promise<CrossPostResult[]> {
  if (platforms.length === 0) return []

  const results: CrossPostResult[] = []
  for (const platform of platforms) {
    let result: CrossPostResult
    if (platform === 'ebay') result = await crossPostToEbay(walletHash, listing)
    else if (platform === 'etsy') result = await crossPostToEtsy(walletHash, listing)
    else if (platform === 'woocommerce') result = await crossPostToWooCommerce(walletHash, listing)
    else continue
    results.push(result)
  }

  const externalSyncStatus: Record<string, { status: string; external_listing_id?: string; external_url?: string; error?: string }> = {}
  for (const r of results) {
    externalSyncStatus[r.platform] = {
      status: r.status,
      ...(r.external_listing_id && { external_listing_id: r.external_listing_id }),
      ...(r.external_url && { external_url: r.external_url }),
      ...(r.error && { error: r.error }),
    }
  }

  if (supabaseAdmin) {
    await supabaseAdmin
      .from('listings')
      .update({
        external_sync_status: externalSyncStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
  }

  return results
}
