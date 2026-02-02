/**
 * POST public chat message (plain, non-token-gated).
 * Uses service role to bypass RLS for reliable inserts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    if (!listingId) {
      return NextResponse.json({ error: 'listing id required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    const content = typeof body.content === 'string' ? body.content.trim().slice(0, 2000) : ''

    if (!wallet) {
      return NextResponse.json({ error: 'wallet required' }, { status: 400 })
    }
    if (!content) {
      return NextResponse.json({ error: 'content required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const senderWalletHash = hashWalletAddress(wallet)

    const { error } = await supabaseAdmin.from('listing_public_messages').insert({
      listing_id: listingId,
      sender_wallet_hash: senderWalletHash,
      content,
    })

    if (error) {
      console.error('Public chat insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Public chat message error:', e)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
