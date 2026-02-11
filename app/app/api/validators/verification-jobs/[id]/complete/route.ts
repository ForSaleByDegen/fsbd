/**
 * POST /api/validators/verification-jobs/[id]/complete
 * Verifier submits match/mismatch. Records verification reward when config.enabled.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { parseRewardsConfig, getVerifierReward } from '@/lib/validator-rewards'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { id: vjId } = await params

  if (!vjId) {
    return NextResponse.json({ error: 'Verification job id required' }, { status: 400 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    const match = body.match === true

    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Valid wallet required' }, { status: 400 })
    }

    const { data: vj, error: fetchErr } = await supabaseAdmin
      .from('validator_verification_jobs')
      .update({
        status: 'completed',
        result: match ? 'match' : 'mismatch',
        completed_at: new Date().toISOString(),
      })
      .eq('id', vjId)
      .eq('status', 'claimed')
      .eq('verifier_wallet', wallet)
      .select('id, job_id')
      .maybeSingle()

    if (fetchErr || !vj) {
      return NextResponse.json(
        { error: 'Verification job not found or not claimed by you' },
        { status: 404 }
      )
    }

    const jobId = (vj as { job_id: string }).job_id

    const { data: configRow } = await supabaseAdmin
      .from('platform_config')
      .select('value_json')
      .eq('key', 'validator_rewards_config')
      .maybeSingle()

    const config = parseRewardsConfig((configRow as { value_json?: unknown } | null)?.value_json)
    if (config.enabled) {
      const { count } = await supabaseAdmin
        .from('validator_verification_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId)
        .eq('status', 'completed')
      const verifierCount = count ?? 1
      const amount = getVerifierReward(config, verifierCount)
      if (amount > 0) {
        await supabaseAdmin.from('validator_rewards_ledger').insert({
          validator_wallet: wallet,
          job_id: jobId,
          amount,
          status: 'pending',
          reward_type: 'verification',
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[verification-jobs/complete]', e)
    return NextResponse.json({ error: 'Failed to complete verification' }, { status: 500 })
  }
}
