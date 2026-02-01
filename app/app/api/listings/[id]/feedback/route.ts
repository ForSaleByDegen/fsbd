/**
 * POST /api/listings/[id]/feedback
 * Buyer leaves feedback (rating 1-5 + optional comment) for the seller.
 * Only after buyer has confirmed receipt. One feedback per listing per buyer.
 *
 * Body: { wallet: string, rating: number, comment?: string }
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
    const rating = typeof body.rating === 'number' ? body.rating : parseInt(String(body.rating), 10)
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 500) : ''

    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
    }

    const buyerHash = hashWalletAddress(wallet)

    const { data: listing, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id, buyer_wallet_hash, seller_wallet_hash, buyer_confirmed_received_at')
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
      return NextResponse.json({ error: 'Only the buyer can leave feedback' }, { status: 403 })
    }

    if (!listing.buyer_confirmed_received_at) {
      return NextResponse.json(
        { error: 'Confirm receipt before leaving feedback' },
        { status: 400 }
      )
    }

    const sellerHash = listing.wallet_address_hash
    if (!sellerHash) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 400 })
    }

    const { error: insertError } = await supabaseAdmin
      .from('seller_feedback')
      .insert({
        listing_id: id,
        seller_wallet_hash: sellerHash,
        buyer_wallet_hash: buyerHash,
        rating,
        comment: comment || null,
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You already left feedback for this purchase' }, { status: 409 })
      }
      console.error('[feedback] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message || 'Failed to save feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[feedback] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
