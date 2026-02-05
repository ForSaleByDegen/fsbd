/**
 * POST /api/listings/[id]/mark-sold
 * Marks a listing as sold after successful purchase.
 * Uses service role to bypass RLS (buyer can't update seller's listing via anon client).
 *
 * Body: { buyer: string, signature: string, sellerWalletHash: string, protectionFee?: number, token?: string }
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
    const buyer = typeof body.buyer === 'string' ? body.buyer.trim() : ''
    const signature = typeof body.signature === 'string' ? body.signature.trim() : ''
    const sellerWalletHash = typeof body.sellerWalletHash === 'string' ? body.sellerWalletHash.trim() : ''
    const protectionFee = typeof body.protectionFee === 'number' && body.protectionFee > 0 ? body.protectionFee : 0
    const protectionToken = typeof body.protectionToken === 'string' ? body.protectionToken : 'SOL'
    const protectionFee = typeof body.protectionFee === 'number' ? body.protectionFee : 0
    const token = typeof body.token === 'string' ? body.token : 'SOL'

    if (!buyer || !BASE58.test(buyer)) {
      return NextResponse.json({ error: 'Invalid buyer address' }, { status: 400 })
    }
    if (!signature || signature.length < 32) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
    if (!sellerWalletHash) {
      return NextResponse.json({ error: 'Missing sellerWalletHash' }, { status: 400 })
    }

    const buyerHash = hashWalletAddress(buyer)

    const { data: listing, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id, wallet_address_hash, status, quantity')
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

    if (listing.wallet_address_hash !== sellerWalletHash) {
      return NextResponse.json({ error: 'Seller hash mismatch' }, { status: 400 })
    }

    const qty = listing.quantity != null ? Number(listing.quantity) : 1
    const isLastOne = qty <= 1
    const newQty = Math.max(0, qty - 1)

    const updatePayload: Record<string, unknown> = isLastOne
      ? { status: 'sold', buyer_wallet_hash: buyerHash, quantity: 0 }
      : { quantity: newQty }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('listings')
      .update(updatePayload)
      .eq('id', id)
      .gte('quantity', 1)
      .select('id')
      .single()

    if (updateError || !updated) {
      if (!updateError && !updated) {
        return NextResponse.json(
          { error: 'Item already sold or quantity exhausted.' },
          { status: 409 }
        )
      }
      console.error('[mark-sold] Update error:', updateError)
      return NextResponse.json({ error: updateError?.message || 'Update failed' }, { status: 500 })
    }

    if (protectionFee > 0) {
      await supabaseAdmin.from('protection_fees').insert({
        listing_id: id,
        buyer_wallet_hash: buyerHash,
        amount: protectionFee,
        token,
        tx_signature: signature,
      })
    }

    if (protectionFee > 0) {
      await supabaseAdmin.from('protection_fees').insert({
        listing_id: id,
        buyer_wallet_hash: buyerHash,
        amount: protectionFee,
        token,
        tx_signature: signature,
      })
    }

    if (isLastOne) {
      const { data: sellerProfile } = await supabaseAdmin
        .from('profiles')
        .select('total_listings_sold')
        .eq('wallet_address_hash', sellerWalletHash)
        .single()

      if (sellerProfile) {
        await supabaseAdmin
          .from('profiles')
          .update({
            total_listings_sold: (sellerProfile.total_listings_sold || 0) + 1,
          })
          .eq('wallet_address_hash', sellerWalletHash)
      }

      if (protectionFee > 0) {
        await supabaseAdmin.from('protection_fees').insert({
          listing_id: id,
          buyer_wallet_hash: buyerHash,
          amount: protectionFee,
          token: protectionToken,
          tx_signature: signature,
        })
      }
    }

    return NextResponse.json({
      success: true,
      status: isLastOne ? 'sold' : 'active',
      quantityRemaining: isLastOne ? 0 : qty - 1,
    })
  } catch (err) {
    console.error('[mark-sold] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
