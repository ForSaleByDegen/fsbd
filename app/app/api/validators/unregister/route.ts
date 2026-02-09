/**
 * POST /api/validators/unregister
 * Unregister as an AI validator. Requires whitelist.
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''

    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const whitelisted = await isWhitelisted(wallet)
    if (!whitelisted) {
      return NextResponse.json({ error: 'Wallet not whitelisted for validator access' }, { status: 403 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const walletHash = hashWalletAddress(wallet)
    const { error } = await supabaseAdmin
      .from('ai_validators')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('wallet_address_hash', walletHash)

    if (error) {
      console.error('[validators/unregister]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'Unregistered' })
  } catch (e) {
    console.error('[validators/unregister]', e)
    return NextResponse.json({ error: 'Unregister failed' }, { status: 500 })
  }
}
