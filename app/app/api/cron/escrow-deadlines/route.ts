/**
 * Cron: Check escrow 7-day seller deadline
 * Vercel Cron: add to vercel.json crons, set CRON_SECRET
 * Can also be called manually with Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const SELLER_TRACKING_DAYS = 7

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
  const secret = process.env.CRON_SECRET
  return !!secret && !!token && token === secret
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - SELLER_TRACKING_DAYS)
  const cutoffIso = cutoff.toISOString()

  // Listings: in_escrow, pending tracking, deposited more than 7 days ago
  const { data: overdueListings, error: listErr } = await supabaseAdmin
    .from('listings')
    .select('id, wallet_address_hash, title')
    .eq('status', 'in_escrow')
    .eq('escrow_status', 'pending')
    .not('escrow_deposited_at', 'is', null)
    .lt('escrow_deposited_at', cutoffIso)

  if (listErr) {
    console.error('[cron/escrow-deadlines]', listErr)
    return NextResponse.json({ error: 'Database error', detail: listErr.message }, { status: 500 })
  }

  const updated: string[] = []
  const banned: string[] = []

  for (const row of overdueListings ?? []) {
    const { id, wallet_address_hash } = row as { id: string; wallet_address_hash: string }

    await supabaseAdmin
      .from('listings')
      .update({
        escrow_status: 'disputed',
        status: 'disputed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    updated.push(id)

    if (wallet_address_hash) {
      const { error: banErr } = await supabaseAdmin
        .from('profiles')
        .update({
          banned_at: new Date().toISOString(),
          banned_reason: 'Failed to add tracking within 7 days of escrow deposit',
          updated_at: new Date().toISOString(),
        })
        .eq('wallet_address_hash', wallet_address_hash)
        .is('banned_at', null)

      if (!banErr) banned.push(wallet_address_hash)
    }
  }

  return NextResponse.json({
    success: true,
    overdueCount: overdueListings?.length ?? 0,
    listingsUpdated: updated,
    sellersBanned: banned,
  })
}
