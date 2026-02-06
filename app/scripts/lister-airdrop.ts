/**
 * Lister Rewards Airdrop
 *
 * Snapshot: all unique wallets that have created at least one listing.
 * Airdrop: 4200.69 $FSBD to each (from 30% rewards pool).
 *
 * Run: npx tsx scripts/lister-airdrop.ts [--snapshot-only | --execute]
 *
 * Requires:
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 * - AIRDROP_SOURCE_KEYPAIR (path to JSON keypair or base64) - wallet holding $FSBD rewards
 * - NEXT_PUBLIC_FSBD_TOKEN_MINT (or fsbd from platform_config)
 * - $FSBD in source wallet
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getMint,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'

const AMOUNT_PER_WALLET = 4200.69
const FSBD_DECIMALS = 6 // pump.fun tokens use 6
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'https://api.mainnet-beta.solana.com'
const FSBD_MINT = process.env.NEXT_PUBLIC_FSBD_TOKEN_MINT || 'A8sdJBY6UGErXW2gNVT6s13Qn4FJwGyRp63Y5mZBpump'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function loadKeypair(): Keypair {
  const pathEnv = process.env.AIRDROP_SOURCE_KEYPAIR
  const base64Env = process.env.AIRDROP_SOURCE_KEYPAIR_BASE64
  if (base64Env) {
    const decoded = Buffer.from(base64Env, 'base64').toString('utf-8')
    const arr = JSON.parse(decoded) as number[]
    return Keypair.fromSecretKey(Uint8Array.from(arr))
  }
  if (pathEnv) {
    const resolved = path.isAbsolute(pathEnv) ? pathEnv : path.resolve(process.cwd(), pathEnv)
    const data = JSON.parse(fs.readFileSync(resolved, 'utf-8'))
    return Keypair.fromSecretKey(Uint8Array.from(data))
  }
  throw new Error('Set AIRDROP_SOURCE_KEYPAIR (path to JSON) or AIRDROP_SOURCE_KEYPAIR_BASE64')
}

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

async function getUniqueListers(supabase: SupabaseClient): Promise<{ wallet_address: string }[]> {
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

async function createSnapshot(
  supabase: SupabaseClient,
  recipients: { wallet_address: string }[]
): Promise<string> {
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

async function executeAirdrop(
  connection: Connection,
  payer: Keypair,
  supabase: SupabaseClient,
  snapshotId: string,
  batchSize = 5,
  delayMs = 2000
): Promise<void> {
  const mint = new PublicKey(FSBD_MINT)
  const mintInfo = await getMint(connection, mint)
  const decimals = mintInfo.decimals
  const amountRaw = BigInt(Math.floor(AMOUNT_PER_WALLET * Math.pow(10, decimals)))

  const sourceAta = await getAssociatedTokenAddress(mint, payer.publicKey)

  const { data: pending } = await supabase
    .from('lister_airdrop_recipients')
    .select('id, wallet_address')
    .eq('snapshot_id', snapshotId)
    .eq('status', 'pending')
    .limit(1000)

  const recipients = (pending ?? []) as { id: string; wallet_address: string }[]
  console.log(`Sending to ${recipients.length} recipients...`)

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

        console.log(`  ✓ ${rec.wallet_address.slice(0, 8)}... -> ${sig}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`  ✗ ${rec.wallet_address}: ${msg}`)
        await supabase
          .from('lister_airdrop_recipients')
          .update({
            status: 'failed',
            error_message: msg.slice(0, 500),
          })
          .eq('id', rec.id)
      }

      await new Promise((r) => setTimeout(r, 300))
    }

    if (i + batchSize < recipients.length) {
      console.log(`  Pausing ${delayMs}ms...`)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

async function main() {
  const snapshotOnly = process.argv.includes('--snapshot-only')
  const execute = process.argv.includes('--execute')
  const snapshotIdArg = process.argv.find((a) => a.startsWith('--snapshot-id='))
  const existingSnapshotId = snapshotIdArg?.split('=')[1]?.trim()

  console.log('Lister Rewards Airdrop')
  console.log('=====================')
  console.log('Amount per wallet:', AMOUNT_PER_WALLET, '$FSBD')
  console.log('Network:', RPC_URL.includes('devnet') ? 'Devnet' : 'Mainnet')
  console.log('')

  const supabase = getSupabase()
  let snapshotId: string

  if (existingSnapshotId && execute) {
    const { data, error } = await supabase
      .from('lister_airdrop_snapshots')
      .select('id')
      .eq('id', existingSnapshotId)
      .single()
    if (error || !data) throw new Error(`Snapshot ${existingSnapshotId} not found`)
    snapshotId = (data as { id: string }).id
    const { count } = await supabase
      .from('lister_airdrop_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('snapshot_id', snapshotId)
    console.log(`Using existing snapshot ${snapshotId} (${count} recipients)`)
  } else {
    const listers = await getUniqueListers(supabase)
    console.log(`Unique listers: ${listers.length}`)

    if (listers.length === 0) {
      console.log('No listers found. Exiting.')
      return
    }

    snapshotId = await createSnapshot(supabase, listers)
    console.log(`Snapshot created: ${snapshotId}`)

    if (snapshotOnly) {
      console.log('--snapshot-only: Skipping execution.')
      return
    }

    if (!execute) {
      console.log('\nTo execute airdrop, run with --execute')
      console.log('To use this snapshot: --execute --snapshot-id=' + snapshotId)
      return
    }
  }

  const payer = loadKeypair()
  const connection = new Connection(RPC_URL)
  console.log('\nExecuting airdrop from:', payer.publicKey.toBase58())

  await executeAirdrop(connection, payer, supabase, snapshotId)
  console.log('\nDone.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
