/**
 * POST /api/listings/[id]/prepare-transfer
 *
 * Server builds the transfer transaction. The seller's wallet NEVER reaches the client.
 * Client receives serialized unsigned tx, signs, and sends.
 *
 * Body: { buyer: string } - buyer's wallet address (base58)
 * Returns: { transactionBase64: string, blockhash: string, lastValidBlockHeight: number, amount, token }
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  createAssociatedTokenAccountIdempotentInstruction,
  getMint,
} from '@solana/spl-token'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { maskWallet } from '@/lib/sanitize-log'
import CryptoJS from 'crypto-js'

function hashWalletAddress(address: string): string {
  return CryptoJS.SHA256(address).toString()
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function resolveTokenMint(
  priceToken: string | null,
  tokenMint: string | null
): { token: 'SOL' | 'USDC'; mint: string | null } {
  if (!priceToken || priceToken === 'SOL') return { token: 'SOL', mint: null }
  if (priceToken === 'USDC') {
    const net = process.env.NEXT_PUBLIC_SOLANA_NETWORK
    return {
      token: 'USDC',
      mint:
        net === 'mainnet-beta'
          ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
          : '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    }
  }
  // LISTING_TOKEN = seller accepts their listing token as payment
  if (priceToken === 'LISTING_TOKEN' && tokenMint && BASE58.test(tokenMint)) {
    return { token: 'USDC', mint: tokenMint }
  }
  if (tokenMint && BASE58.test(tokenMint)) return { token: 'USDC', mint: tokenMint }
  return { token: 'SOL', mint: null }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing listing ID' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const buyer = typeof body.buyer === 'string' ? body.buyer.trim() : ''
    const protectionOptIn = body.protectionOptIn === true
    if (!buyer || !BASE58.test(buyer)) {
      return NextResponse.json({ error: 'Invalid buyer address' }, { status: 400 })
    }

    const poolWallet = process.env.PROTECTION_POOL_WALLET?.trim()
    const canAddProtection = protectionOptIn && poolWallet && BASE58.test(poolWallet)

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      )
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl)

    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('id, wallet_address, price, price_token, token_mint, status, quantity')
      .eq('id', id)
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error?.message || 'Listing not found' }, { status: 500 })
    }

    if (data.status !== 'active') {
      return NextResponse.json(
        { error: 'This listing is no longer available for purchase.' },
        { status: 400 }
      )
    }

    const qty = data.quantity != null ? Number(data.quantity) : 1
    if (qty < 1) {
      return NextResponse.json(
        { error: 'This item is sold out.' },
        { status: 400 }
      )
    }

    const wa = String(data.wallet_address ?? '').trim()
    if (!wa || !BASE58.test(wa)) {
      console.error('[prepare-transfer] Invalid wallet_address for listing', id, maskWallet(wa))
      return NextResponse.json(
        { error: 'This listing has invalid seller data. The seller needs to re-list.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    let sellerPubkey: PublicKey
    try {
      sellerPubkey = new PublicKey(wa)
    } catch (e) {
      console.error('[prepare-transfer] PublicKey failed for listing', id, e)
      return NextResponse.json(
        { error: 'This listing has invalid seller address. The seller needs to re-list.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const buyerPubkey = new PublicKey(buyer)
    const price = Number(data.price)
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: 'Invalid listing price.' }, { status: 400 })
    }

    const { token, mint } = resolveTokenMint(data.price_token, data.token_mint)
    const protectionFee = canAddProtection ? price * 0.02 : 0
    const transaction = new Transaction()

    if (token === 'SOL') {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: buyerPubkey,
          toPubkey: sellerPubkey,
          lamports: Math.floor(price * LAMPORTS_PER_SOL),
        })
      )
      if (protectionFee > 0) {
        const poolPubkey = new PublicKey(poolWallet!)
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: buyerPubkey,
            toPubkey: poolPubkey,
            lamports: Math.floor(protectionFee * LAMPORTS_PER_SOL),
          })
        )
      }
    } else if (mint) {
      const mintPubkey = new PublicKey(mint)
      const buyerAta = await getAssociatedTokenAddress(mintPubkey, buyerPubkey)
      const sellerAta = await getAssociatedTokenAddress(mintPubkey, sellerPubkey)
      const mintInfo = await getMint(connection, mintPubkey)
      const decimals = mintInfo.decimals

      try {
        await getAccount(connection, sellerAta)
      } catch {
        transaction.add(
          createAssociatedTokenAccountIdempotentInstruction(
            buyerPubkey,
            sellerAta,
            sellerPubkey,
            mintPubkey
          )
        )
      }

      const amountBigInt = BigInt(Math.floor(price * 10 ** decimals))
      transaction.add(
        createTransferInstruction(buyerAta, sellerAta, buyerPubkey, amountBigInt)
      )
      if (protectionFee > 0 && poolWallet) {
        const poolPubkey = new PublicKey(poolWallet)
        const poolAta = await getAssociatedTokenAddress(mintPubkey, poolPubkey)
        try {
          await getAccount(connection, poolAta)
        } catch {
          transaction.add(
            createAssociatedTokenAccountIdempotentInstruction(
              buyerPubkey,
              poolAta,
              poolPubkey,
              mintPubkey
            )
          )
        }
        const feeBigInt = BigInt(Math.floor(protectionFee * 10 ** decimals))
        transaction.add(
          createTransferInstruction(buyerAta, poolAta, buyerPubkey, feeBigInt)
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported payment token.' },
        { status: 400 }
      )
    }

    transaction.feePayer = buyerPubkey
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')
    transaction.recentBlockhash = blockhash

    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })
    const transactionBase64 = Buffer.from(serialized).toString('base64')

    return NextResponse.json(
      {
        transactionBase64,
        blockhash,
        lastValidBlockHeight,
        amount: price,
        token,
        listingId: data.id,
        sellerWalletHash: hashWalletAddress(wa),
        protectionFee: canAddProtection ? protectionFee : 0,
        protectionOptIn: canAddProtection,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[prepare-transfer] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
