/**
 * GET /api/token-stats?mints=addr1,addr2
 * Fetches 24h price change and recent buy count from DexScreener (free, no API key).
 * Returns { [mint]: { priceChange24h, recentBuys5m } }
 */
import { NextRequest, NextResponse } from 'next/server'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export async function GET(request: NextRequest) {
  try {
    const mintsParam = request.nextUrl.searchParams.get('mints')
    if (!mintsParam?.trim()) {
      return NextResponse.json({})
    }
    const mints = mintsParam
      .split(',')
      .map((s) => s.trim())
      .filter((s) => BASE58.test(s))
      .slice(0, 30) // DexScreener limit

    if (mints.length === 0) {
      return NextResponse.json({})
    }

    const result: Record<
      string,
      { priceChange24h: number | null; recentBuys5m: number }
    > = {}

    await Promise.all(
      mints.map(async (mint) => {
        try {
          const res = await fetch(
            `https://api.dexscreener.com/token-pairs/v1/solana/${mint}`,
            { next: { revalidate: 60 } }
          )
          if (!res.ok) return
          const pairs = (await res.json()) as Array<{
            baseToken?: { address?: string }
            priceChange?: { h24?: number }
            txns?: { m5?: { buys?: number } }
          }>
          if (!Array.isArray(pairs) || pairs.length === 0) return

          // Prefer pair where our token is baseToken (pump.fun style TOKEN/SOL)
          const pair =
            pairs.find(
              (p) =>
                p.baseToken?.address === mint ||
                p.baseToken?.address?.toLowerCase() === mint.toLowerCase()
            ) ??
            pairs.find(
              (p) =>
                (p as { quoteToken?: { address?: string } }).quoteToken?.address === mint
            ) ??
            pairs[0]

          const priceChange24h =
            typeof pair.priceChange?.h24 === 'number' ? pair.priceChange.h24 : null
          const recentBuys5m = pair.txns?.m5?.buys ?? 0

          result[mint] = { priceChange24h, recentBuys5m }
        } catch {
          // Skip failed fetches
        }
      })
    )

    return NextResponse.json(result)
  } catch (e) {
    console.error('[token-stats]', e)
    return NextResponse.json({}, { status: 500 })
  }
}
