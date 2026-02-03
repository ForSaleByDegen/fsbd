/**
 * POST /api/verify-asset-ownership
 * Verifies wallet owns an NFT or holds min % of a meme coin on Solana.
 * Returns { verified, assetType, balance?, percent?, collectionName?, imageUri? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  getAccount,
  getMint,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const wallet = String(body.wallet || '').trim()
    const assetType = body.assetType // 'nft' | 'meme_coin'
    const mint = String(body.mint || '').trim()
    const minPercent = typeof body.minPercent === 'number' ? body.minPercent : parseFloat(String(body.minPercent || 0))

    if (!wallet || !assetType || !mint) {
      return NextResponse.json(
        { error: 'wallet, assetType, and mint required' },
        { status: 400 }
      )
    }
    if (!BASE58.test(wallet) || !BASE58.test(mint)) {
      return NextResponse.json({ error: 'Invalid wallet or mint address' }, { status: 400 })
    }
    if (assetType !== 'nft' && assetType !== 'meme_coin') {
      return NextResponse.json({ error: 'assetType must be nft or meme_coin' }, { status: 400 })
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl)
    const walletPubkey = new PublicKey(wallet)
    const mintPubkey = new PublicKey(mint)

    if (assetType === 'nft') {
      // Verify NFT ownership: wallet holds at least 1 token of this mint
      try {
        const ata = await getAssociatedTokenAddress(mintPubkey, walletPubkey)
        const account = await getAccount(connection, ata)
        const mintInfo = await getMint(connection, mintPubkey)
        const amount = Number(account.amount)
        const decimals = mintInfo.decimals
        // NFTs typically have decimals=0, amount=1. Some use decimals and amount=1e9
        const normalized = amount / Math.pow(10, decimals)
        if (normalized >= 1) {
          return NextResponse.json({
            verified: true,
            assetType: 'nft',
            balance: normalized,
          })
        }
      } catch {
        /* Account not found = doesn't own */
      }
      return NextResponse.json({
        verified: false,
        assetType: 'nft',
        error: 'You do not own this NFT. Connect the wallet that holds it.',
      })
    }

    // assetType === 'meme_coin': verify % of supply
    try {
      const ata = await getAssociatedTokenAddress(mintPubkey, walletPubkey)
      const account = await getAccount(connection, ata)
      const mintInfo = await getMint(connection, mintPubkey)
      const supply = Number(mintInfo.supply)
      const balance = Number(account.amount)
      const decimals = mintInfo.decimals
      const supplyNorm = supply / Math.pow(10, decimals)
      const balanceNorm = balance / Math.pow(10, decimals)
      const percent = supplyNorm > 0 ? (balanceNorm / supplyNorm) * 100 : 0

      if (minPercent > 0 && percent < minPercent) {
        return NextResponse.json({
          verified: false,
          assetType: 'meme_coin',
          balance: balanceNorm,
          percent,
          minPercent,
          error: `You hold ${percent.toFixed(2)}% but need at least ${minPercent}% to list.`,
        })
      }

      return NextResponse.json({
        verified: true,
        assetType: 'meme_coin',
        balance: balanceNorm,
        percent,
        supply: supplyNorm,
      })
    } catch {
      return NextResponse.json({
        verified: false,
        assetType: 'meme_coin',
        error: 'You do not hold this token. Connect the wallet that holds it.',
      })
    }
  } catch (e) {
    console.error('[verify-asset-ownership]', e)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
