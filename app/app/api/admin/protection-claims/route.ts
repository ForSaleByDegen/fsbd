/**
 * Admin-only: list and manage protection claims
 * GET: list all claims (optional ?status=pending)
 * PATCH: update claim status (approve/reject). Body: { wallet, claimId, status: 'approved'|'rejected', payoutTx?: string }
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
    const statusFilter = searchParams.get('status') || 'all'

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
    }

    const authErr = await verifyAdmin(wallet)
    if (authErr) return authErr

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    let query = supabaseAdmin
      .from('protection_claims')
      .select(`
        id,
        listing_id,
        buyer_wallet_hash,
        reason,
        description,
        evidence_url,
        status,
        reviewed_by,
        reviewed_at,
        payout_tx,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data: claims, error } = await query

    if (error) {
      console.error('[admin/protection-claims]', error)
      return NextResponse.json({ error: 'Failed to load claims' }, { status: 500 })
    }

    // Enrich with listing titles and protection fee amount
    const listingIds = Array.from(new Set((claims ?? []).map((c: { listing_id: string }) => c.listing_id)))
    const { data: listings } = listingIds.length > 0
      ? await supabaseAdmin.from('listings').select('id, title, price, price_token').in('id', listingIds)
      : { data: [] }
    const listingMap = Object.fromEntries(
      (listings ?? []).map((l: { id: string; title?: string; price?: number; price_token?: string }) => [l.id, l])
    )
    const { data: fees } = listingIds.length > 0
      ? await supabaseAdmin.from('protection_fees').select('listing_id, amount, token').in('listing_id', listingIds)
      : { data: [] }
    const feeMap = Object.fromEntries(
      (fees ?? []).map((f: { listing_id: string; amount: number; token: string }) => [f.listing_id, { amount: f.amount, token: f.token }])
    )

    const enriched = (claims ?? []).map((c: Record<string, unknown>) => {
      const listing = listingMap[c.listing_id as string]
      const fee = feeMap[c.listing_id as string]
      return {
        ...c,
        listing_title: listing?.title,
        listing_price: listing?.price,
        listing_price_token: listing?.price_token,
        protection_amount: fee?.amount,
        protection_token: fee?.token,
      }
    })

    return NextResponse.json({ claims: enriched })
  } catch (e) {
    console.error('[admin/protection-claims]', e)
    return NextResponse.json({ error: 'Failed to load claims' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    const claimId = typeof body.claimId === 'string' ? body.claimId.trim() : ''
    const status = body.status === 'approved' || body.status === 'rejected' ? body.status : null
    const payoutTx = typeof body.payoutTx === 'string' ? body.payoutTx.trim() : null

    if (!wallet || !claimId || !status) {
      return NextResponse.json(
        { error: 'wallet, claimId, and status (approved|rejected) required' },
        { status: 400 }
      )
    }

    const authErr = await verifyAdmin(wallet)
    if (authErr) return authErr

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('protection_claims')
      .select('id, status')
      .eq('id', claimId)
      .single()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Claim already reviewed' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      status,
      reviewed_by: wallet,
      reviewed_at: new Date().toISOString(),
    }
    if (status === 'approved' && payoutTx) {
      updates.payout_tx = payoutTx
    }

    const { error: updateErr } = await supabaseAdmin
      .from('protection_claims')
      .update(updates)
      .eq('id', claimId)

    if (updateErr) {
      console.error('[admin/protection-claims] PATCH', updateErr)
      return NextResponse.json({ error: 'Failed to update claim' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/protection-claims] PATCH', e)
    return NextResponse.json({ error: 'Failed to update claim' }, { status: 500 })
  }
}
