/**
 * POST /api/validators/jobs/[id]/complete
 * Browser validator submits result. Only the validator who claimed the job may complete it.
 * Body: { wallet, raw_content }
 * Records reward in validator_rewards_ledger when config.enabled.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { parseAndValidateValidatorResponse } from '@/lib/validator-response-validate'
import { parseRewardsConfig, getCurrentRewardPerJob } from '@/lib/validator-rewards'

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
    const rawContent = typeof body.raw_content === 'string' ? body.raw_content.trim() : ''

    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Valid wallet required' }, { status: 400 })
    }
    if (!rawContent || rawContent.length < 10) {
      return NextResponse.json({ error: 'raw_content required' }, { status: 400 })
    }

    // Validate response before accepting
    const validation = parseAndValidateValidatorResponse(rawContent)
    if (!validation.ok) {
      return NextResponse.json({ error: `Invalid response: ${validation.reason}` }, { status: 400 })
    }

    // Only the validator who claimed it may complete
    const { data, error } = await supabaseAdmin
      .from('validator_jobs')
      .update({
        status: 'completed',
        result: rawContent,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('status', 'claimed')
      .eq('validator_wallet', wallet)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[validators/jobs/complete]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Job not found, already completed, or not claimed by you' },
        { status: 404 }
      )
    }

    // Record reward if enabled
    const { data: configRow } = await supabaseAdmin
      .from('platform_config')
      .select('value_json')
      .eq('key', 'validator_rewards_config')
      .maybeSingle()
    const config = parseRewardsConfig((configRow as { value_json?: unknown } | null)?.value_json)
    const amount = getCurrentRewardPerJob(config)
    if (config.enabled && amount > 0) {
      const { error: ledgerErr } = await supabaseAdmin.from('validator_rewards_ledger').insert({
        validator_wallet: wallet,
        job_id: jobId,
        amount,
        status: 'pending',
      })
      if (ledgerErr) {
        console.error('[validators/jobs/complete] Ledger insert failed:', ledgerErr)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[validators/jobs/complete]', e)
    return NextResponse.json({ error: 'Failed to complete job' }, { status: 500 })
  }
}
