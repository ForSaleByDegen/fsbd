/**
 * POST /api/listings/[id]/prepare-token-rights-transfer
 *
 * Builds transfer-creator transaction for token rights listings:
 * - When listing (phase=list): transfer creator from seller to FSBD escrow
 * - When sold (phase=release): transfer creator from escrow to buyer
 *
 * Dependencies: PumpPortal/pump.fun must expose transferCreator or equivalent.
 * Until then, returns 501 with instructions. Uses pump-fee-shares for update_fee_shares
 * when full account derivation is available.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import CryptoJS from 'crypto-js'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function hashWalletAddress(address: string): string {
  return CryptoJS.SHA256(address).toString()
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
    const phase = typeof body.phase === 'string' ? body.phase : ''
    const signerWallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''

    if (!phase || !['list', 'release'].includes(phase)) {
      return NextResponse.json(
        { error: 'Invalid phase. Use "list" (seller → escrow) or "release" (escrow → buyer).' },
        { status: 400 }
      )
    }
    if (!signerWallet || !BASE58.test(signerWallet)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    if (supabaseAdmin) {
      const signerHash = hashWalletAddress(signerWallet)
      const { data: adminRow } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('wallet_address_hash', signerHash)
        .eq('is_active', true)
        .maybeSingle()
      if (!adminRow) {
        return NextResponse.json({ error: 'Admin only.' }, { status: 403 })
      }
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured.' }, { status: 503 })
    }

    const { data: listing, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id, wallet_address, wallet_address_hash, buyer_wallet_address, status, has_token, token_mint, listing_type')
      .eq('id', id)
      .single()

    if (fetchError || !listing) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchError?.message || 'Listing not found' }, { status: 500 })
    }

    const listingType = (listing as { listing_type?: string }).listing_type ?? 'item'
    if (listingType !== 'token_rights') {
      return NextResponse.json(
        { error: 'This endpoint is for token_rights listings only.' },
        { status: 400 }
      )
    }

    const tokenMint = String(listing.token_mint ?? '').trim()
    if (!tokenMint || !BASE58.test(tokenMint)) {
      return NextResponse.json(
        { error: 'Listing has no valid token_mint.' },
        { status: 400 }
      )
    }

    const sellerWallet = String(listing.wallet_address ?? '').trim()
    const sellerHash = hashWalletAddress(sellerWallet)
    const signerHash = hashWalletAddress(signerWallet)

    if (phase === 'list') {
      if (listing.status !== 'active') {
        return NextResponse.json(
          { error: 'Listing must be active to prepare list transfer.' },
          { status: 400 }
        )
      }
      if (listing.wallet_address_hash !== signerHash || signerWallet !== sellerWallet) {
        return NextResponse.json(
          { error: 'Only the seller can prepare the list transfer.' },
          { status: 403 }
        )
      }

      // Transfer creator from seller to escrow - requires PumpPortal transferCreator
      return NextResponse.json(
        {
          error: 'Transfer creator to escrow is not yet implemented.',
          hint: 'PumpPortal transferCreator action or pump.fun CPI is required. See plan token_fee_split_platform_revenue.',
          phase: 'list',
          tokenMint,
          from: signerWallet,
          to: 'escrow', // FSBD escrow wallet
        },
        { status: 501 }
      )
    }

    // phase === 'release'
    if (listing.status !== 'sold') {
      return NextResponse.json(
        { error: 'Listing must be sold to prepare release transfer.' },
        { status: 400 }
      )
    }

    const buyerWallet = String(listing.buyer_wallet_address ?? '').trim()
    if (!buyerWallet || !BASE58.test(buyerWallet)) {
      return NextResponse.json(
        { error: 'No buyer on file for this listing.' },
        { status: 400 }
      )
    }

    // Only platform/escrow holder can release; in production this would be gated
    // For now we return 501 - release would be triggered by platform after payment verification
    return NextResponse.json(
      {
        error: 'Transfer creator from escrow to buyer is not yet implemented.',
        hint: 'Requires FSBD escrow to sign transfer-creator to buyer. See plan token_fee_split_platform_revenue.',
        phase: 'release',
        tokenMint,
        from: 'escrow',
        to: buyerWallet,
      },
      { status: 501 }
    )
  } catch (err) {
    console.error('[prepare-token-rights-transfer] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
