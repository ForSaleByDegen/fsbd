import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Solana base58 alphabet - excludes 0, O, I, l
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function resolveTokenMint(priceToken: string | null, tokenMint: string | null): { token: 'SOL' | 'USDC'; mint: string | null } {
  if (!priceToken || priceToken === 'SOL') return { token: 'SOL', mint: null }
  if (priceToken === 'USDC') {
    const net = process.env.NEXT_PUBLIC_SOLANA_NETWORK
    return {
      token: 'USDC',
      mint: net === 'mainnet-beta'
        ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
        : '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
    }
  }
  // LISTING_TOKEN = seller accepts their listing token as payment
  if (priceToken === 'LISTING_TOKEN' && tokenMint && BASE58.test(tokenMint)) {
    return { token: 'USDC', mint: tokenMint }
  }
  if (tokenMint && BASE58.test(tokenMint)) return { token: 'USDC', mint: tokenMint }
  return { token: 'SOL', mint: null }
}

/**
 * GET /api/listings/[id]/purchase-params
 * Returns server-validated transaction parameters.
 * Use this instead of raw listing data to avoid base58/corruption issues.
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
      .select('id, wallet_address, price, price_token, token_mint, status')
      .eq('id', id)
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error?.message || 'Listing not found' }, { status: 500 })
    }

    if (data.status !== 'active') {
      return NextResponse.json(
        { error: 'This listing is no longer available for purchase.' },
        { status: 400 }
      )
    }

    const wa = String(data.wallet_address ?? '').trim()
    if (!wa || !BASE58.test(wa)) {
      console.error('[purchase-params] Invalid wallet_address for listing', id, ':', typeof data.wallet_address, String(wa).slice(0, 50))
      return NextResponse.json(
        { error: 'This listing has invalid seller data. The seller needs to re-list the item.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }
    try {
      new PublicKey(wa)
    } catch (e) {
      console.error('[purchase-params] PublicKey validation failed for listing', id, ':', String(wa).slice(0, 50), e)
      return NextResponse.json(
        { error: 'This listing has invalid seller address. The seller needs to re-list the item.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const price = Number(data.price)
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: 'Invalid listing price.' }, { status: 400 })
    }

    const { token, mint } = resolveTokenMint(
      data.price_token,
      data.token_mint
    )

    return NextResponse.json({
      recipient: wa,
      amount: price,
      token,
      mint: mint || undefined,
      listingId: data.id
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[purchase-params] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
