/**
 * Mint minimal receipt cNFT on purchase.
 * Buyer receives on-chain proof: image, description, price, date.
 * Mint fee deducted from seller payout.
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplBubblegum } from '@metaplex-foundation/mpl-bubblegum'
import { mintV2, parseLeafFromMintV2Transaction } from '@metaplex-foundation/mpl-bubblegum'
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters'
import { publicKey, none } from '@metaplex-foundation/umi'
import type { WalletContextState } from '@solana/wallet-adapter-react'
import { uploadJSONToIPFS } from './pinata'

export const MINT_FEE_SOL = 0.0001

export interface ReceiptMetadata {
  title: string
  description: string
  imageUrl: string | null
  price: number
  priceToken: string
  soldAt: string // ISO date
  listingId: string
}

/**
 * Upload receipt metadata to Pinata, return URI.
 */
export async function uploadReceiptMetadata(meta: ReceiptMetadata): Promise<string> {
  const truncatedDesc = meta.description.slice(0, 100)
  const content = {
    name: `$FSBD Receipt: ${meta.title.slice(0, 50)}${meta.title.length > 50 ? '...' : ''}`,
    image: meta.imageUrl || '',
    description: `${truncatedDesc}${meta.description.length > 100 ? '...' : ''} Sold for ${meta.price} ${meta.priceToken} on ${meta.soldAt}`,
  }
  return uploadJSONToIPFS(content, `receipt-${meta.listingId}.json`)
}

/**
 * Mint receipt cNFT to buyer. Uses Umi + wallet adapter.
 * Tree must be public (anyone can mint).
 */
export async function mintReceiptCnft(
  wallet: WalletContextState,
  rpcUrl: string,
  treeAddress: string,
  buyerAddress: string,
  metadataUri: string,
  listingTitle: string
): Promise<{ assetId: string; signature: string }> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected')
  }

  const umi = createUmi(rpcUrl)
    .use(mplBubblegum())
    .use(walletAdapterIdentity(wallet))

  const merkleTree = publicKey(treeAddress)
  const leafOwner = publicKey(buyerAddress)

  const { signature } = await mintV2(umi, {
    leafOwner,
    merkleTree,
    treeCreatorOrDelegate: umi.identity,
    metadata: {
      name: `$FSBD Receipt: ${listingTitle.slice(0, 32)}`,
      uri: metadataUri,
      sellerFeeBasisPoints: 0,
      collection: none(),
      creators: [],
    },
  }).sendAndConfirm(umi, { send: { commitment: 'confirmed' } })

  const leaf = await parseLeafFromMintV2Transaction(umi, signature)
  const assetId = leaf.id

  return { assetId, signature }
}
