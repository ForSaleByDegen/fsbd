/**
 * POST encrypted message to token-gated public chat.
 * Verifies sender holds the listing token (or is seller) before inserting.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, getMint } from '@solana/spl-token'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    const body = await request.json().catch(() => ({}))
    const wallet = String(body.wallet || '').trim()
    const encryptedContent = body.encrypted_content
    const nonce = body.nonce

    if (!listingId || !wallet || !encryptedContent || !nonce) {
      return NextResponse.json(
        { error: 'Missing wallet, encrypted_content, or nonce' },
        { status: 400 }
      )
    }

    if (typeof encryptedContent !== 'string' || typeof nonce !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
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
      return NextResponse.json(
        { error: 'This listing has no token — use regular public chat' },
        { status: 400 }
      )
    }

    // Seller always allowed
    let allowed = sellerWallet && wallet.toLowerCase() === sellerWallet.toLowerCase()

    if (!allowed) {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
      const connection = new Connection(rpcUrl)
      try {
        const mintPubkey = new PublicKey(tokenMint)
        const userPubkey = new PublicKey(wallet)
        const tokenAccount = await getAssociatedTokenAddress(mintPubkey, userPubkey)
        const accountInfo = await getAccount(connection, tokenAccount)
        const mintInfo = await getMint(connection, mintPubkey)
        const balance = Number(accountInfo.amount) / 10 ** mintInfo.decimals
        allowed = balance > 0
      } catch {
        allowed = false
      }
    }

    if (!allowed) {
      return NextResponse.json(
        { error: 'Hold this listing token to post in the chat' },
        { status: 403 }
      )
    }

    const walletHash = hashWalletAddress(wallet)

    const { data, error: insertError } = await supabaseAdmin
      .from('listing_public_messages')
      .insert({
        listing_id: listingId,
        sender_wallet_hash: walletHash,
        content: '[encrypted]',
        encrypted_content: encryptedContent,
        nonce,
      })
      .select('id')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ id: data?.id })
  } catch (e) {
    console.error('[token-chat-message]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
