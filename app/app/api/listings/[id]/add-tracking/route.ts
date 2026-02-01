/**
 * POST /api/listings/[id]/add-tracking
 * Adds shipping/tracking info to a listing. Only the seller can update.
 * Uses service role to bypass RLS (anon client has no JWT wallet context).
 *
 * Body: { wallet: string, tracking_number: string, shipping_carrier?: string }
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
    const trackingNumber = typeof body.tracking_number === 'string' ? body.tracking_number.trim() : ''
    const shippingCarrier = typeof body.shipping_carrier === 'string' ? body.shipping_carrier.trim() : 'USPS'

    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }
    if (!trackingNumber || trackingNumber.length < 3) {
      return NextResponse.json({ error: 'Tracking number is required' }, { status: 400 })
    }

    const sellerHash = hashWalletAddress(wallet)

    const { data: listing, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id, wallet_address_hash')
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

    if (listing.wallet_address_hash !== sellerHash) {
      return NextResponse.json({ error: 'Only the seller can add tracking' }, { status: 403 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('listings')
      .update({
        tracking_number: trackingNumber,
        shipping_carrier: shippingCarrier || 'USPS',
        escrow_status: 'shipped',
        status: 'shipped',
        shipped_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('[add-tracking] Update error:', updateError)
      return NextResponse.json({ error: updateError.message || 'Failed to save tracking' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[add-tracking] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
