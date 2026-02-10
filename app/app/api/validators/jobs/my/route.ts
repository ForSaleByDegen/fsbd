/**
 * GET /api/validators/jobs/my?wallet=xxx
 * Returns this validator's recent jobs with reward amount. Requires whitelist or admin.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

async function canAccess(wallet: string): Promise<boolean> {
  if (!supabaseAdmin) return false
  const { data: whitelist } = await supabaseAdmin.from('platform_config').select('value_json').eq('key', 'ai_validators_whitelist').maybeSingle()
  const list = Array.isArray((whitelist as { value_json?: unknown } | null)?.value_json) ? (whitelist as { value_json: string[] }).value_json : []
  if (list.map((s: string) => s.trim().toLowerCase()).includes(wallet.toLowerCase())) return true
  const wh = hashWalletAddress(wallet)
  const { data: admin } = await supabaseAdmin.from('admins').select('id').eq('wallet_address_hash', wh).eq('is_active', true).maybeSingle()
  return !!admin
}

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Valid wallet required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ jobs: [] })
    }

    if (!(await canAccess(wallet))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: jobs } = await supabaseAdmin
      .from('validator_jobs')
      .select('id, status, created_at, claimed_at, completed_at')
      .eq('validator_wallet', wallet)
      .order('created_at', { ascending: false })
      .limit(30)

    const ids = (jobs ?? []).map((j) => (j as { id: string }).id)
    let ledgerMap: Record<string, number> = {}
    if (ids.length > 0) {
      const { data: ledger } = await supabaseAdmin
        .from('validator_rewards_ledger')
        .select('job_id, amount')
        .in('job_id', ids)
        .eq('validator_wallet', wallet)
      if (ledger) {
        ledgerMap = (ledger as { job_id: string; amount: number }[]).reduce(
          (acc, r) => {
            acc[r.job_id] = Number(r.amount) || 0
            return acc
          },
          {} as Record<string, number>
        )
      }
    }

    const result = (jobs ?? []).map((j) => {
      const row = j as { id: string; status: string; created_at: string; claimed_at: string | null; completed_at: string | null }
      return {
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        claimed_at: row.claimed_at,
        completed_at: row.completed_at,
        reward: ledgerMap[row.id] ?? 0,
      }
    })

    return NextResponse.json({ jobs: result })
  } catch (e) {
    console.error('[validators/jobs/my]', e)
    return NextResponse.json({ jobs: [] })
  }
}
