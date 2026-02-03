import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

/**
 * GET /api/profile?wallet=xxx
 * Returns profile stats, listings, escrows, and bids for a wallet.
 * Uses service role to bypass RLS (wallet-only auth has no JWT).
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')
    if (!wallet || typeof wallet !== 'string') {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      )
    }

    const walletHash = hashWalletAddress(wallet)

    // Fetch profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('wallet_address_hash', walletHash)
      .maybeSingle()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Create profile if missing
    let profileData = profile
    if (!profileData) {
      const { data: created, error: createError } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            wallet_address_hash: walletHash,
            wallet_address: wallet,
            email: 'wallet@fsbd.local',
            tier: 'free',
            listings_count: 0,
            total_fees_paid: 0,
            total_listings_sold: 0,
          },
          { onConflict: 'wallet_address_hash' }
        )
        .select()
        .single()

      if (createError) {
        console.error('Profile create error:', createError)
        profileData = null
      } else {
        profileData = created
      }
    }

    // Fetch user's listings (as seller) - include tracking for sold listings
    const { data: listings = [] } = await supabaseAdmin
      .from('listings')
      .select('id, title, price, price_token, token_symbol, status, escrow_status, images, category, created_at, tracking_number, shipping_carrier, buyer_wallet_hash')
      .eq('wallet_address_hash', walletHash)
      .order('created_at', { ascending: false })

    // Fetch escrow threads (buyer or seller) - table may not exist if migration_chat not run
    let escrows: Array<{ id: string; listing_id: string; escrow_status: string; listing_title?: string; listing_price?: number; listing_price_token?: string; listing_token_symbol?: string | null }> = []
    const { data: escrowsRaw = [], error: escrowsErr } = await supabaseAdmin
      .from('chat_threads')
      .select('id, listing_id, escrow_agreed, escrow_status, seller_wallet_hash, buyer_wallet_hash, updated_at')
      .or(`seller_wallet_hash.eq.${walletHash},buyer_wallet_hash.eq.${walletHash}`)
      .eq('escrow_agreed', true)
      .order('updated_at', { ascending: false })

    if (!escrowsErr && escrowsRaw?.length) {
      const listingIds = Array.from(new Set((escrowsRaw as { listing_id: string }[]).map((e) => e.listing_id).filter(Boolean)))
      let listingMap: Record<string, { title: string; price: number; price_token: string; token_symbol?: string | null }> = {}
      if (listingIds.length > 0) {
        const { data: listingsForEscrows } = await supabaseAdmin
          .from('listings')
          .select('id, title, price, price_token, token_symbol')
          .in('id', listingIds)
        for (const l of listingsForEscrows || []) {
          listingMap[l.id] = { title: l.title, price: l.price, price_token: l.price_token, token_symbol: l.token_symbol }
        }
      }
      escrows = (escrowsRaw as { id: string; listing_id: string; escrow_status: string }[]).map((e) => ({
        id: e.id,
        listing_id: e.listing_id,
        escrow_status: e.escrow_status || 'pending',
        listing_title: listingMap[e.listing_id]?.title || 'Listing',
        listing_price: listingMap[e.listing_id]?.price,
        listing_price_token: listingMap[e.listing_id]?.price_token,
        listing_token_symbol: listingMap[e.listing_id]?.token_symbol,
      }))
    }

    // Fetch bids (auction listings where user is highest bidder - stored as raw wallet address)
    const { data: bids = [] } = await supabaseAdmin
      .from('listings')
      .select('id, title, price, highest_bid, highest_bidder, is_auction, status, images, category, created_at')
      .eq('is_auction', true)
      .eq('highest_bidder', wallet)
      .order('created_at', { ascending: false })

    // Also get listings where user is buyer (purchases) - include shipping/tracking and confirm status
    const { data: purchases = [] } = await supabaseAdmin
      .from('listings')
      .select('id, title, price, price_token, status, escrow_status, images, category, created_at, tracking_number, shipping_carrier, buyer_confirmed_received_at, wallet_address')
      .eq('buyer_wallet_hash', walletHash)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      profile: profileData,
      listings: listings || [],
      escrows: escrows || [],
      bids: bids || [],
      purchases: purchases || [],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Profile API error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PATCH /api/profile
 * Update optional profile fields (e.g. area_tag). Body: { wallet, area_tag? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      )
    }

    const walletHash = hashWalletAddress(wallet)

    const updates: Record<string, unknown> = {}
    if (typeof body.area_tag === 'string') {
      const tag = body.area_tag.trim().slice(0, 100)
      updates.area_tag = tag || null
    }
    const urlFields = ['banner_url', 'twitter_url', 'telegram_url', 'discord_url', 'website_url'] as const
    for (const key of urlFields) {
      if (typeof body[key] === 'string') {
        const v = body[key].trim().slice(0, 500)
        updates[key] = v || null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true })
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('wallet_address_hash', walletHash)

    if (error) {
      console.error('Profile PATCH error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Profile PATCH error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
