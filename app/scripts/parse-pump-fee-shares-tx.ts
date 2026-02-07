/**
 * Reverse-engineer update_fee_shares instruction from a known transaction.
 * Run: npx tsx scripts/parse-pump-fee-shares-tx.ts
 */
import { Connection, PublicKey } from '@solana/web3.js'

const TX_SIG = '4R8ncr1z1FLioNCa1UBUSwTt9UvexyTh2VNBzNpD7n6DLUfPeGrZLaPnhRCUGZnQ8DGRWcC5eLYLrA4tzBY7GGpq'
const PUMP_FEES_PROGRAM_ID = 'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ'

function getAccountKeys(msg: { accountKeys: Array<{ pubkey?: { toBase58: () => string }; toString?: () => string }> }): string[] {
  return msg.accountKeys.map((k) => (k.pubkey ? k.pubkey.toBase58() : String(k)))
}

function collectInstructions(parsed: {
  transaction: { message: { accountKeys: unknown[]; instructions: unknown[] } }
  meta?: { innerInstructions?: Array<{ index: number; instructions: unknown[] }> }
}): Array<{ programId: string; data?: string; accountIndices?: number[]; accounts?: string[] }> {
  const accountKeys = getAccountKeys(parsed.transaction.message)
  const out: Array<{ programId: string; data?: string; accountIndices?: number[]; accounts?: string[] }> = []

  const pushIx = (ix: { programId?: string | number; accounts?: number[]; data?: string }) => {
    const programId =
      typeof ix.programId === 'number'
        ? accountKeys[ix.programId] ?? ''
        : String(ix.programId ?? '')
    if (!programId) return
    const data = ix.data
    const accountIndices = ix.accounts
    const accounts = accountIndices?.map((idx) => accountKeys[idx] ?? `idx=${idx}`)
    out.push({ programId, data, accountIndices, accounts })
  }

  for (const ix of parsed.transaction.message.instructions as Array<{ programId?: string | number; accounts?: number[]; data?: string }>) {
    pushIx(ix)
  }
  for (const inner of parsed.meta?.innerInstructions ?? []) {
    for (const ix of inner.instructions as Array<{ programId?: string | number; accounts?: number[]; data?: string }>) {
      pushIx(ix)
    }
  }
  return out
}

async function main() {
  const rpc = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
  const conn = new Connection(rpc)

  console.log('Fetching transaction...')
  const parsed = await conn.getParsedTransaction(TX_SIG, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  })
  if (!parsed?.transaction) {
    console.error('Transaction not found')
    process.exit(1)
  }

  const instructions = collectInstructions(parsed)

  for (const ix of instructions) {
    if (!String(ix.programId).includes('pfee')) continue
    const rawData = ix.data
    if (!rawData) {
      console.log('\n=== Pump Fees Program Instruction (parsed, no raw data) ===')
      console.log('Program:', ix.programId)
      continue
    }
    const bytes = Buffer.from(rawData, 'base64')

    console.log('\n=== Pump Fees Program Instruction ===')
    console.log('Program:', ix.programId)
    console.log('Data length:', bytes.length, 'bytes')
    console.log('Data (hex):', bytes.toString('hex'))
    console.log('Data (base64):', rawData)

    if (bytes.length >= 8) {
      const discriminator = bytes.subarray(0, 8)
      console.log('Discriminator (8 bytes hex):', discriminator.toString('hex'))
      const rest = bytes.subarray(8)
      console.log('Rest length:', rest.length)

      // Try: vec of (Pubkey, u16) with Borsh u32 length prefix
      if (rest.length >= 4) {
        const vecLen = rest.readUInt32LE(0)
        if (vecLen <= 20 && vecLen * 34 + 4 <= rest.length) {
          console.log('Layout: Borsh Vec<(Pubkey,u16)> len=', vecLen)
          let offset = 4
          for (let j = 0; j < vecLen; j++) {
            const pubkey = new PublicKey(rest.subarray(offset, offset + 32))
            const share = rest.readUInt16LE(offset + 32)
            const pct = ((share / 65535) * 100).toFixed(2)
            console.log(`  [${j}] pubkey: ${pubkey.toBase58()}, share(u16): ${share} (~${pct}%)`)
            offset += 34
          }
          console.log('Consumed:', offset, 'bytes, remainder:', rest.length - offset)
        } else {
          // Try: raw (Pubkey, u16) pairs, no length
          console.log('Layout: raw (Pubkey,u16) pairs (no length prefix)')
          let offset = 0
          let j = 0
          while (offset + 34 <= rest.length) {
            const pubkey = new PublicKey(rest.subarray(offset, offset + 32))
            const share = rest.readUInt16LE(offset + 32)
            const pct = ((share / 65535) * 100).toFixed(2)
            console.log(`  [${j}] pubkey: ${pubkey.toBase58()}, share(u16): ${share} (~${pct}%)`)
            offset += 34
            j++
          }
          console.log('Consumed:', offset, 'bytes, remainder:', rest.length - offset)
        }
      }
    }

    if (ix.accounts?.length) {
      console.log('\nAccounts:')
      ix.accounts.forEach((acc, idx) => console.log(`  #${idx}: ${acc}`))
    }
  }

  console.log('\nDone.')
}

main().catch(console.error)
