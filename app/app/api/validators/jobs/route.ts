/**
 * POST /api/validators/jobs
 * Creates a pending validator job. Internal use by find-comps-from-image.
 * Body: { image_base64, mime_type, prompt? }
 * Returns: { job_id }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { LISTING_ANALYSIS_PROMPT } from '@/lib/validator-prompt'

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const imageBase64 = typeof body.image_base64 === 'string' ? body.image_base64.trim() : ''
    const mimeType = typeof body.mime_type === 'string' ? body.mime_type.trim() || 'image/jpeg' : 'image/jpeg'
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : LISTING_ANALYSIS_PROMPT

    if (!imageBase64 || imageBase64.length < 100) {
      return NextResponse.json({ error: 'Valid image_base64 required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('validator_jobs')
      .insert({
        image_base64: imageBase64,
        mime_type: mimeType,
        prompt,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[validators/jobs]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ job_id: (data as { id: string }).id })
  } catch (e) {
    console.error('[validators/jobs]', e)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
