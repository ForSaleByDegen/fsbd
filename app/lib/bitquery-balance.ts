/**
 * Bitquery Balance API - fallback for token balance when RPC fails or returns 0.
 * Requires BITQUERY_API_KEY env var. See: https://docs.bitquery.io/
 */

const BITQUERY_ENDPOINT = process.env.BITQUERY_ENDPOINT || 'https://graphql.bitquery.io'

export async function getTokenBalanceViaBitquery(
  walletAddress: string,
  mintAddress: string
): Promise<number> {
  const apiKey = process.env.BITQUERY_API_KEY
  if (!apiKey?.trim()) return 0

  const query = `query GetTokenBalance($wallet: String!, $mint: String!) {
  Solana {
    BalanceUpdates(
      where: {
        BalanceUpdate: {
          Currency: { MintAddress: { is: $mint } }
          Account: { Owner: { is: $wallet } }
        }
      }
      orderBy: { descendingByField: "BalanceUpdate_Balance_maximum" }
      limit: { count: 1 }
    ) {
      BalanceUpdate {
        Balance: PostBalance(maximum: Block_Slot)
        Currency {
          MintAddress
          Decimals
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
        variables: { wallet: walletAddress, mint: mintAddress },
      }),
    })
    if (!res.ok) return 0
    const json = await res.json()
    const items = json?.data?.Solana?.BalanceUpdates
    if (!Array.isArray(items) || items.length === 0) return 0
    const bu = items[0]?.BalanceUpdate
    if (!bu?.Balance) return 0
    const raw = Number(bu.Balance)
    const decimals = Number(bu.Currency?.Decimals) || 6
    return raw / Math.pow(10, decimals)
  } catch {
    return 0
  }
}
