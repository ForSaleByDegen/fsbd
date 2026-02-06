/**
 * Admin-only: list escrow listings needing admin action
 * GET ?wallet=...&filter=release|refund|all
 * - release: escrow_status=completed (buyer confirmed, awaiting admin release)
 * - refund: escrow_status=disputed (awaiting admin refund decision)
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin, hasPermission } from '@/lib/admin'

async function verifyAdmin(wallet: string) {
  const ok = await isAdmin(wallet)
  if (!ok) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  const canManage = await hasPermission(wallet, 'view_analytics')
  if (!canManage) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')?.trim()
    const filter = searchParams.get('filter') || 'all'

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
    }

    const authErr = await verifyAdmin(wallet)
    if (authErr) return authErr

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    let query = supabaseAdmin
      .from('listings')
      .select('id, title, price, price_token, status, escrow_status, escrow_pda, escrow_amount, wallet_address, buyer_wallet_address, tracking_number, shipping_carrier, escrow_deposited_at, shipped_at, received_at, created_at')
      .not('escrow_pda', 'is', null)
      .order('created_at', { ascending: false })

    if (filter === 'release') {
      query = query.eq('escrow_status', 'completed').eq('status', 'completed')
    } else if (filter === 'refund') {
      query = query.eq('escrow_status', 'disputed').eq('status', 'disputed')
    } else {
      query = query.in('escrow_status', ['completed', 'disputed'])
    }

    const { data: escrows, error } = await query

    if (error) {
      console.error('[admin/escrow]', error)
      return NextResponse.json({ error: 'Failed to load escrows' }, { status: 500 })
    }

    return NextResponse.json({
      escrows: escrows ?? [],
      filter,
    })
  } catch (err) {
    console.error('[admin/escrow]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
