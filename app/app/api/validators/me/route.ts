/**
 * GET /api/validators/me?wallet=xxx
 * Returns the current user's validator registration (if any). Requires whitelist.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

async function isWhitelisted(wallet: string): Promise<boolean> {
  if (!supabaseAdmin) return false
  const { data } = await supabaseAdmin
    .from('platform_config')
    .select('value_json')
    .eq('key', 'ai_validators_whitelist')
    .maybeSingle()
  const raw = (data as { value_json?: unknown } | null)?.value_json
  const list = Array.isArray(raw) ? raw : []
  const addresses = list.filter((x: unknown): x is string => typeof x === 'string').map((s: string) => s.trim().toLowerCase())
  return addresses.includes(wallet.toLowerCase())
}

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ registered: false })
    }

    const whitelisted = await isWhitelisted(wallet)
    let isAdminWallet = false
    if (supabaseAdmin) {
      const wh = hashWalletAddress(wallet)
      const { data: adminRow } = await supabaseAdmin.from('admins').select('id').eq('wallet_address_hash', wh).eq('is_active', true).maybeSingle()
      isAdminWallet = !!adminRow
    }
    if (!whitelisted && !isAdminWallet) {
      return NextResponse.json({ registered: false })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ registered: false })
    }

    const walletHash = hashWalletAddress(wallet)
    const { data } = await supabaseAdmin
      .from('ai_validators')
      .select('endpoint_url, stake_amount, status, validator_type')
      .eq('wallet_address_hash', walletHash)
      .maybeSingle()

    if (!data) {
      return NextResponse.json({ registered: false })
    }

    const row = data as { endpoint_url: string | null; stake_amount: number; status: string; validator_type?: string }

    // Jobs completed by this validator (from validator_jobs)
    let jobs_completed = 0
    const { count } = await supabaseAdmin
      .from('validator_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('validator_wallet', wallet)
      .eq('status', 'completed')
    jobs_completed = count ?? 0

    // Total earned $FSBD (sum of ledger entries)
    let total_earned = 0
    const { data: ledgerRows } = await supabaseAdmin
      .from('validator_rewards_ledger')
      .select('amount')
      .eq('validator_wallet', wallet)
    if (ledgerRows && Array.isArray(ledgerRows)) {
      total_earned = ledgerRows.reduce((sum: number, r: { amount: number }) => sum + (Number(r.amount) || 0), 0)
    }

    return NextResponse.json({
      registered: row.status === 'active',
      endpoint_url: row.endpoint_url,
      stake_amount: row.stake_amount,
      status: row.status,
      validator_type: row.validator_type ?? 'endpoint',
      jobs_completed,
      total_earned,
    })
  } catch (e) {
    console.error('[validators/me]', e)
    return NextResponse.json({ registered: false })
  }
}
