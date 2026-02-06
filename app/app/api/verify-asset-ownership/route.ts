/**
 * POST /api/verify-asset-ownership
 * Verifies wallet owns an NFT, holds token %, or controls a wallet on Solana.
 * Returns { verified, assetType, balance?, percent?, ... }
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { Connection, PublicKey } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  getAccount,
  getMint,
} from '@solana/spl-token'
import nacl from 'tweetnacl'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const VALID_ASSET_TYPES = ['nft', 'meme_coin', 'token', 'whole_token', 'wallet'] as const

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'verifyAssetOwnership')
  if (rateLimited) return rateLimited

  try {
    const body = await request.json().catch(() => ({}))
    const wallet = String(body.wallet || '').trim()
    const assetType = body.assetType
    const mint = String(body.mint || '').trim()
    const minPercent = typeof body.minPercent === 'number' ? body.minPercent : parseFloat(String(body.minPercent || 0))
    const message = typeof body.message === 'string' ? body.message : ''
    const signature = typeof body.signature === 'string' ? body.signature : ''

    if (!wallet || !assetType || !mint) {
      return NextResponse.json(
        { error: 'wallet, assetType, and mint required' },
        { status: 400 }
      )
    }
    if (!BASE58.test(wallet) || !BASE58.test(mint)) {
      return NextResponse.json({ error: 'Invalid wallet or mint address' }, { status: 400 })
    }
    if (!VALID_ASSET_TYPES.includes(assetType)) {
      return NextResponse.json({ error: 'assetType must be nft, meme_coin, token, whole_token, or wallet' }, { status: 400 })
    }

    // Wallet: verify by signature (user proves they control the wallet they're selling)
    if (assetType === 'wallet') {
      if (!message || !signature) {
        return NextResponse.json({ error: 'message and signature required for wallet verification' }, { status: 400 })
      }
      try {
        const pubkey = new PublicKey(mint).toBytes()
        const msgBytes = new TextEncoder().encode(message)
        const sigBytes = Buffer.from(signature, 'base64')
        if (sigBytes.length !== 64) {
          return NextResponse.json({ verified: false, error: 'Invalid signature length' })
        }
        const ok = nacl.sign.detached.verify(msgBytes, sigBytes, pubkey)
        if (ok) {
          return NextResponse.json({ verified: true, assetType: 'wallet' })
        }
      } catch {
        /* invalid */
      }
      return NextResponse.json({
        verified: false,
        assetType: 'wallet',
        error: 'Invalid signature. Sign the message with the wallet you are listing.',
      })
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

    // token, whole_token, meme_coin: verify balance / % of supply
    const needsPercentCheck = ['meme_coin', 'whole_token'].includes(assetType)
    const effectiveMinPercent = assetType === 'token' ? 0 : minPercent

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

      if (effectiveMinPercent > 0 && percent < effectiveMinPercent) {
        return NextResponse.json({
          verified: false,
          assetType,
          balance: balanceNorm,
          percent,
          minPercent: effectiveMinPercent,
          error: `You hold ${percent.toFixed(2)}% but need at least ${effectiveMinPercent}% to list.`,
        })
      }

      return NextResponse.json({
        verified: true,
        assetType,
        balance: balanceNorm,
        percent,
        supply: supplyNorm,
      })
    } catch {
      return NextResponse.json({
        verified: false,
        assetType,
        error: 'You do not hold this token. Connect the wallet that holds it.',
      })
    }
  } catch (e) {
    console.error('[verify-asset-ownership]', e)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
