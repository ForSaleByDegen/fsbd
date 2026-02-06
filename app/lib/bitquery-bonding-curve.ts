/**
 * Bitquery - Pump.fun bonding curve progress %.
 * Requires BITQUERY_API_KEY. See: https://docs.bitquery.io/docs/examples/Solana/Pump-Fun-Marketcap-Bonding-Curve-API/
 */

const BITQUERY_ENDPOINT = process.env.BITQUERY_ENDPOINT || 'https://graphql.bitquery.io'

const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'

/**
 * Get bonding curve progress % for a pump.fun token (0–100).
 * Returns null if not on pump.fun, graduated, or API error.
 */
export async function getBondingCurveProgress(mintAddress: string): Promise<number | null> {
  const apiKey = process.env.BITQUERY_API_KEY
  if (!apiKey?.trim()) return null

  const query = `query GetBondingCurveProgress($mint: String!) {
  Solana {
    DEXPools(
      limit: { count: 1 }
      orderBy: { descending: Block_Slot }
      where: {
        Pool: {
          Market: {
            BaseCurrency: { MintAddress: { is: $mint } }
          }
          Dex: {
            ProgramAddress: { is: "${PUMP_FUN_PROGRAM}" }
          }
        }
      }
    ) {
      Bonding_Curve_Progress_percentage: calculate(
        expression: "100 - ((($Pool_Base_Balance - 206900000) * 100) / 793100000)"
      )
      Pool {
        Market {
          BaseCurrency { MintAddress }
        }
      }
    }
  }
}`

  try {
    const res = await fetch(BITQUERY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        variables: { mint: mintAddress },
      }),
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const json = await res.json()
    const pools = json?.data?.Solana?.DEXPools
    if (!Array.isArray(pools) || pools.length === 0) return null
    const val = pools[0]?.Bonding_Curve_Progress_percentage
    if (typeof val !== 'number') return null
    const pct = Math.round(val)
    if (pct < 0 || pct > 100) return null
    return pct
  } catch {
    return null
  }
}
