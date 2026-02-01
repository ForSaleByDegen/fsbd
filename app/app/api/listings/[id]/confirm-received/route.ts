/**
 * POST /api/listings/[id]/confirm-received
 * Buyer confirms they received the item. Honor system tracking.
 * Uses service role to bypass RLS.
 *
 * Body: { wallet: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export async function POST(
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

    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const buyerHash = hashWalletAddress(wallet)

    const { data: listing, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id, buyer_wallet_hash, wallet_address_hash, buyer_confirmed_received_at')
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

    if (listing.buyer_wallet_hash !== buyerHash) {
      return NextResponse.json({ error: 'Only the buyer can confirm receipt' }, { status: 403 })
    }

    if (listing.buyer_confirmed_received_at) {
      return NextResponse.json({
        success: true,
        alreadyConfirmed: true,
        message: 'Receipt already confirmed',
      })
    }

    const { error: updateError } = await supabaseAdmin
      .from('listings')
      .update({ buyer_confirmed_received_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      console.error('[confirm-received] Update error:', updateError)
      return NextResponse.json({ error: updateError.message || 'Failed to confirm' }, { status: 500 })
    }

    // Increment seller's total_confirmed_received (honor system) - optional if migration not run
    const sellerHash = (listing as { wallet_address_hash?: string }).wallet_address_hash
    if (sellerHash) {
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('total_confirmed_received')
          .eq('wallet_address_hash', sellerHash)
          .single()

        if (profile && 'total_confirmed_received' in profile) {
          const current = Number(profile.total_confirmed_received) || 0
          await supabaseAdmin
            .from('profiles')
            .update({ total_confirmed_received: current + 1 })
            .eq('wallet_address_hash', sellerHash)
        }
      } catch {
        // Column may not exist if migration not run
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[confirm-received] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
