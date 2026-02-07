/**
 * GET /api/mint-logo-nft/prepare?wallet=xxx
 * Returns a transaction for the user to pay ~0.01 SOL (~$2) to treasury.
 * After they sign and send, they call /api/mint-logo-nft/verify-and-mint with the tx signature.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const MINT_PRICE_SOL = 0.01 // ~$2

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')
    if (!wallet?.trim() || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
    }

    const treasury = process.env.LOGO_NFT_TREASURY?.trim()
    if (!treasury || !BASE58.test(treasury)) {
      return NextResponse.json(
        { error: 'Logo NFT treasury not configured' },
        { status: 503 }
      )
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl)
    const walletPubkey = new PublicKey(wallet)
    const treasuryPubkey = new PublicKey(treasury)

    const transaction = new Transaction()
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: walletPubkey,
        toPubkey: treasuryPubkey,
        lamports: Math.floor(MINT_PRICE_SOL * LAMPORTS_PER_SOL),
      })
    )
    transaction.feePayer = walletPubkey
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')
    transaction.recentBlockhash = blockhash

    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })

    return NextResponse.json({
      transactionBase64: Buffer.from(serialized).toString('base64'),
      blockhash,
      lastValidBlockHeight,
      amount: MINT_PRICE_SOL,
      treasury,
    })
  } catch (err) {
    console.error('[mint-logo-nft prepare]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
