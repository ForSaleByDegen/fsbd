/**
 * POST /api/marketplace/sync
 * Triggers sync of external listings from eBay, Etsy, WooCommerce for the given wallet
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'
import { fetchEbayListings } from '@/lib/marketplace-adapters/ebay-adapter'
import { fetchEtsyListings } from '@/lib/marketplace-adapters/etsy-adapter'
import { fetchWooCommerceListingsForWallet } from '@/lib/marketplace-adapters/woocommerce-adapter'
import { getValidToken } from '@/lib/marketplace-tokens'
import { verifyWalletSignature } from '@/lib/verify-wallet-signature'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'general')
  if (rateLimited) return rateLimited

  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''

    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Valid wallet required' }, { status: 400 })
    }
    const message = typeof body.message === 'string' ? body.message : ''
    const signature = typeof body.signature === 'string' ? body.signature : ''
    if (!message || !signature || !verifyWalletSignature(wallet, message, signature, 'sync_marketplace')) {
      return NextResponse.json(
        { error: 'Wallet signature required. Please sign the message to prove you own this wallet.' },
        { status: 401 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const walletHash = hashWalletAddress(wallet)
    const now = new Date().toISOString()
    let totalSynced = 0

    if (await getValidToken(walletHash, 'ebay')) {
      const items = await fetchEbayListings(walletHash)
      for (const item of items) {
        const { error } = await supabaseAdmin.from('external_synced_listings').upsert(
          {
            wallet_address_hash: walletHash,
            platform: 'ebay',
            external_listing_id: item.external_listing_id,
            external_url: item.external_url,
            title: item.title,
            description: item.description,
            price_json: item.price_json,
            images: item.images,
            category: item.category,
            status: item.status,
            last_synced_at: now,
          },
          { onConflict: 'wallet_address_hash,platform,external_listing_id' }
        )
        if (!error) totalSynced++
      }
    }

    if (await getValidToken(walletHash, 'etsy')) {
      const items = await fetchEtsyListings(walletHash)
      for (const item of items) {
        const { error } = await supabaseAdmin.from('external_synced_listings').upsert(
          {
            wallet_address_hash: walletHash,
            platform: 'etsy',
            external_listing_id: item.external_listing_id,
            external_url: item.external_url,
            title: item.title,
            description: item.description,
            price_json: item.price_json,
            images: item.images,
            category: item.category,
            status: item.status,
            last_synced_at: now,
          },
          { onConflict: 'wallet_address_hash,platform,external_listing_id' }
        )
        if (!error) totalSynced++
      }
    }

    const wooItems = await fetchWooCommerceListingsForWallet(walletHash)
    for (const item of wooItems) {
      const { error } = await supabaseAdmin.from('external_synced_listings').upsert(
        {
          wallet_address_hash: walletHash,
          platform: 'woocommerce',
          external_listing_id: item.external_listing_id,
          external_url: item.external_url,
          title: item.title,
          description: item.description,
          price_json: item.price_json,
          images: item.images,
          category: item.category,
          status: item.status,
          last_synced_at: now,
        },
        { onConflict: 'wallet_address_hash,platform,external_listing_id' }
      )
      if (!error) totalSynced++
    }

    return NextResponse.json({ ok: true, synced: totalSynced })
  } catch (e) {
    console.error('[marketplace/sync]', e)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
