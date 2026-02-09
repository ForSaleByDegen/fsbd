/**
 * GET /api/validators/check-whitelist?wallet=xxx
 * Returns whether the wallet is whitelisted for validator pool access.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    if (!wallet || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
      return NextResponse.json({ whitelisted: false })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ whitelisted: false })
    }

    const { data } = await supabaseAdmin
      .from('platform_config')
      .select('value_json')
      .eq('key', 'ai_validators_whitelist')
      .maybeSingle()

    const raw = (data as { value_json?: unknown } | null)?.value_json
    const list = Array.isArray(raw) ? raw : (typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch { return [] } })() : [])
    const addresses = list.filter((x: unknown): x is string => typeof x === 'string').map((s) => s.trim().toLowerCase())
    const whitelisted = addresses.includes(wallet.toLowerCase())

    return NextResponse.json({ whitelisted })
  } catch (e) {
    console.error('[validators/check-whitelist]', e)
    return NextResponse.json({ whitelisted: false })
  }
}
