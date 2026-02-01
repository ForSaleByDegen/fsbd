/**
 * Helius Backrun Rebates - earn 50% of MEV from your transactions.
 * Add rebate-address to sendTransaction for mainnet Helius RPC.
 * @see https://www.helius.dev/docs/backrun-rebates
 */

export interface SendWithRebateOptions {
  skipPreflight?: boolean
  maxRetries?: number
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized'
}

/**
 * Send transaction via Helius RPC with rebate-address param.
 * Buyer/signer earns 50% of MEV from backruns. Only works on mainnet with Helius RPC.
 */
export async function sendTransactionWithRebate(
  serializedTx: Uint8Array | Buffer,
  rebateAddress: string,
  rpcUrl: string,
  options: SendWithRebateOptions = {}
): Promise<string> {
  const arr = new Uint8Array(serializedTx)
  const base64 =
    typeof Buffer !== 'undefined' && Buffer.isBuffer(serializedTx)
      ? (serializedTx as Buffer).toString('base64')
      : typeof Buffer !== 'undefined'
        ? Buffer.from(arr).toString('base64')
        : btoa(Array.from(arr, (c) => String.fromCharCode(c)).join(''))

  const sep = rpcUrl.includes('?') ? '&' : '?'
  const url = `${rpcUrl}${sep}rebate-address=${encodeURIComponent(rebateAddress)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'sendTransaction',
      params: [
        base64,
        {
          encoding: 'base64',
          skipPreflight: options.skipPreflight ?? false,
          maxRetries: options.maxRetries ?? 3,
          preflightCommitment: options.preflightCommitment ?? 'processed',
        },
      ],
    }),
  })

  const json = await res.json()
  if (json.error) {
    const err = new Error(json.error.message || JSON.stringify(json.error))
    ;(err as any).logs = json.error.data?.logs
    throw err
  }
  return json.result
}

/** True if we should use rebate (mainnet + Helius RPC) */
export function shouldUseRebate(): boolean {
  if (typeof window === 'undefined') return false
  const net = process.env.NEXT_PUBLIC_SOLANA_NETWORK
  const rpc = process.env.NEXT_PUBLIC_RPC_URL || ''
  return net === 'mainnet-beta' && rpc.includes('helius')
}
