/**
 * POST /api/validators/jobs/release-stuck
 * Body: { wallet }
 * Releases all jobs stuck in "claimed" by this validator back to pending.
 * Helps when inference failed or validator crashed without calling /fail.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''

    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Valid wallet required' }, { status: 400 })
    }

    const { data: stuck } = await supabaseAdmin
      .from('validator_jobs')
      .select('id')
      .eq('status', 'claimed')
      .eq('validator_wallet', wallet)

    const ids = (stuck ?? []).map((r) => (r as { id: string }).id)
    if (ids.length === 0) {
      return NextResponse.json({ released: 0 })
    }

    const { error } = await supabaseAdmin
      .from('validator_jobs')
      .update({
        status: 'pending',
        validator_wallet: null,
        claimed_at: null,
      })
      .in('id', ids)
      .eq('status', 'claimed')
      .eq('validator_wallet', wallet)

    if (error) {
      console.error('[validators/jobs/release-stuck]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ released: ids.length })
  } catch (e) {
    console.error('[validators/jobs/release-stuck]', e)
    return NextResponse.json({ error: 'Failed to release stuck jobs' }, { status: 500 })
  }
}
