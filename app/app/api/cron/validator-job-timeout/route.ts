/**
 * Cron: Mark claimed validator jobs as timeout if claimed > 5 min ago
 * Vercel Cron: add to vercel.json crons, set CRON_SECRET
 * Called with Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const CLAIMED_TIMEOUT_MINUTES = 5

export const dynamic = 'force-dynamic'
export const maxDuration = 30

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
  cutoff.setMinutes(cutoff.getMinutes() - CLAIMED_TIMEOUT_MINUTES)
  const cutoffIso = cutoff.toISOString()

  const { data: updated, error } = await supabaseAdmin
    .from('validator_jobs')
    .update({ status: 'timeout' })
    .eq('status', 'claimed')
    .lt('claimed_at', cutoffIso)
    .select('id')

  if (error) {
    console.error('[cron/validator-job-timeout]', error)
    return NextResponse.json({ error: 'Database error', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    timedOut: updated?.length ?? 0,
    ids: (updated ?? []).map((r) => (r as { id: string }).id),
  })
}
