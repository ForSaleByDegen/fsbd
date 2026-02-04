/**
 * Public platform config - no auth required
 * Used by frontend for auction gate, tier display, etc.
 */
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const client = supabaseAdmin || supabase
    if (!client) {
      return NextResponse.json(getDefaults())
    }

    const { data, error } = await client
      .from('platform_config')
      .select('key, value_json')

    if (error) {
      console.warn('Config fetch failed, using defaults:', error.message)
      return NextResponse.json(getDefaults())
    }

    const config: Record<string, number | string> = {}
    for (const row of data || []) {
      const key = (row as { key: string }).key
      const val = (row as { value_json: unknown }).value_json
      if (key === 'fsbd_token_mint') {
        const s = typeof val === 'string' ? val : (val && typeof val === 'object' && 'value' in val && typeof (val as { value: unknown }).value === 'string' ? (val as { value: string }).value : null)
        if (s && s !== 'FSBD_TOKEN_MINT_PLACEHOLDER') config.fsbd_token_mint = s
      } else if (typeof val === 'number') {
        config[key] = val
      } else if (typeof val === 'string') {
        config[key] = parseInt(val, 10) || 0
      }
    }

    return NextResponse.json({
      auction_min_tokens: (config.auction_min_tokens as number) ?? 10000000,
      tier_bronze: (config.tier_bronze as number) ?? 100000,
      tier_silver: (config.tier_silver as number) ?? 500000,
      tier_gold: (config.tier_gold as number) ?? 2000000,
      tier_platinum: (config.tier_platinum as number) ?? 10000000,
      fsbd_token_mint: (config.fsbd_token_mint as string) ?? process.env.NEXT_PUBLIC_FSBD_TOKEN_MINT ?? 'FSBD_TOKEN_MINT_PLACEHOLDER',
    })
  } catch (e) {
    console.error('Config error:', e)
    return NextResponse.json(getDefaults())
  }
}

function getDefaults() {
  return {
    auction_min_tokens: 10000000,
    tier_bronze: 100000,
    tier_silver: 1000000,
    tier_gold: 10000000,
    fsbd_token_mint: process.env.NEXT_PUBLIC_FSBD_TOKEN_MINT ?? 'FSBD_TOKEN_MINT_PLACEHOLDER',
  }
}
