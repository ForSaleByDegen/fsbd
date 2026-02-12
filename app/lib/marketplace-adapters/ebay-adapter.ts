/**
 * eBay adapter: fetch seller's inventory items via Sell Inventory API
 */
import { getValidToken } from '@/lib/marketplace-tokens'
import type { ExternalSyncedListing } from './types'

const EBAY_SANDBOX = process.env.EBAY_SANDBOX === 'true'
const baseUrl = EBAY_SANDBOX ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com'

export async function fetchEbayListings(walletHash: string): Promise<ExternalSyncedListing[]> {
  const token = await getValidToken(walletHash, 'ebay')
  if (!token) return []

  const results: ExternalSyncedListing[] = []
  let offset = 0
  const limit = 25

  while (true) {
    const listRes = await fetch(
      `${baseUrl}/sell/inventory/v1/inventory_item?limit=${limit}&offset=${offset}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!listRes.ok) {
      console.error('[ebay-adapter] list failed:', listRes.status, await listRes.text())
      break
    }

    const listData = (await listRes.json()) as {
      inventoryItems?: Array<{ sku: string }>
      total?: number
    }
    const items = listData.inventoryItems ?? []
    if (items.length === 0) break

    for (const { sku } of items) {
      try {
        const itemRes = await fetch(`${baseUrl}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!itemRes.ok) continue

        const item = (await itemRes.json()) as {
          sku?: string
          product?: { title?: string; description?: string; imageUrls?: string[] }
          availability?: { shipToLocationAvailability?: { quantity?: number } }
        }
        const title = item.product?.title ?? 'Untitled'
        const description = item.product?.description ?? null
        const images = item.product?.imageUrls ?? []

        const offersRes = await fetch(
          `${baseUrl}/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}&limit=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        let priceValue: number | undefined
        let currency = 'USD'
        if (offersRes.ok) {
          const offersData = (await offersRes.json()) as {
            offers?: Array<{ offerId?: string; pricingSummary?: { price?: { value?: string; currency?: string } } }>
          }
          const offer = offersData.offers?.[0]
          if (offer?.pricingSummary?.price?.value) {
            priceValue = parseFloat(offer.pricingSummary.price.value)
            currency = offer.pricingSummary.price.currency ?? 'USD'
          }
        }

        const listingUrl = `https://www.ebay.com/itm/${sku}`

        results.push({
          external_listing_id: sku,
          external_url: listingUrl,
          title: title.slice(0, 500),
          description: description?.slice(0, 5000) ?? null,
          price_json: {
            value: priceValue,
            currency,
            formatted: priceValue != null ? `${currency} ${priceValue.toFixed(2)}` : undefined,
          },
          images,
          category: null,
          status: 'active',
        })
      } catch (e) {
        console.error('[ebay-adapter] item fetch error:', sku, e)
      }
    }

    offset += items.length
    if (items.length < limit) break
    if (offset >= (listData.total ?? 0)) break
  }

  return results
}
