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
  const addresses = list.filter((x): x is string => typeof x === 'string').map((s) => s.trim().toLowerCase())
  return addresses.includes(wallet.toLowerCase())
}

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ registered: false })
    }

    const whitelisted = await isWhitelisted(wallet)
    if (!whitelisted) {
      return NextResponse.json({ registered: false })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ registered: false })
    }

    const walletHash = hashWalletAddress(wallet)
    const { data } = await supabaseAdmin
      .from('ai_validators')
      .select('endpoint_url, stake_amount, status')
      .eq('wallet_address_hash', walletHash)
      .maybeSingle()

    if (!data) {
      return NextResponse.json({ registered: false })
    }

    const row = data as { endpoint_url: string; stake_amount: number; status: string }
    return NextResponse.json({
      registered: row.status === 'active',
      endpoint_url: row.endpoint_url,
      stake_amount: row.stake_amount,
      status: row.status,
    })
  } catch (e) {
    console.error('[validators/me]', e)
    return NextResponse.json({ registered: false })
  }
}
