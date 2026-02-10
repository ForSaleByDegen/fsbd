/**
 * POST /api/validators/jobs/[id]/fail
 * Browser validator marks job as failed/timeout when it can't produce a valid result.
 * Only the validator who claimed it may fail it. Frees the job from stuck "claimed" state.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { id: jobId } = await params

  if (!jobId) {
    return NextResponse.json({ error: 'Job id required' }, { status: 400 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''

    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Valid wallet required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('validator_jobs')
      .update({ status: 'timeout' })
      .eq('id', jobId)
      .eq('status', 'claimed')
      .eq('validator_wallet', wallet)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[validators/jobs/fail]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Job not found, not claimed by you, or already completed' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[validators/jobs/fail]', e)
    return NextResponse.json({ error: 'Failed to fail job' }, { status: 500 })
  }
}
