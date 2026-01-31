/**
 * One-time script to create a public Bubblegum tree for receipt cNFTs.
 * Run: npx tsx scripts/create-cnft-tree.ts
 * Requires: TREE_CREATOR_KEYPAIR (JSON array) or KEYPAIR_PATH, RPC URL, ~0.34 SOL
 * Output: Merkle tree address - set as NEXT_PUBLIC_CNFT_TREE_ADDRESS
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplBubblegum } from '@metaplex-foundation/mpl-bubblegum'
import { createTreeV2 } from '@metaplex-foundation/mpl-bubblegum'
import { generateSigner, keypairIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi'
import { Keypair } from '@solana/web3.js'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'https://api.mainnet-beta.solana.com'
  const keypairEnv = process.env.TREE_CREATOR_KEYPAIR
  const keypairPath = process.env.KEYPAIR_PATH

  let secretKey: Uint8Array
  if (keypairEnv) {
    const arr = JSON.parse(keypairEnv) as number[]
    secretKey = new Uint8Array(arr)
  } else if (keypairPath) {
    const fullPath = path.resolve(process.cwd(), keypairPath)
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as number[]
    secretKey = new Uint8Array(data)
  } else {
    console.error('Set TREE_CREATOR_KEYPAIR or KEYPAIR_PATH env var')
    process.exit(1)
  }

  const umi = createUmi(rpcUrl).use(mplBubblegum())
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey)
  const signer = createSignerFromKeypair(umi, umiKeypair)
  umi.use(keypairIdentity(signer))

  const merkleTree = generateSigner(umi)
  console.log('Creating public tree (maxDepth: 14, 16K capacity, ~0.34 SOL)...')
  console.log('Merkle Tree address:', merkleTree.publicKey)

  await createTreeV2(umi, {
    merkleTree,
    maxDepth: 14,
    maxBufferSize: 64,
    public: true,
  }).sendAndConfirm(umi)

  console.log('\nDone! Add to .env:')
  console.log(`NEXT_PUBLIC_CNFT_TREE_ADDRESS=${merkleTree.publicKey}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
