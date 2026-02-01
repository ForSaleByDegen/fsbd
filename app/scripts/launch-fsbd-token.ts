/**
 * Launch $FSBD Platform Token
 *
 * Creates the $FSBD SPL token for tier gating and fee discounts.
 * Run locally with: npx tsx scripts/launch-fsbd-token.ts
 *
 * Requires:
 * - KEYPAIR_PATH or DEV_WALLET_KEYPAIR env var (path to JSON keypair or base58 secret)
 * - SOL in the keypair for rent and fees
 *
 * Output: Mint address to set as NEXT_PUBLIC_FSBD_TOKEN_MINT
 */
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getMint,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'

const TOKEN_NAME = 'For Sale By Degen'
const TOKEN_SYMBOL = 'FSBD'
const DECIMALS = 9
const TOTAL_SUPPLY = 1_000_000_000 // 1 billion tokens
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'https://api.devnet.solana.com'

function loadKeypair(): Keypair {
  const pathEnv = process.env.KEYPAIR_PATH
  const secretEnv = process.env.DEV_WALLET_KEYPAIR
  if (secretEnv) {
    const secret = JSON.parse(secretEnv) as number[]
    return Keypair.fromSecretKey(Uint8Array.from(secret))
  }
  if (pathEnv) {
    const resolved = path.resolve(process.cwd(), pathEnv)
    const data = JSON.parse(fs.readFileSync(resolved, 'utf-8'))
    return Keypair.fromSecretKey(Uint8Array.from(data))
  }
  throw new Error('Set KEYPAIR_PATH or DEV_WALLET_KEYPAIR to the wallet that will be mint authority')
}

async function main() {
  console.log('$FSBD Token Launch')
  console.log('==================')
  console.log('Network:', RPC_URL.includes('devnet') ? 'Devnet' : 'Mainnet')
  console.log('')

  const connection = new Connection(RPC_URL)
  const payer = loadKeypair()
  console.log('Mint authority / payer:', payer.publicKey.toBase58())

  // Create mint
  console.log('\nCreating mint...')
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey, // mint authority
    null,            // freeze authority
    DECIMALS,
    undefined,
    { commitment: 'confirmed' },
    TOKEN_PROGRAM_ID
  )
  console.log('Mint address:', mint.toBase58())

  // Create ATA and mint supply
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  )
  const amount = BigInt(TOTAL_SUPPLY) * BigInt(10 ** DECIMALS)
  await mintTo(connection, payer, mint, ata.address, payer, amount)
  console.log('Minted', TOTAL_SUPPLY.toLocaleString(), TOKEN_SYMBOL, 'to', ata.address.toBase58())

  const mintInfo = await getMint(connection, mint)
  console.log('\n--- SUCCESS ---')
  console.log('Token:', TOKEN_NAME, `(${TOKEN_SYMBOL})`)
  console.log('Mint:', mint.toBase58())
  console.log('Supply:', TOTAL_SUPPLY.toLocaleString())
  console.log('Decimals:', mintInfo.decimals)
  console.log('\nAdd to .env and Vercel:')
  console.log(`NEXT_PUBLIC_FSBD_TOKEN_MINT=${mint.toBase58()}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
