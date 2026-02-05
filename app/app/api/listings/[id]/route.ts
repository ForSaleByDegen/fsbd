import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'
import { maskWallet } from '@/lib/sanitize-log'

/**
 * GET /api/listings/[id]
 * Fetch a single listing by ID.
 * Uses service role to ensure wallet_address is returned correctly (RLS may hide it for anon).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing listing ID' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      console.error('Listing fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Validate wallet_address - must be base58 Solana address, not URL/hash
    const wa = data?.wallet_address
    if (wa && (/^https?:\/\//i.test(wa) || wa.includes('://') || wa.length > 50 || /[0OIl]/.test(wa))) {
      console.error('[Listings API] Invalid wallet_address for listing', id, ':', typeof wa, maskWallet(wa))
    }

    // Check if seller has verified their profile (seller_verifications table)
    let sellerVerified = false
    const walletHash = data?.wallet_address_hash
    if (walletHash) {
      try {
        const { data: verifications, error: verErr } = await supabaseAdmin
          .from('seller_verifications')
          .select('id')
          .eq('wallet_address_hash', walletHash)
          .limit(1)
        if (!verErr && verifications && verifications.length > 0) sellerVerified = true
      } catch {
        // Table may not exist yet; ignore
      }
    }

    return NextResponse.json({ ...data, seller_verified: sellerVerified })
  } catch (err) {
    console.error('Listing API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/listings/[id]
 * Unlist (soft delete) or relist a listing. Owner only.
 * Body: { wallet: string, action: 'unlist' | 'relist' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing listing ID' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    const action = body.action
    const tokenMint = typeof body.token_mint === 'string' ? body.token_mint.trim() : null
    const tokenName = typeof body.token_name === 'string' ? body.token_name.trim() || null : null
    const tokenSymbol = typeof body.token_symbol === 'string' ? body.token_symbol.trim() || null : null
    const chatTokenGated = body.chat_token_gated
    const chatMinTokens = typeof body.chat_min_tokens === 'number' ? Math.max(1, Math.floor(body.chat_min_tokens)) : body.chat_min_tokens === undefined ? undefined : Math.max(1, Math.floor(Number(body.chat_min_tokens) || 1))
    const priceToken = typeof body.price_token === 'string' ? body.price_token.trim() : null

    if (!wallet) {
      return NextResponse.json(
        { error: 'Invalid request. Provide wallet.' },
        { status: 400 }
      )
    }
    if (!action && !tokenMint && chatTokenGated === undefined && chatMinTokens === undefined && !priceToken) {
      return NextResponse.json(
        { error: 'Invalid request. Provide action ("unlist"|"relist"), token_mint, chat_token_gated, or price_token.' },
        { status: 400 }
      )
    }

    const walletHash = hashWalletAddress(wallet)

    const { data: listing, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id, wallet_address_hash, status')
      .eq('id', id)
      .single()

    if (fetchError || !listing) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      return NextResponse.json(
        { error: fetchError?.message || 'Listing not found' },
        { status: 500 }
      )
    }

    if (listing.wallet_address_hash !== walletHash) {
      return NextResponse.json({ error: 'You can only unlist/relist your own listings.' }, { status: 403 })
    }

    // Build update object for token_mint, token_name, token_symbol, chat_token_gated, price_token
    const updates: Record<string, unknown> = {}
    if (tokenMint && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenMint)) {
      updates.token_mint = tokenMint
      updates.has_token = true
      if (tokenName) updates.token_name = tokenName
      if (tokenSymbol) updates.token_symbol = tokenSymbol
    }
    if (typeof chatTokenGated === 'boolean') updates.chat_token_gated = chatTokenGated
    if (chatMinTokens !== undefined) updates.chat_min_tokens = chatMinTokens
    if (priceToken && ['SOL', 'USDC', 'LISTING_TOKEN'].includes(priceToken)) updates.price_token = priceToken

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('listings')
        .update(updates)
        .eq('id', id)
      if (updateError) {
        console.error('Listing update error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, ...updates })
    }

    if (action === 'unlist') {
      if (listing.status !== 'active') {
        return NextResponse.json(
          { error: `Cannot unlist: listing is ${listing.status}.` },
          { status: 400 }
        )
      }
      const { error: updateError } = await supabaseAdmin
        .from('listings')
        .update({ status: 'removed' })
        .eq('id', id)
      if (updateError) {
        console.error('Unlist error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, status: 'removed' })
    }

    // action === 'relist' — only removed (unlisted) items, never sold
    if (listing.status !== 'removed') {
      return NextResponse.json(
        { error: `Cannot relist: listing is ${listing.status}. Only unlisted items can be relisted.` },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('listings')
      .update({ status: 'active' })
      .eq('id', id)

    if (updateError) {
      console.error('Relist error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: 'active' })
  } catch (err) {
    console.error('Unlist API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
