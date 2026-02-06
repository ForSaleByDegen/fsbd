/**
 * POST /api/listings/[id]/prepare-escrow-deposit
 *
 * Returns params for building escrow deposit tx. Optionally includes insurance (5% to multisig).
 * Body: { buyer: string, insuranceOptIn?: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const INSURANCE_RATE = 0.05

function resolveTokenMint(
  priceToken: string | null,
  tokenMint: string | null
): { token: 'SOL' | 'USDC'; mint: string | null } {
  if (!priceToken || priceToken === 'SOL') return { token: 'SOL', mint: null }
  if (priceToken === 'USDC') {
    const net = process.env.NEXT_PUBLIC_SOLANA_NETWORK
    return {
      token: 'USDC',
      mint:
        net === 'mainnet-beta'
          ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
          : '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    }
  }
  if (priceToken === 'LISTING_TOKEN' && tokenMint && BASE58.test(tokenMint)) {
    return { token: 'USDC', mint: tokenMint }
  }
  if (tokenMint && BASE58.test(tokenMint)) return { token: 'USDC', mint: tokenMint }
  return { token: 'SOL', mint: null }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing listing ID' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const buyer = typeof body.buyer === 'string' ? body.buyer.trim() : ''
    const insuranceOptIn = body.insuranceOptIn === true

    if (!buyer || !BASE58.test(buyer)) {
      return NextResponse.json({ error: 'Invalid buyer address' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 503 }
      )
    }

    const { data: listing, error: listingErr } = await supabaseAdmin
      .from('listings')
      .select('id, wallet_address, price, price_token, token_mint, status')
      .eq('id', id)
      .single()

    if (listingErr || !listing) {
      if (listingErr?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Listing not found' }, { status: 500 })
    }

    if (listing.status !== 'active') {
      return NextResponse.json(
        { error: 'This listing is no longer available for purchase.' },
        { status: 400 }
      )
    }

    const seller = String(listing.wallet_address ?? '').trim()
    if (!seller || !BASE58.test(seller)) {
      return NextResponse.json(
        { error: 'Invalid seller address' },
        { status: 400 }
      )
    }

    const price = Number(listing.price)
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: 'Invalid listing price' }, { status: 400 })
    }

    const { token, mint } = resolveTokenMint(listing.price_token, listing.token_mint)

    // Load config for insurance
    let coverageCapUsd = 100
    let solUsdRate = 200
    const { data: configRows } = await supabaseAdmin
      .from('platform_config')
      .select('key, value_json')
      .in('key', ['protection_coverage_cap_usd', 'sol_usd_rate'])
    for (const row of configRows ?? []) {
      const r = row as { key: string; value_json: unknown }
      const val = r.value_json
      const num = typeof val === 'number' ? val : parseFloat(String(val))
      if (!isNaN(num)) {
        if (r.key === 'protection_coverage_cap_usd') coverageCapUsd = num
        if (r.key === 'sol_usd_rate') solUsdRate = num
      }
    }

    const insuranceFee = insuranceOptIn ? price * INSURANCE_RATE : 0
    const saleAmount = price
    const totalAmount = saleAmount + insuranceFee

    const insuranceWallet = insuranceOptIn
      ? process.env.PROTECTION_POOL_WALLET?.trim()
      : null

    return NextResponse.json(
      {
        seller,
        saleAmount,
        insuranceFee,
        totalAmount,
        insuranceOptIn,
        insuranceWallet: insuranceWallet && BASE58.test(insuranceWallet) ? insuranceWallet : null,
        coverageCapUsd,
        solUsdRate,
        token,
        mint: mint || undefined,
        listingId: listing.id,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[prepare-escrow-deposit]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
