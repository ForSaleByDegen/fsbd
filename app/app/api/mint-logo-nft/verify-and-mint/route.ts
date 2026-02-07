/**
 * POST /api/mint-logo-nft/verify-and-mint
 * Verifies a payment tx, then mints the logo NFT to the user.
 * Body: { txSignature: string, wallet: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplTokenMetadata, createNft } from '@metaplex-foundation/mpl-token-metadata'
import { generateSigner, keypairIdentity, createSignerFromKeypair, percentAmount } from '@metaplex-foundation/umi'
import * as fs from 'fs'
import * as path from 'path'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const SIG_REGEX = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/
const LAMPORTS_PER_SOL = 1e9
const REQUIRED_LAMPORTS = Math.floor(0.01 * LAMPORTS_PER_SOL)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const txSignature = typeof body.txSignature === 'string' ? body.txSignature.trim() : ''
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''

    if (!txSignature || !SIG_REGEX.test(txSignature)) {
      return NextResponse.json({ error: 'Invalid transaction signature' }, { status: 400 })
    }
    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
    }

    const treasury = process.env.LOGO_NFT_TREASURY?.trim()
    const metadataUri = process.env.LOGO_NFT_METADATA_URI?.trim()
    if (!treasury || !metadataUri) {
      return NextResponse.json(
        { error: 'Logo NFT not configured (LOGO_NFT_TREASURY, LOGO_NFT_METADATA_URI)' },
        { status: 503 }
      )
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl)

    // Retry: RPC may not have indexed the tx immediately after confirmation
    let tx: Awaited<ReturnType<Connection['getParsedTransaction']>> = null
    for (let attempt = 0; attempt < 5; attempt++) {
      tx = await connection.getParsedTransaction(txSignature, { maxSupportedTransactionVersion: 0 })
      if (tx?.meta) break
      await new Promise((r) => setTimeout(r, 2000))
    }
    if (!tx?.meta) {
      return NextResponse.json({
        error: 'Transaction not found or not yet confirmed. Wait a minute and click Try again.',
      }, { status: 400 })
    }
    if (tx.meta.err) {
      return NextResponse.json({ error: 'Transaction failed' }, { status: 400 })
    }

    const walletPubkey = new PublicKey(wallet)
    const treasuryPubkey = new PublicKey(treasury)
    const accountKeys = tx.transaction.message.accountKeys

    const walletIndex = accountKeys.findIndex(
      (k) => 'pubkey' in k && k.pubkey.equals(walletPubkey)
    )
    const treasuryIndex = accountKeys.findIndex(
      (k) => 'pubkey' in k && k.pubkey.equals(treasuryPubkey)
    )
    if (walletIndex < 0 || treasuryIndex < 0) {
      return NextResponse.json({ error: 'Transaction does not involve the expected wallets' }, { status: 400 })
    }

    const preBalances = tx.meta.preBalances || []
    const postBalances = tx.meta.postBalances || []
    const treasuryDelta = (postBalances[treasuryIndex] || 0) - (preBalances[treasuryIndex] || 0)
    if (treasuryDelta < REQUIRED_LAMPORTS) {
      return NextResponse.json(
        { error: `Payment too low. Required ${REQUIRED_LAMPORTS / LAMPORTS_PER_SOL} SOL` },
        { status: 400 }
      )
    }

    const keypairEnv = process.env.MINT_LOGO_KEYPAIR || process.env.TREE_CREATOR_KEYPAIR
    const keypairPath = process.env.KEYPAIR_PATH
    let secretKey: Uint8Array
    if (keypairEnv) {
      secretKey = new Uint8Array(JSON.parse(keypairEnv) as number[])
    } else if (keypairPath) {
      const fullPath = path.resolve(process.cwd(), keypairPath)
      secretKey = new Uint8Array(JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as number[])
    } else {
      return NextResponse.json({ error: 'Mint keypair not configured' }, { status: 503 })
    }

    const umi = createUmi(rpcUrl).use(mplTokenMetadata())
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey)
    umi.use(keypairIdentity(createSignerFromKeypair(umi, umiKeypair)))

    const mint = generateSigner(umi)

    await createNft(umi, {
      mint,
      name: 'FSBD Logo',
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(0),
    }).sendAndConfirm(umi)

    // Transfer NFT to user (createNft mints to umi.identity, we need to transfer)
    const { getAssociatedTokenAddress } = await import('@solana/spl-token')
    const fromAta = await getAssociatedTokenAddress(
      new PublicKey(mint.publicKey),
      new PublicKey(umi.identity.publicKey)
    )
    const toAta = await getAssociatedTokenAddress(
      new PublicKey(mint.publicKey),
      walletPubkey
    )

    const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token')

    const conn = new Connection(rpcUrl)
    const toAtaInfo = await conn.getAccountInfo(toAta)
    const needsAta = !toAtaInfo

    const transferTx = new Transaction()
    if (needsAta) {
      transferTx.add(
        createAssociatedTokenAccountInstruction(
          new PublicKey(umi.identity.publicKey),
          toAta,
          walletPubkey,
          new PublicKey(mint.publicKey)
        )
      )
    }

    const { createTransferInstruction } = await import('@solana/spl-token')
    transferTx.add(
      createTransferInstruction(
        fromAta,
        toAta,
        umi.identity.publicKey as unknown as PublicKey,
        1
      )
    )

    transferTx.feePayer = new PublicKey(umi.identity.publicKey)
    const { blockhash } = await conn.getLatestBlockhash('finalized')
    transferTx.recentBlockhash = blockhash

    const kp = Keypair.fromSecretKey(secretKey)
    transferTx.sign(kp)
    await conn.sendRawTransaction(transferTx.serialize())

    return NextResponse.json({
      ok: true,
      mint: mint.publicKey.toString(),
      message: 'NFT minted and sent to your wallet',
    })
  } catch (err) {
    console.error('[mint-logo-nft verify-and-mint]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
