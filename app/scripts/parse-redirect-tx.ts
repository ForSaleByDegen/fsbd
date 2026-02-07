/**
 * Parse update_fee_shares accounts from reference tx.
 * Run: npx tsx scripts/parse-redirect-tx.ts
 */
import { Connection, PublicKey } from '@solana/web3.js'

const TX_SIG = '3Ba9NTWCnHV2Ku6wSKfJfhsKuMM592hkyhh7C9ykpovDHRJPxKNx9FHQ4PhUxPFZ6FQnu3dLdzmqxphnJ1bw3Lbq'
const PUMP_FEES = 'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ'

async function main() {
  const rpc = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
  const conn = new Connection(rpc)
  const parsed = await conn.getParsedTransaction(TX_SIG, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })
  if (!parsed?.transaction?.message) {
    console.error('Tx not found')
    process.exit(1)
  }

  const msg = parsed.transaction.message
  const accountKeys = 'accountKeys' in msg
    ? msg.accountKeys.map((k: { pubkey?: { toBase58: () => string } }) =>
        k?.pubkey ? k.pubkey.toBase58() : String(k))
    : []

  const instructions = [...(msg.instructions || []), ...(parsed.meta?.innerInstructions?.flatMap(i => i.instructions) || [])]

  for (const ix of instructions) {
    const prog = typeof ix.programId === 'object' && 'toBase58' in ix.programId
      ? ix.programId.toBase58()
      : accountKeys[ix.programId as number] || String(ix.programId)
    if (!prog.includes('pfee')) continue

    const indices = (ix as { accounts?: number[] }).accounts
    if (!indices?.length) continue

    console.log('\n=== pfee instruction accounts ===')
    indices.forEach((idx: number, i: number) => {
      const addr = accountKeys[idx] ?? `idx=${idx}`
      console.log(`${i}: ${addr}`)
    })
  }
  console.log('\nDone.')
}

main().catch(console.error)
