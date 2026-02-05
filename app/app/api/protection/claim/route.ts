/**
 * POST /api/protection/claim
 * Submit a buyer protection claim. Buyer must have paid protection fee for this purchase.
 * Body: { wallet: string, listingId: string, reason: 'not_received'|'not_as_described'|'other', description?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const REASONS = ['not_received', 'not_as_described', 'other'] as const

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'general')
  if (rateLimited) return rateLimited

  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    const listingId = typeof body.listingId === 'string' ? body.listingId.trim() : ''
    const reason = REASONS.includes(body.reason) ? body.reason : null
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : ''

    if (!wallet || !listingId || !reason) {
      return NextResponse.json({ error: 'wallet, listingId, and reason required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
    }

    const buyerHash = hashWalletAddress(wallet)

    const { data: fee } = await supabaseAdmin
      .from('protection_fees')
      .select('id')
      .eq('listing_id', listingId)
      .eq('buyer_wallet_hash', buyerHash)
      .maybeSingle()

    if (!fee) {
      return NextResponse.json({ error: 'No protection fee found for this purchase. Claims are only for purchases with buyer protection.' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('protection_claims')
      .select('id')
      .eq('listing_id', listingId)
      .eq('buyer_wallet_hash', buyerHash)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You have already submitted a claim for this purchase.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('protection_claims').insert({
      listing_id: listingId,
      buyer_wallet_hash: buyerHash,
      reason,
      description: description || null,
      status: 'pending',
    })

    if (error) {
      console.error('[protection/claim]', error)
      return NextResponse.json({ error: 'Failed to submit claim' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'Claim submitted. An admin will review it.' })
  } catch (err) {
    console.error('[protection/claim]', err)
    return NextResponse.json({ error: 'Failed to submit claim' }, { status: 500 })
  }
}
