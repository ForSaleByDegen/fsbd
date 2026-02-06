/**
 * Lister Airdrop - shared logic for script and API
 * Snapshot unique listers, create snapshot, execute $FSBD airdrop
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getMint,
} from '@solana/spl-token'

export const AMOUNT_PER_WALLET = 4200.69
export const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function getFsbdMint(): string {
  return process.env.NEXT_PUBLIC_FSBD_TOKEN_MINT || 'A8sdJBY6UGErXW2gNVT6s13Qn4FJwGyRp63Y5mZBpump'
}

function getRpcUrl(): string {
  return process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'https://api.mainnet-beta.solana.com'
}

/** Load keypair from BASE64 env (for API/Vercel - no filesystem) */
export function loadKeypairFromBase64(): Keypair {
  const base64 = process.env.AIRDROP_SOURCE_KEYPAIR_BASE64
  if (!base64) throw new Error('AIRDROP_SOURCE_KEYPAIR_BASE64 required for web airdrop')
  const decoded = Buffer.from(base64, 'base64').toString('utf-8')
  const arr = JSON.parse(decoded) as number[]
  return Keypair.fromSecretKey(Uint8Array.from(arr))
}

export async function getUniqueListers(supabase: SupabaseClient): Promise<{ wallet_address: string }[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('wallet_address')
    .not('wallet_address', 'is', null)
    .neq('wallet_address', '')

  if (error) throw new Error(`Failed to fetch listers: ${error.message}`)

  const seen = new Set<string>()
  const list: { wallet_address: string }[] = []
  for (const row of data ?? []) {
    const wa = String((row as { wallet_address?: string }).wallet_address ?? '').trim()
    if (BASE58.test(wa) && !seen.has(wa)) {
      seen.add(wa)
      list.push({ wallet_address: wa })
    }
  }
  return list
}

export async function createSnapshot(
  supabase: SupabaseClient,
  recipients: { wallet_address: string }[]
): Promise<string> {
  const FSBD_MINT = getFsbdMint()
  const { data: snap, error: snapErr } = await supabase
    .from('lister_airdrop_snapshots')
    .insert({
      amount_per_wallet: AMOUNT_PER_WALLET,
      token_mint: FSBD_MINT,
      total_recipients: recipients.length,
      notes: 'Lister rewards - 4200.69 $FSBD per unique lister',
    })
    .select('id')
    .single()

  if (snapErr) throw new Error(`Failed to create snapshot: ${snapErr.message}`)
  const snapshotId = (snap as { id: string }).id

  const rows = recipients.map((r) => ({
    snapshot_id: snapshotId,
    wallet_address: r.wallet_address,
    amount: AMOUNT_PER_WALLET,
    status: 'pending',
  }))

  const { error: recErr } = await supabase.from('lister_airdrop_recipients').insert(rows)
  if (recErr) throw new Error(`Failed to insert recipients: ${recErr.message}`)

  return snapshotId
}

export interface ExecuteResult {
  sent: number
  failed: number
  signatures: string[]
}

export async function executeAirdrop(
  connection: Connection,
  payer: Keypair,
  supabase: SupabaseClient,
  snapshotId: string,
  opts?: { batchSize?: number; delayMs?: number; limit?: number }
): Promise<ExecuteResult> {
  const mint = new PublicKey(getFsbdMint())
  const mintInfo = await getMint(connection, mint)
  const decimals = mintInfo.decimals
  const amountRaw = BigInt(Math.floor(AMOUNT_PER_WALLET * Math.pow(10, decimals)))
  const sourceAta = await getAssociatedTokenAddress(mint, payer.publicKey)

  const limit = opts?.limit ?? 1000
  const { data: pending } = await supabase
    .from('lister_airdrop_recipients')
    .select('id, wallet_address')
    .eq('snapshot_id', snapshotId)
    .eq('status', 'pending')
    .limit(limit)

  const recipients = (pending ?? []) as { id: string; wallet_address: string }[]
  const batchSize = opts?.batchSize ?? 5
  const delayMs = opts?.delayMs ?? 2000

  const result: ExecuteResult = { sent: 0, failed: 0, signatures: [] }

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)
    for (const rec of batch) {
      try {
        const destPubkey = new PublicKey(rec.wallet_address)
        const destAta = await getAssociatedTokenAddress(mint, destPubkey)

        const { Transaction } = await import('@solana/web3.js')
        const tx = new Transaction()

        try {
          await getAccount(connection, destAta)
        } catch {
          tx.add(
            createAssociatedTokenAccountInstruction(
              payer.publicKey,
              destAta,
              destPubkey,
              mint
            )
          )
        }

        tx.add(
          createTransferInstruction(
            sourceAta,
            destAta,
            payer.publicKey,
            amountRaw
          )
        )

        const sig = await connection.sendTransaction(tx, [payer], {
          skipPreflight: false,
          maxRetries: 3,
          preflightCommitment: 'confirmed',
        })

        await connection.confirmTransaction(sig, 'confirmed')

        await supabase
          .from('lister_airdrop_recipients')
          .update({
            status: 'sent',
            tx_signature: sig,
            sent_at: new Date().toISOString(),
          })
          .eq('id', rec.id)

        result.sent++
        result.signatures.push(sig)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await supabase
          .from('lister_airdrop_recipients')
          .update({
            status: 'failed',
            error_message: msg.slice(0, 500),
          })
          .eq('id', rec.id)
        result.failed++
      }
      await new Promise((r) => setTimeout(r, 300))
    }

    if (i + batchSize < recipients.length) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }

  return result
}
