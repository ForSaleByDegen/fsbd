/**
 * Admin-only: approve escrow release (to seller) or refund (to buyer)
 * POST Body: { wallet: string, listingId: string, action: 'release' | 'refund' }
 * Release: escrow_status=completed -> status=sold (admin approved funds to seller)
 * Refund: escrow_status=disputed -> escrow_status=refunded (admin approved refund to buyer)
 * Note: Actual on-chain release/refund requires Anchor program deployment.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin, hasPermission } from '@/lib/admin'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

async function verifyAdmin(wallet: string) {
  const ok = await isAdmin(wallet)
  if (!ok) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  const canManage = await hasPermission(wallet, 'manage_listings')
  if (!canManage) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    const listingId = typeof body.listingId === 'string' ? body.listingId.trim() : ''
    const action = body.action === 'release' || body.action === 'refund' ? body.action : null

    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Valid admin wallet required' }, { status: 400 })
    }
    if (!listingId) {
      return NextResponse.json({ error: 'listingId required' }, { status: 400 })
    }
    if (!action) {
      return NextResponse.json({ error: 'action must be release or refund' }, { status: 400 })
    }

    const authErr = await verifyAdmin(wallet)
    if (authErr) return authErr

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: listing, error: fetchErr } = await supabaseAdmin
      .from('listings')
      .select('id, status, escrow_status, escrow_pda')
      .eq('id', listingId)
      .single()

    if (fetchErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const row = listing as { status: string; escrow_status: string; escrow_pda: string | null }

    if (action === 'release') {
      if (row.escrow_status !== 'completed' || row.status !== 'completed') {
        return NextResponse.json(
          { error: 'Release only allowed when buyer has confirmed receipt (escrow completed)' },
          { status: 400 }
        )
      }
      const { error: updateErr } = await supabaseAdmin
        .from('listings')
        .update({
          status: 'sold',
          updated_at: new Date().toISOString(),
        })
        .eq('id', listingId)

      if (updateErr) {
        console.error('[admin/escrow/approve] release', updateErr)
        return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'release',
        message: 'Admin approved release. Funds will be released to seller (requires Solana program for on-chain transfer).',
      })
    }

    // action === 'refund'
    if (row.escrow_status !== 'disputed' || row.status !== 'disputed') {
      return NextResponse.json(
        { error: 'Refund only allowed for disputed escrows' },
        { status: 400 }
      )
    }

    const { error: updateErr } = await supabaseAdmin
      .from('listings')
      .update({
        escrow_status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)

    if (updateErr) {
      console.error('[admin/escrow/approve] refund', updateErr)
      return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      action: 'refund',
      message: 'Admin approved refund. Funds will be returned to buyer (requires Solana program for on-chain transfer).',
    })
  } catch (err) {
    console.error('[admin/escrow/approve]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
