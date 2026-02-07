import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { maskWallet } from '@/lib/sanitize-log'

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

const ESCROW_INSURANCE_PERCENT = 0.05 // 5% insurance fee for escrow

/**
 * GET /api/listings/[id]/purchase-params
 * Returns server-validated transaction parameters.
 * Use this instead of raw listing data to avoid base58/corruption issues.
 * Query: ?escrow=1 for escrow flow. ?insurance=1 adds 5% buyer protection fee (only when escrow=1).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const forEscrow = searchParams.get('escrow') === '1'
    const insuranceOptIn = searchParams.get('insurance') !== '0' // default true when escrow
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
      .select('id, wallet_address, wallet_address_hash, price, price_token, token_mint, status, external_listing_url')
      .eq('id', id)
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error?.message || 'Listing not found' }, { status: 500 })
    }

    const externalUrl = typeof data.external_listing_url === 'string' ? data.external_listing_url.trim() : ''
    if (externalUrl) {
      let sellerVerified = false
      const walletHash = data.wallet_address_hash
      if (walletHash) {
        try {
          const { data: verifications } = await supabaseAdmin
            .from('seller_verifications')
            .select('id')
            .eq('wallet_address_hash', walletHash)
            .limit(1)
          sellerVerified = !!(verifications && verifications.length > 0)
        } catch { /* ignore */ }
      }
      if (!sellerVerified) {
        return NextResponse.json(
          { error: 'This listing must be purchased on the original site. The seller has not verified ownership.' },
          { status: 400 }
        )
      }
    }

    if (data.status !== 'active') {
      return NextResponse.json(
        { error: 'This listing is no longer available for purchase.' },
        { status: 400 }
      )
    }

    const wa = String(data.wallet_address ?? '').trim()
    if (!wa || !BASE58.test(wa)) {
      console.error('[purchase-params] Invalid wallet_address for listing', id, ':', maskWallet(wa))
      return NextResponse.json(
        { error: 'This listing has invalid seller data. The seller needs to re-list the item.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }
    try {
      new PublicKey(wa)
    } catch (e) {
      console.error('[purchase-params] PublicKey validation failed for listing', id, maskWallet(wa), e)
      return NextResponse.json(
        { error: 'This listing has invalid seller address. The seller needs to re-list the item.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const price = Number(data.price)
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: 'Invalid listing price.' }, { status: 400 })
    }

    const amount = forEscrow && insuranceOptIn ? price * (1 + ESCROW_INSURANCE_PERCENT) : price

    const { token, mint } = resolveTokenMint(
      data.price_token,
      data.token_mint
    )

    return NextResponse.json({
      recipient: wa,
      amount,
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
