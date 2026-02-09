/**
 * GET /api/listings/ai-usage?wallet=xxx
 * Returns daily AI listing usage for the wallet (1 per day per user).
 * Used by the UI to show "1/1 used" and when it resets.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const AI_LISTING_DAILY_MS = 24 * 60 * 60 * 1000
const DAILY_LIMIT = 1

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')
    if (!wallet || typeof wallet !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet.trim())) {
      return NextResponse.json(
        { usedToday: false, used: 0, limit: DAILY_LIMIT, resetsAt: null },
        { status: 200 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { usedToday: false, used: 0, limit: DAILY_LIMIT, resetsAt: null },
        { status: 200 }
      )
    }

    const walletHash = hashWalletAddress(wallet.trim())
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('last_ai_listing_at')
      .eq('wallet_address_hash', walletHash)
      .maybeSingle()

    const lastAt = (profile as { last_ai_listing_at?: string | null } | null)?.last_ai_listing_at
    if (!lastAt) {
      return NextResponse.json({
        usedToday: false,
        used: 0,
        limit: DAILY_LIMIT,
        resetsAt: null,
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
    })
  } catch (e) {
    console.error('[ai-usage]', e)
    return NextResponse.json(
      { usedToday: false, used: 0, limit: DAILY_LIMIT, resetsAt: null },
      { status: 200 }
    )
  }
}
