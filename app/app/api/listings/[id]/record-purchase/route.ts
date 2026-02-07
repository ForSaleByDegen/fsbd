/**
 * POST /api/listings/[id]/record-purchase
 * Buyer submits tx signature to mark listing sold when payment was made outside app
 * (e.g. Solana Pay link). Verifies tx on-chain then updates listing.
 *
 * Body: { buyer: string, txSignature: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const SIG_REGEX = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/
const LAMPORTS_PER_SOL = 1e9

function resolveTokenMint(
  priceToken: string | null,
  tokenMint: string | null
): { token: 'SOL' | 'USDC'; mint: string | null; decimals: number } {
  if (!priceToken || priceToken === 'SOL') return { token: 'SOL', mint: null, decimals: 9 }
  if (priceToken === 'USDC') {
    const net = process.env.NEXT_PUBLIC_SOLANA_NETWORK
    return {
      token: 'USDC',
      mint:
        net === 'mainnet-beta'
          ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
          : '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      decimals: 6,
    }
  }
  if (priceToken === 'LISTING_TOKEN' && tokenMint && BASE58.test(tokenMint)) {
    return { token: 'USDC', mint: tokenMint, decimals: 6 }
  }
  if (tokenMint && BASE58.test(tokenMint)) return { token: 'USDC', mint: tokenMint, decimals: 6 }
  return { token: 'SOL', mint: null, decimals: 9 }
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
    const txSignature = typeof body.txSignature === 'string' ? body.txSignature.trim() : ''

    if (!buyer || !BASE58.test(buyer)) {
      return NextResponse.json({ error: 'Invalid buyer address' }, { status: 400 })
    }
    if (!txSignature || !SIG_REGEX.test(txSignature)) {
      return NextResponse.json({ error: 'Invalid transaction signature' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      )
    }

    const { data: listing, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id, wallet_address, wallet_address_hash, price, price_token, token_mint, status, quantity, external_listing_url')
      .eq('id', id)
      .single()

    if (fetchError || !listing) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      return NextResponse.json(
        { error: fetchError?.message || 'Listing not found' },
        { status: 500 }
      )
    }

    if (listing.status !== 'active') {
      return NextResponse.json(
        { error: 'This listing is not active. It may already be sold.' },
        { status: 400 }
      )
    }

    const externalUrl = typeof listing.external_listing_url === 'string' ? listing.external_listing_url.trim() : ''
    if (externalUrl) {
      let sellerVerified = false
      const walletHash = listing.wallet_address_hash
      if (walletHash) {
        try {
          const { data: verifications } = await supabaseAdmin
            .from('seller_verifications')
            .select('id')
            .eq('wallet_address_hash', walletHash)
            .limit(1)
          sellerVerified = !!(verifications && verifications.length > 0)
        } catch { /* ignore */ }
      }
      if (!sellerVerified) {
        return NextResponse.json(
          { error: 'This listing must be purchased on the original site. The seller has not verified ownership.' },
          { status: 400 }
        )
      }
    }

    const sellerWallet = String(listing.wallet_address ?? '').trim()
    if (!sellerWallet || !BASE58.test(sellerWallet)) {
      return NextResponse.json(
        { error: 'Listing has invalid seller data.' },
        { status: 400 }
      )
    }

    const price = Number(listing.price)
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: 'Invalid listing price.' }, { status: 400 })
    }

    const { token, mint, decimals } = resolveTokenMint(listing.price_token, listing.token_mint)

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl)

    const tx = await connection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
    })

    if (!tx?.meta) {
      return NextResponse.json(
        { error: 'Transaction not found or not yet confirmed. Wait a moment and try again.' },
        { status: 400 }
      )
    }
    if (tx.meta.err) {
      return NextResponse.json({ error: 'Transaction failed on-chain.' }, { status: 400 })
    }

    const buyerPubkey = new PublicKey(buyer)
    const sellerPubkey = new PublicKey(sellerWallet)

    const accountKeys = tx.transaction.message.accountKeys
    const buyerIndex = accountKeys.findIndex(
      (k) => 'pubkey' in k && k.pubkey.equals(buyerPubkey)
    )
    const sellerIndex = accountKeys.findIndex(
      (k) => 'pubkey' in k && k.pubkey.equals(sellerPubkey)
    )

    const isSigner = (idx: number) => {
      const k = accountKeys[idx]
      return k && 'signer' in k && k.signer
    }
    if (buyerIndex < 0 || !isSigner(buyerIndex)) {
      return NextResponse.json(
        { error: 'Transaction must be signed by the buyer wallet.' },
        { status: 400 }
      )
    }

    if (token === 'SOL') {
      const requiredLamports = Math.floor(price * LAMPORTS_PER_SOL)
      const preBalances = tx.meta.preBalances || []
      const postBalances = tx.meta.postBalances || []
      if (sellerIndex < 0) {
        return NextResponse.json(
          { error: 'Transaction does not involve the seller.' },
          { status: 400 }
        )
      }
      const sellerDelta = (postBalances[sellerIndex] || 0) - (preBalances[sellerIndex] || 0)
      if (sellerDelta < requiredLamports) {
        return NextResponse.json(
          { error: `Transaction must send at least ${price} SOL to the seller.` },
          { status: 400 }
        )
      }
    } else if (mint) {
      const mintPubkey = new PublicKey(mint)
      const sellerAta = getAssociatedTokenAddressSync(mintPubkey, sellerPubkey)
      const requiredAmount = BigInt(Math.floor(price * 10 ** decimals))

      let foundValidTransfer = false
      const checkInstruction = (ix: { parsed?: { type?: string; info?: { source?: string; destination?: string; amount?: string } } }) => {
        const p = ix?.parsed
        if (p?.type === 'transfer' || p?.type === 'transferChecked') {
          const info = p.info
          if (
            info?.destination === sellerAta.toBase58() &&
            info?.amount &&
            BigInt(info.amount) >= requiredAmount
          ) {
            foundValidTransfer = true
          }
        }
      }

      for (const ix of tx.transaction.message.instructions) {
        checkInstruction(ix as Parameters<typeof checkInstruction>[0])
      }
      if (!foundValidTransfer && tx.meta.innerInstructions) {
        for (const innerGroup of tx.meta.innerInstructions) {
          for (const inner of innerGroup.instructions) {
            checkInstruction(inner as Parameters<typeof checkInstruction>[0])
          }
        }
      }

      if (!foundValidTransfer) {
        return NextResponse.json(
          { error: `Transaction must transfer at least ${price} of the payment token to the seller.` },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json({ error: 'Unsupported payment token.' }, { status: 400 })
    }

    const buyerHash = hashWalletAddress(buyer)
    const qty = listing.quantity != null ? Number(listing.quantity) : 1
    const isLastOne = qty <= 1

    const updatePayload: Record<string, unknown> = isLastOne
      ? {
          status: 'sold',
          buyer_wallet_hash: buyerHash,
          buyer_wallet_address: buyer,
          quantity: 0,
        }
      : { quantity: Math.max(0, qty - 1) }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('listings')
      .update(updatePayload)
      .eq('id', id)
      .gte('quantity', 1)
      .select('id')
      .single()

    if (updateError || !updated) {
      if (!updateError && !updated) {
        return NextResponse.json(
          { error: 'Item already sold or quantity exhausted.' },
          { status: 409 }
        )
      }
      console.error('[record-purchase] Update error:', updateError)
      return NextResponse.json(
        { error: updateError?.message || 'Failed to record purchase' },
        { status: 500 }
      )
    }

    if (isLastOne) {
      const sellerWalletHash = listing.wallet_address_hash
      const { data: sellerProfile } = await supabaseAdmin
        .from('profiles')
        .select('total_listings_sold')
        .eq('wallet_address_hash', sellerWalletHash)
        .single()

      if (sellerProfile) {
        await supabaseAdmin
          .from('profiles')
          .update({
            total_listings_sold: (sellerProfile.total_listings_sold || 0) + 1,
          })
          .eq('wallet_address_hash', sellerWalletHash)
      }
    }

    return NextResponse.json({
      success: true,
      status: isLastOne ? 'sold' : 'active',
      quantityRemaining: isLastOne ? 0 : qty - 1,
    })
  } catch (err) {
    console.error('[record-purchase] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
