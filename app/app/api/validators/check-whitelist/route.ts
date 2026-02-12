/**
 * GET /api/validators/check-whitelist?wallet=xxx
 * Returns whether the wallet is whitelisted and the effective min_stake (if whitelisted with override).
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function normalizeWallet(s: string) {
  return s.trim().toLowerCase()
}

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    if (!wallet || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
      return NextResponse.json({ whitelisted: false })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ whitelisted: false })
    }

    const [{ data: whitelistData }, { data: minStakeData }] = await Promise.all([
      supabaseAdmin.from('platform_config').select('value_json').eq('key', 'ai_validators_whitelist').maybeSingle(),
      supabaseAdmin.from('platform_config').select('value_json').eq('key', 'ai_validators_whitelist_min_stake').maybeSingle(),
    ])

    const raw = (whitelistData as { value_json?: unknown } | null)?.value_json
    const list = Array.isArray(raw) ? raw : (typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch { return [] } })() : [])
    const addresses = list.filter((x: unknown): x is string => typeof x === 'string').map((s: string) => normalizeWallet(s))
    const whitelisted = addresses.includes(normalizeWallet(wallet))

    let min_stake: number | null = null
    if (whitelisted && minStakeData) {
      const msRaw = (minStakeData as { value_json?: unknown } | null)?.value_json
      if (typeof msRaw === 'object' && msRaw !== null && !Array.isArray(msRaw)) {
        const v = (msRaw as Record<string, unknown>)[normalizeWallet(wallet)]
        if (typeof v === 'number' && v >= 0 && Number.isFinite(v)) min_stake = Math.floor(v)
      }
    }

    return NextResponse.json({ whitelisted, min_stake: min_stake ?? undefined })
  } catch (e) {
    console.error('[validators/check-whitelist]', e)
    return NextResponse.json({ whitelisted: false })
  }
}
