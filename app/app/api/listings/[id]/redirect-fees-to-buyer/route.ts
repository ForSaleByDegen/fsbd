/**
 * POST /api/listings/[id]/redirect-fees-to-buyer
 * Builds an unsigned update_fee_shares tx to redirect future pump.fun creator fees to the buyer.
 * Only the seller can call. Requires sold listing with token_mint and buyer_wallet_address.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import CryptoJS from 'crypto-js'
import {
  PUMP_FEES_PROGRAM_ID,
  PUMP_PROGRAM_ID,
  PFEE_EVENT_AUTHORITY,
  PFEE_GLOBAL,
  PUMP_EVENT_AUTHORITY,
  PUMP_AMM_PROGRAM_ID,
  PUMP_AMM_EVENT_AUTHORITY,
  getSharingConfigForMint,
  getBondingCurveForMint,
  getCreatorVaultForSharingConfig,
  buildUpdateFeeSharesData,
} from '@/lib/pump-fee-shares'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112')

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
    if (!seller || !BASE58.test(seller)) {
      return NextResponse.json({ error: 'Invalid seller address' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured.' }, { status: 503 })
    }

    const { data: listing, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id, wallet_address, wallet_address_hash, buyer_wallet_address, status, has_token, token_mint, token_launched_via_fsbd')
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
        { error: 'This listing is not sold. Redirect fees is only for completed sales.' },
        { status: 400 }
      )
    }

    const sellerWallet = String(listing.wallet_address ?? '').trim()
    const sellerHash = hashWalletAddress(seller)
    if (listing.wallet_address_hash !== sellerHash || seller !== sellerWallet) {
      return NextResponse.json({ error: 'You are not the seller of this listing.' }, { status: 403 })
    }

    const hasToken = !!listing.has_token && !!listing.token_mint
    if (!hasToken) {
      return NextResponse.json(
        { error: 'This listing does not have a token. Redirect fees applies to token listings only.' },
        { status: 400 }
      )
    }

    const buyer = listing.buyer_wallet_address && BASE58.test(String(listing.buyer_wallet_address).trim())
      ? String(listing.buyer_wallet_address).trim()
      : null

    if (!buyer) {
      return NextResponse.json(
        { error: 'Buyer address not on file. Cannot redirect fees without a buyer.' },
        { status: 400 }
      )
    }

    const mintPubkey = new PublicKey(listing.token_mint)
    const sellerPubkey = new PublicKey(seller)
    const buyerPubkey = new PublicKey(buyer)

    const tokenLaunchedViaFsbd = !!listing.token_launched_via_fsbd
    const treasuryWallet = process.env.FSBD_TREASURY_WALLET?.trim()
    const use95_5Split = tokenLaunchedViaFsbd && treasuryWallet && BASE58.test(treasuryWallet)

    const shareholders = use95_5Split
      ? [{ pubkey: buyerPubkey, sharePercent: 95 }, { pubkey: new PublicKey(treasuryWallet!), sharePercent: 5 }]
      : [{ pubkey: buyerPubkey, sharePercent: 100 }]
    const instructionData = buildUpdateFeeSharesData(shareholders)

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl)

    const [sharingConfigPda] = getSharingConfigForMint(mintPubkey)
    const [bondingCurvePda] = getBondingCurveForMint(mintPubkey)
    const [creatorVaultPda] = getCreatorVaultForSharingConfig(sharingConfigPda)

    // Account layout from inspected tx 3Ba9NTWCnHV2Ku6wSKfJfhsKuMM592hkyhh7C9ykpovD
    const keys = [
      { pubkey: PFEE_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEES_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: sellerPubkey, isSigner: true, isWritable: true },
      { pubkey: PFEE_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: mintPubkey, isSigner: false, isWritable: false },
      { pubkey: sharingConfigPda, isSigner: false, isWritable: true },
      { pubkey: bondingCurvePda, isSigner: false, isWritable: true },
      { pubkey: creatorVaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_AMM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: PUMP_AMM_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: WSOL_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]

    const ix = new TransactionInstruction({
      programId: PUMP_FEES_PROGRAM_ID,
      keys,
      data: instructionData,
    })

    const transaction = new Transaction()
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 250_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
      ix
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
      { transactionBase64, blockhash, lastValidBlockHeight },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[redirect-fees-to-buyer] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
