/**
 * Generate a new keypair for the airdrop rewards wallet.
 * Run: npx tsx scripts/generate-airdrop-keypair.ts
 *
 * Outputs airdrop-rewards.json in the app folder (gitignored).
 * Use the printed pubkey to receive $FSBD and SOL.
 */
import { Keypair } from '@solana/web3.js'
import * as fs from 'fs'
import * as path from 'path'

const keypair = Keypair.generate()
const arr = Array.from(keypair.secretKey)
const outPath = path.resolve(process.cwd(), 'airdrop-rewards.json')

fs.writeFileSync(outPath, JSON.stringify(arr), 'utf-8')

console.log('Generated airdrop-rewards.json')
console.log('')
console.log('Public key (use this to receive $FSBD and SOL):')
console.log(keypair.publicKey.toBase58())
console.log('')
console.log('Add to .env.local:')
console.log('AIRDROP_SOURCE_KEYPAIR=./airdrop-rewards.json')
console.log('')
console.log('Keep airdrop-rewards.json secret! It is gitignored.')
