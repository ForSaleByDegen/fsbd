/**
 * Mint FSBD logo as NFT for SNS avatar (and optional user minting).
 * Run: npx tsx scripts/mint-logo-nft.ts
 *
 * Requires:
 *   - MINT_LOGO_KEYPAIR or KEYPAIR_PATH (payer/minter wallet)
 *   - NEXT_PUBLIC_RPC_URL or RPC_URL
 *   - PINATA_JWT or NEXT_PUBLIC_PINATA_JWT (to pin metadata to IPFS)
 *
 * Output: Mint address — use on sns.id → Edit Avatar → Change from NFT
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplTokenMetadata, createNft } from '@metaplex-foundation/mpl-token-metadata'
import { generateSigner, keypairIdentity, createSignerFromKeypair, percentAmount } from '@metaplex-foundation/umi'
import * as fs from 'fs'
import * as path from 'path'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fsbd.fun'

async function pinMetadataToPinata(metadata: object): Promise<string> {
  const jwt = process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT
  if (!jwt?.trim()) {
    throw new Error('Set PINATA_JWT or NEXT_PUBLIC_PINATA_JWT to pin metadata to IPFS')
  }
  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud'
  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: { name: 'fsbd-logo-nft-metadata.json' },
      pinataOptions: { cidVersion: 1 },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(`Pinata failed: ${err.error || res.statusText}`)
  }
  const data = (await res.json()) as { IpfsHash?: string }
  if (!data.IpfsHash) throw new Error('No IpfsHash from Pinata')
  return `https://${gateway}/ipfs/${data.IpfsHash}`
}

async function main() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'https://api.mainnet-beta.solana.com'
  const keypairEnv = process.env.MINT_LOGO_KEYPAIR || process.env.TREE_CREATOR_KEYPAIR
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
    console.error('Set MINT_LOGO_KEYPAIR, TREE_CREATOR_KEYPAIR, or KEYPAIR_PATH')
    process.exit(1)
  }

  const metadata = {
    name: 'FSBD Logo',
    symbol: 'FSBD',
    description:
      'A small token of appreciation for our users. Nothing is promised — just a collectible to show support for For Sale By Degen.',
    image: `${APP_URL}/icon-512.png`,
    external_url: APP_URL,
    attributes: [
      { trait_type: 'Type', value: 'Logo' },
      { trait_type: 'Platform', value: 'For Sale By Degen' },
    ],
  }

  console.log('Pinning metadata to IPFS...')
  const metadataUri = await pinMetadataToPinata(metadata)
  console.log('Metadata URI:', metadataUri)

  const umi = createUmi(rpcUrl).use(mplTokenMetadata())
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey)
  const signer = createSignerFromKeypair(umi, umiKeypair)
  umi.use(keypairIdentity(signer))

  const mint = generateSigner(umi)
  console.log('Minting logo NFT...')

  await umi.rpc.getLatestBlockhash()

  await createNft(umi, {
    mint,
    name: metadata.name,
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
  }).sendAndConfirm(umi)

  console.log('\n✅ Logo NFT minted!')
  console.log('Mint address:', mint.publicKey)
  console.log('\nNext steps:')
  console.log('1. Add to .env:')
  console.log(`   LOGO_NFT_METADATA_URI=${metadataUri}`)
  console.log('   LOGO_NFT_TREASURY=<your_treasury_wallet>')
  console.log('2. SNS: sns.id → fsbd.sol → Edit Avatar → Change from NFT →', mint.publicKey)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
