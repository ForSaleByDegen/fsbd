/**
 * GET /api/validators/verification-jobs/claim?wallet=xxx
 * Validator claims the next pending verification job. Returns job + primary result for verification.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const wallet = request.nextUrl.searchParams.get('wallet')?.trim() ?? ''

  if (!wallet || !BASE58.test(wallet)) {
    return NextResponse.json({ error: 'Valid wallet required' }, { status: 400 })
  }

  try {
    const { data: validator } = await supabaseAdmin
      .from('ai_validators')
      .select('id')
      .eq('wallet_address', wallet)
      .eq('status', 'active')
      .maybeSingle()

    if (!validator) {
      return NextResponse.json({ claimed: false, job: null }, { status: 403 })
    }

    const { data: pending } = await supabaseAdmin
      .from('validator_verification_jobs')
      .select('id, job_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!pending) {
      return NextResponse.json({ claimed: false, job: null })
    }

    const vjId = (pending as { id: string }).id
    const jobId = (pending as { job_id: string }).job_id

    const { data: claimed, error } = await supabaseAdmin
      .from('validator_verification_jobs')
      .update({ status: 'claimed', verifier_wallet: wallet, claimed_at: new Date().toISOString() })
      .eq('id', vjId)
      .eq('status', 'pending')
      .select('id, job_id')
      .maybeSingle()

    if (error || !claimed) {
      return NextResponse.json({ claimed: false, job: null })
    }

    const { data: job } = await supabaseAdmin
      .from('validator_jobs')
      .select('id, image_base64, mime_type, prompt, result')
      .eq('id', jobId)
      .single()

    if (!job) {
      return NextResponse.json({ claimed: false, job: null })
    }

    const row = job as { id: string; image_base64: string; mime_type: string; prompt: string | null; result: string | null }
    return NextResponse.json({
      claimed: true,
      job: {
        verification_job_id: (claimed as { id: string }).id,
        job_id: row.id,
        primary_result: row.result ?? '',
        image_base64: row.image_base64,
        mime_type: row.mime_type,
        prompt: row.prompt ?? '',
      },
    })
  } catch (e) {
    console.error('[verification-jobs/claim]', e)
    return NextResponse.json({ claimed: false, job: null }, { status: 500 })
  }
}
