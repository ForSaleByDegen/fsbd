/**
 * Public platform config - no auth required
 * Used by frontend for auction gate, tier display, etc.
 */
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(getDefaults())
    }

    const { data, error } = await supabase
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
      if (key === 'fsbd_token_mint' && typeof val === 'string') {
        config.fsbd_token_mint = val
      } else if (typeof val === 'number') {
        config[key] = val
      } else if (typeof val === 'string') {
        config[key] = parseInt(val, 10) || 0
      }
    }

    return NextResponse.json({
      auction_min_tokens: (config.auction_min_tokens as number) ?? 10000000,
      tier_bronze: (config.tier_bronze as number) ?? 100000,
      tier_silver: (config.tier_silver as number) ?? 1000000,
      tier_gold: (config.tier_gold as number) ?? 10000000,
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
