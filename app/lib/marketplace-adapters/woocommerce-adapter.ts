/**
 * WooCommerce adapter: fetch products via REST API
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { decryptSellerToken } from '@/lib/seller-verification-encrypt'
import type { ExternalSyncedListing } from './types'

export async function fetchWooCommerceListings(
  _walletHash: string,
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<ExternalSyncedListing[]> {
  const base = storeUrl.replace(/\/$/, '')
  const url = `${base}/wp-json/wc/v3/products?per_page=25&status=publish`

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    console.error('[woocommerce-adapter] fetch failed:', res.status, await res.text())
    return []
  }

  const products = (await res.json()) as Array<{
    id: number
    name?: string
    description?: string
    price?: string
    permalink?: string
    images?: Array<{ src?: string }>
    categories?: Array<{ name?: string }>
  }>

  return products.map((p) => ({
    external_listing_id: String(p.id),
    external_url: p.permalink ?? null,
    title: (p.name ?? 'Untitled').slice(0, 500),
    description: p.description?.slice(0, 5000) ?? null,
    price_json: {
      value: p.price ? parseFloat(p.price) : undefined,
      currency: 'USD',
      formatted: p.price ? `USD ${p.price}` : undefined,
    },
    images: (p.images ?? []).map((img) => img.src).filter(Boolean) as string[],
    category: p.categories?.[0]?.name ?? null,
    status: 'active',
  }))
}

export async function fetchWooCommerceListingsForWallet(walletHash: string): Promise<ExternalSyncedListing[]> {
  if (!supabaseAdmin) return []

  const { data, error } = await supabaseAdmin
    .from('woocommerce_connections')
    .select('store_url, consumer_key_encrypted, consumer_secret_encrypted')
    .eq('wallet_address_hash', walletHash)
    .maybeSingle()

  if (error || !data) return []

  const storeUrl = (data as { store_url?: string }).store_url
  const keyEncrypted = (data as { consumer_key_encrypted?: string }).consumer_key_encrypted
  const secretEncrypted = (data as { consumer_secret_encrypted?: string }).consumer_secret_encrypted

  if (!storeUrl || !keyEncrypted || !secretEncrypted) return []

  let consumerKey: string
  let consumerSecret: string
  try {
    consumerKey = decryptSellerToken(keyEncrypted)
    consumerSecret = decryptSellerToken(secretEncrypted)
  } catch {
    return []
  }

  return fetchWooCommerceListings(walletHash, storeUrl, consumerKey, consumerSecret)
}
