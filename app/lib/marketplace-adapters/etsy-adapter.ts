/**
 * Etsy adapter: fetch shop listings via Etsy Open API v3
 */
import { getValidToken } from '@/lib/marketplace-tokens'
import type { ExternalSyncedListing } from './types'

const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID

export async function fetchEtsyListings(walletHash: string): Promise<ExternalSyncedListing[]> {
  const token = await getValidToken(walletHash, 'etsy')
  if (!token || !ETSY_CLIENT_ID) return []

  const userId = token.split('.')[0]
  if (!userId) return []

  const shopsRes = await fetch(`https://api.etsy.com/v3/application/users/${userId}/shops`, {
    headers: {
      'x-api-key': ETSY_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    },
  })
  if (!shopsRes.ok) {
    console.error('[etsy-adapter] shops failed:', shopsRes.status, await shopsRes.text())
    return []
  }

  const shopsData = (await shopsRes.json()) as { results?: Array<{ shop_id: number }> }
  const shopId = shopsData.results?.[0]?.shop_id
  if (shopId == null) return []

  const results: ExternalSyncedListing[] = []
  let offset = 0
  const limit = 25

  while (true) {
    const listRes = await fetch(
      `https://api.etsy.com/v3/application/shops/${shopId}/listings/active?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'x-api-key': ETSY_CLIENT_ID,
          Authorization: `Bearer ${token}`,
        },
      }
    )
    if (!listRes.ok) {
      console.error('[etsy-adapter] listings failed:', listRes.status, await listRes.text())
      break
    }

    const listData = (await listRes.json()) as {
      count?: number
      results?: Array<{
        listing_id: number
        title?: string
        description?: string
        price?: { amount?: number; divisor?: number; currency_code?: string }
        images?: Array<{ url_75x75?: string; url_170x135?: string; url_fullxfull?: string } }
        state?: string
      }>
    }
    const items = listData.results ?? []
    if (items.length === 0) break

    for (const item of items) {
      const listingId = String(item.listing_id)
      const priceValue = item.price?.amount != null && item.price?.divisor
        ? item.price.amount / item.price.divisor
        : undefined
      const currency = item.price?.currency_code ?? 'USD'
      const images = (item.images ?? [])
        .map((img) => img.url_fullxfull ?? img.url_170x135 ?? img.url_75x75)
        .filter(Boolean) as string[]

      results.push({
        external_listing_id: listingId,
        external_url: `https://www.etsy.com/listing/${listingId}`,
        title: (item.title ?? 'Untitled').slice(0, 500),
        description: item.description?.slice(0, 5000) ?? null,
        price_json: {
          value: priceValue,
          currency,
          formatted: priceValue != null ? `${currency} ${priceValue.toFixed(2)}` : undefined,
        },
        images,
        category: null,
        status: item.state ?? 'active',
      })
    }

    offset += items.length
    if (items.length < limit) break
    if (listData.count != null && offset >= listData.count) break
  }

  return results
}
