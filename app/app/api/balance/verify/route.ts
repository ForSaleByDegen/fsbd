import { NextRequest, NextResponse } from 'next/server'

/**
 * Bitquery balance verification fallback.
 * When RPC reports 0 SOL incorrectly, this API can verify balance via Bitquery.
 * Note: Bitquery is read-only - actual transactions still require Solana RPC.
 *
 * Setup: Add BITQUERY_API_KEY to Vercel env (get from https://account.bitquery.io)
 */
export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet')
  if (!wallet || wallet.length < 32) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  const apiKey = process.env.BITQUERY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ balance: null, source: 'bitquery_unavailable' })
  }

  try {
    // Bitquery: Get all tokens owned by address, find native SOL
    const response = await fetch('https://streaming.bitquery.io/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: `
          query SolanaBalance($address: String!) {
            Solana(network: solana) {
              BalanceUpdates(
                where: { BalanceUpdate: { Account: { Address: { is: $address } } } }
                limit: { count: 20 }
              ) {
                BalanceUpdate {
                  PostBalance(maximum: Block_Slot)
                  Currency { Symbol }
                }
              }
            }
          }
        `,
        variables: { address: wallet },
      }),
    })

    const json = await response.json()
    const updates = json?.data?.Solana?.BalanceUpdates || []
    const solEntry = updates.find((u: { BalanceUpdate?: { Currency?: { Symbol?: string } } }) =>
      u?.BalanceUpdate?.Currency?.Symbol === 'SOL'
    )
    const postBalance = solEntry?.BalanceUpdate?.PostBalance

    if (postBalance != null) {
      const lamports = typeof postBalance === 'string' ? parseInt(postBalance, 10) : Number(postBalance)
      const sol = lamports / 1e9
      return NextResponse.json({ balance: sol, lamports, source: 'bitquery' })
    }

    return NextResponse.json({ balance: null, source: 'bitquery_no_data' })
  } catch (err) {
    console.error('Bitquery balance verify error:', err)
    return NextResponse.json({ balance: null, source: 'bitquery_error' })
  }
}
