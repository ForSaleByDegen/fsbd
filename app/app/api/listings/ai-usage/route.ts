/**
 * GET /api/listings/ai-usage?wallet=xxx
 * Returns daily AI listing usage and optional ai_lookup_fee_fsbd.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const AI_LISTING_DAILY_MS = 24 * 60 * 60 * 1000
const DAILY_LIMIT = 1

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')
    let aiLookupFeeFsbd = 0
    if (supabaseAdmin) {
      const { data: cfg } = await supabaseAdmin.from('platform_config').select('value_json').eq('key', 'ai_lookup_fee_fsbd').maybeSingle()
      const v = (cfg as { value_json?: unknown } | null)?.value_json
      aiLookupFeeFsbd = typeof v === 'number' ? v : (typeof v === 'string' ? parseInt(v, 10) || 0 : 0)
    }
    if (!wallet || typeof wallet !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet.trim())) {
      return NextResponse.json(
        { usedToday: false, used: 0, limit: DAILY_LIMIT, resetsAt: null, totalAnalyses: 0, aiLookupFeeFsbd },
        { status: 200 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { usedToday: false, used: 0, limit: DAILY_LIMIT, resetsAt: null, totalAnalyses: 0, aiLookupFeeFsbd },
        { status: 200 }
      )
    }

    const walletHash = hashWalletAddress(wallet.trim())
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('last_ai_listing_at, ai_analyses_count')
      .eq('wallet_address_hash', walletHash)
      .maybeSingle()

    const row = profile as { last_ai_listing_at?: string | null; ai_analyses_count?: number } | null
    const lastAt = row?.last_ai_listing_at
    const totalAnalyses = typeof row?.ai_analyses_count === 'number' ? row.ai_analyses_count : 0

    if (!lastAt) {
      return NextResponse.json({
        usedToday: false,
        used: 0,
        limit: DAILY_LIMIT,
        resetsAt: null,
        totalAnalyses,
        aiLookupFeeFsbd,
      })
    }

    const lastMs = new Date(lastAt).getTime()
    const nowMs = Date.now()
    const usedToday = nowMs - lastMs < AI_LISTING_DAILY_MS
    const resetsAt = usedToday ? new Date(lastMs + AI_LISTING_DAILY_MS).toISOString() : null

    return NextResponse.json({
      usedToday,
      used: usedToday ? 1 : 0,
      limit: DAILY_LIMIT,
      resetsAt,
      totalAnalyses,
      aiLookupFeeFsbd,
    })
  } catch (e) {
    console.error('[ai-usage]', e)
    return NextResponse.json(
      { usedToday: false, used: 0, limit: DAILY_LIMIT, resetsAt: null, totalAnalyses: 0, aiLookupFeeFsbd: 0 },
      { status: 200 }
    )
  }
}
