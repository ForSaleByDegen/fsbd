/**
 * Returns encryption key for token-gated public chat.
 * Only token holders and listing seller can access.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, getMint } from '@solana/spl-token'
import { createHmac } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    if (!listingId || !wallet) {
      return NextResponse.json({ error: 'Missing listing id or wallet' }, { status: 400 })
    }

    const secret = process.env.TOKEN_CHAT_KEY_SECRET
    if (!secret || secret.length < 16) {
      return NextResponse.json(
        { error: 'Token-gated chat not configured (TOKEN_CHAT_KEY_SECRET)' },
        { status: 503 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }

    const { data: listing, error } = await supabaseAdmin
      .from('listings')
      .select('id, token_mint, wallet_address')
      .eq('id', listingId)
      .single()

    if (error || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const tokenMint = (listing as { token_mint?: string | null }).token_mint
    const sellerWallet = (listing as { wallet_address?: string }).wallet_address

    if (!tokenMint || !tokenMint.trim()) {
      return NextResponse.json({ encrypted: false })
    }

    // Seller always has access
    if (sellerWallet && wallet.toLowerCase() === sellerWallet.toLowerCase()) {
      const key = deriveChatKey(secret, listingId, tokenMint)
      return NextResponse.json({ key: Buffer.from(key).toString('base64'), encrypted: true })
    }

    // Check token balance
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl)
    try {
      const mintPubkey = new PublicKey(tokenMint)
      const userPubkey = new PublicKey(wallet)
      const tokenAccount = await getAssociatedTokenAddress(mintPubkey, userPubkey)
      const accountInfo = await getAccount(connection, tokenAccount)
      const mintInfo = await getMint(connection, mintPubkey)
      const balance = Number(accountInfo.amount) / 10 ** mintInfo.decimals
      if (balance > 0) {
        const key = deriveChatKey(secret, listingId, tokenMint)
        return NextResponse.json({ key: Buffer.from(key).toString('base64'), encrypted: true })
      }
    } catch {
      // No token account or error = 0 balance
    }

    return NextResponse.json(
      { error: 'Hold this listing token to access the chat' },
      { status: 403 }
    )
  } catch (e) {
    console.error('[token-chat-key]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function deriveChatKey(secret: string, listingId: string, tokenMint: string): Buffer {
  const hmac = createHmac('sha256', secret)
  hmac.update(listingId + ':' + tokenMint)
  return hmac.digest()
}
