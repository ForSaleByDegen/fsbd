/**
 * POST /api/listings/[id]/forward-fees-tx
 * Builds an unsigned SOL transfer tx (seller -> buyer) for the seller to forward
 * pump.fun creator fees to the buyer. No custody, no server signing.
 *
 * Body: { seller: string, amount: number, buyer?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import CryptoJS from 'crypto-js'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const LAMPORTS_PER_SOL = 1e9

function hashWalletAddress(address: string): string {
  return CryptoJS.SHA256(address).toString()
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
    const seller = typeof body.seller === 'string' ? body.seller.trim() : ''
    const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount)
    const buyerFromBody = typeof body.buyer === 'string' ? body.buyer.trim() : ''

    if (!seller || !BASE58.test(seller)) {
      return NextResponse.json({ error: 'Invalid seller address' }, { status: 400 })
    }
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount. Provide a positive SOL amount.' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server not configured.' },
        { status: 503 }
      )
    }

    const { data: listing, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id, wallet_address, wallet_address_hash, buyer_wallet_address, status, has_token, token_mint')
      .eq('id', id)
      .single()

    if (fetchError || !listing) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchError?.message || 'Listing not found' }, { status: 500 })
    }

    if (listing.status !== 'sold' && listing.status !== 'shipped') {
      return NextResponse.json(
        { error: 'This listing is not sold. Forward fees is only for completed sales.' },
        { status: 400 }
      )
    }

    const sellerWallet = String(listing.wallet_address ?? '').trim()
    const sellerHash = hashWalletAddress(seller)
    if (listing.wallet_address_hash !== sellerHash) {
      return NextResponse.json({ error: 'You are not the seller of this listing.' }, { status: 403 })
    }
    if (seller !== sellerWallet) {
      return NextResponse.json({ error: 'Seller address does not match listing owner.' }, { status: 400 })
    }

    const hasToken = !!listing.has_token && !!listing.token_mint
    if (!hasToken) {
      return NextResponse.json(
        { error: 'This listing does not have a token. Forward fees applies to token listings only.' },
        { status: 400 }
      )
    }

    const buyer = (listing.buyer_wallet_address && BASE58.test(String(listing.buyer_wallet_address).trim()))
      ? String(listing.buyer_wallet_address).trim()
      : (buyerFromBody && BASE58.test(buyerFromBody) ? buyerFromBody : null)

    if (!buyer) {
      return NextResponse.json(
        { error: 'Buyer address not on file. Please provide it in the request body as "buyer".' },
        { status: 400 }
      )
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl)

    const sellerPubkey = new PublicKey(seller)
    const buyerPubkey = new PublicKey(buyer)
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL)

    const transaction = new Transaction()
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: sellerPubkey,
        toPubkey: buyerPubkey,
        lamports,
      })
    )
    transaction.feePayer = sellerPubkey

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')
    transaction.recentBlockhash = blockhash

    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })
    const transactionBase64 = Buffer.from(serialized).toString('base64')

    return NextResponse.json(
      { transactionBase64, blockhash, lastValidBlockHeight, amount, token: 'SOL' },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[forward-fees-tx] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
