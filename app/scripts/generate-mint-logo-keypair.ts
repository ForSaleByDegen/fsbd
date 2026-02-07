/**
 * Generate a new keypair for the logo NFT minter.
 * Run: npx tsx scripts/generate-mint-logo-keypair.ts
 *
 * Outputs mint-logo-keypair.json in the app folder (gitignored).
 * Fund the printed pubkey with SOL, then use KEYPAIR_PATH for npm run mint-logo-nft.
 */
import { Keypair } from '@solana/web3.js'
import * as fs from 'fs'
import * as path from 'path'

const keypair = Keypair.generate()
const arr = Array.from(keypair.secretKey)
const outPath = path.resolve(process.cwd(), 'mint-logo-keypair.json')

fs.writeFileSync(outPath, JSON.stringify(arr), 'utf-8')

console.log('Generated mint-logo-keypair.json')
console.log('')
console.log('Public key (fund this with SOL for minting):')
console.log(keypair.publicKey.toBase58())
console.log('')
console.log('Then run:')
console.log('  $env:KEYPAIR_PATH = "c:\\Users\\dusti\\OneDrive\\Desktop\\FSBD\\app\\mint-logo-keypair.json"')
console.log('  npm run mint-logo-nft')
console.log('')
console.log('Keep mint-logo-keypair.json secret! Add to .gitignore if not already.')
