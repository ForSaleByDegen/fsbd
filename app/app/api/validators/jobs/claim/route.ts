/**
 * GET /api/validators/jobs/claim?wallet=xxx
 * Browser validator claims the next pending job. Atomic: only one validator gets each job.
 * Requires wallet to be registered as browser validator (active, validator_type=browser).
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get('wallet')?.trim() ?? ''

  if (!wallet || !BASE58.test(wallet)) {
    return NextResponse.json({ error: 'Valid wallet required' }, { status: 400 })
  }

  try {
    // Verify wallet is registered as browser validator
    const { data: validator } = await supabaseAdmin
      .from('ai_validators')
      .select('id')
      .eq('wallet_address', wallet)
      .eq('status', 'active')
      .eq('validator_type', 'browser')
      .maybeSingle()

    if (!validator) {
      return NextResponse.json({ error: 'Not registered as browser validator' }, { status: 403 })
    }

    // 1. Get oldest pending job id
    const { data: pending } = await supabaseAdmin
      .from('validator_jobs')
      .select('id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!pending) {
      return NextResponse.json({ claimed: false, job: null })
    }

    const jobId = (pending as { id: string }).id

    // 2. Atomic claim: only succeed if still pending
    const { data: claimed, error } = await supabaseAdmin
      .from('validator_jobs')
      .update({
        status: 'claimed',
        validator_wallet: wallet,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('status', 'pending')
      .select('id, image_base64, mime_type, prompt')
      .maybeSingle()

    if (error) {
      console.error('[validators/jobs/claim]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!claimed) {
      // Another validator claimed it first
      return NextResponse.json({ claimed: false, job: null })
    }

    const job = claimed as { id: string; image_base64: string; mime_type: string; prompt: string | null }
    return NextResponse.json({
      claimed: true,
      job: {
        id: job.id,
        image_base64: job.image_base64,
        mime_type: job.mime_type,
        prompt: job.prompt ?? '',
      },
    })
  } catch (e) {
    console.error('[validators/jobs/claim]', e)
    return NextResponse.json({ error: 'Failed to claim job' }, { status: 500 })
  }
}
