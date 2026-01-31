import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Transaction,
  LAMPORTS_PER_SOL,
  Keypair
} from '@solana/web3.js'
import { 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  getMint
} from '@solana/spl-token'
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer, createTransferInstruction } from '@solana/spl-token'
import { WalletContextState } from '@solana/wallet-adapter-react'

// Mock dev wallet for testing (replace with actual dev wallet keypair in production)
const DEV_WALLET_SECRET = process.env.NEXT_PUBLIC_DEV_WALLET_SECRET || ''
let devWallet: Keypair | null = null

if (DEV_WALLET_SECRET) {
  try {
    devWallet = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(DEV_WALLET_SECRET))
    )
  } catch (e) {
    console.warn('Dev wallet not configured')
  }
}

// Mock program ID (use your app's if deploying a program; else SystemProgram for basic)
// In production, deploy a proper escrow program
const PROGRAM_ID = SystemProgram.programId

/**
 * Create PDA for bid escrow
 * Seeds: [escrow, listingId, bidderPubkey]
 */
export async function createBidEscrowPDA(
  listingId: string,
  bidder: PublicKey
): Promise<PublicKey> {
  const seeds = [
    Buffer.from('escrow'),
    Buffer.from(listingId),
    bidder.toBuffer()
  ]
  const [pda] = await PublicKey.findProgramAddress(seeds, PROGRAM_ID)
  return pda
}

/**
 * Derive PDA for auction escrow (backwards compatible)
 * Seeds: [listingId, bidderPubkey]
 */
export async function deriveEscrowPDA(
  listingId: string,
  bidderPubkey: PublicKey,
  programId?: PublicKey
): Promise<[PublicKey, number]> {
  const programIdToUse = programId || PROGRAM_ID
  
  const seeds = [
    Buffer.from('escrow'),
    Buffer.from(listingId),
    bidderPubkey.toBuffer()
  ]
  
  return PublicKey.findProgramAddressSync(seeds, programIdToUse)
}

/**
 * Create SPL token for auction listing
 * Mints 90% to seller, 10% to dev wallet
 */
export async function createAuctionToken(
  connection: Connection,
  seller: PublicKey,
  signTransaction: WalletContextState['signTransaction'],
  tokenName: string,
  tokenSymbol: string,
  listingId: string
): Promise<{ mint: PublicKey; sellerAmount: bigint; devAmount: bigint }> {
  // Create mint
  const mint = await createMint(
    connection,
    seller, // payer
    seller, // mint authority
    null,   // freeze authority
    9       // decimals
  )

  const totalSupply = BigInt(1_000_000_000) * BigInt(10 ** 9) // 1B tokens
  const sellerAmount = (totalSupply * BigInt(90)) / BigInt(100) // 90%
  const devAmount = totalSupply - sellerAmount // 10%

  // Create seller token account
  const sellerTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    seller,
    mint,
    seller
  )

  // Mint seller's portion
  await mintTo(
    connection,
    seller,
    mint,
    sellerTokenAccount.address,
    seller,
    sellerAmount
  )

  // Create dev token account and mint dev's portion
  if (devWallet) {
    const devTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      seller, // payer
      mint,
      devWallet.publicKey
    )

    await mintTo(
      connection,
      seller,
      mint,
      devTokenAccount.address,
      seller,
      devAmount
    )
  }

  return { mint, sellerAmount, devAmount }
}

/**
 * Simulate dev buy of tokens (mock transaction)
 * Transfers SOL from dev wallet to buy tokens based on item value
 */
export async function simulateDevBuy(
  connection: Connection,
  tokenMint: PublicKey,
  seller: PublicKey,
  itemValue: number // in SOL
): Promise<string | null> {
  if (!devWallet) {
    console.warn('Dev wallet not configured, skipping dev buy simulation')
    return null
  }

  try {
    // Calculate buy amount: 0.1 SOL base, scale by item value
    let buyAmountSOL = 0.1
    if (itemValue > 1) {
      buyAmountSOL = 0.2 // Scale up for higher value items
    }

    const buyAmountLamports = buyAmountSOL * LAMPORTS_PER_SOL

    // Check dev wallet balance
    const balance = await connection.getBalance(devWallet.publicKey)
    if (balance < buyAmountLamports) {
      console.warn('Dev wallet insufficient balance for buy simulation')
      return null
    }

    // Get token accounts
    const devTokenAccount = await getAssociatedTokenAddress(tokenMint, devWallet.publicKey)
    const sellerTokenAccount = await getAssociatedTokenAddress(tokenMint, seller)

    // Calculate token amount to buy (simple: 1 SOL = 10M tokens)
    const tokenAmount = BigInt(Math.floor(buyAmountSOL * 10_000_000)) * BigInt(10 ** 9)

    // Create transaction: SOL transfer + token transfer
    const transaction = new Transaction()

    // Transfer SOL to seller
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: devWallet.publicKey,
        toPubkey: seller,
        lamports: buyAmountLamports,
      })
    )

    // Transfer tokens from seller to dev (simulating purchase)
    // Note: In production, this would be a proper swap/DEX interaction
    // For now, we'll just simulate the SOL transfer
    // The actual token transfer would require seller's signature in a real scenario

    // Sign and send (dev wallet signs)
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    transaction.feePayer = devWallet.publicKey
    transaction.sign(devWallet)

    const signature = await connection.sendRawTransaction(transaction.serialize())
    await connection.confirmTransaction(signature)

    console.log(`Dev buy simulated: ${buyAmountSOL} SOL for listing`)
    return signature
  } catch (error) {
    console.error('Error simulating dev buy:', error)
    return null
  }
}

/**
 * Place bid transaction: User sends amount to PDA (escrow hold)
 * Supports both SOL and SPL tokens (USDC, etc.)
 */
export async function placeBidTx(
  listingId: string,
  bidder: PublicKey,
  amount: number, // in native units (SOL lamports or token amount)
  token: 'SOL' | 'USDC' | string = 'SOL',
  connection: Connection
): Promise<Transaction> {
  const escrowPda = await createBidEscrowPDA(listingId, bidder)
  const transaction = new Transaction()

  if (token === 'SOL') {
    // SOL transfer to PDA
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: bidder,
        toPubkey: escrowPda,
        lamports: amount, // amount already in lamports
      })
    )
  } else {
    // SPL token transfer (USDC or other)
    const tokenMint = new PublicKey(token)
    const bidderAta = await getAssociatedTokenAddress(tokenMint, bidder)
    const escrowAta = getAssociatedTokenAddressSync(tokenMint, escrowPda, true) // allow PDA as owner

    // Get token decimals for proper amount conversion
    const mintInfo = await getMint(connection, tokenMint)
    const amountInSmallestUnit = BigInt(Math.floor(amount * (10 ** mintInfo.decimals)))

    // Check if escrow ATA exists, create if not
    try {
      await getAccount(connection, escrowAta)
    } catch {
      // ATA doesn't exist, need to create it
      // Note: In a real program, the program would handle this
      // For now, we'll add instruction to create it (may fail if PDA can't sign)
      // This will work if the PDA can be used as owner (requires program in production)
      transaction.add(
        createAssociatedTokenAccountIdempotentInstruction(
          bidder, // payer
          escrowAta, // ATA address
          escrowPda, // owner (PDA)
          tokenMint // mint
        )
      )
    }

    transaction.add(
      createTransferInstruction(
        bidderAta,
        escrowAta,
        bidder,
        amountInSmallestUnit
      )
    )
  }

  return transaction
}

/**
 * Create bid escrow PDA and transfer funds (wrapper for compatibility)
 */
export async function createBidEscrow(
  connection: Connection,
  bidder: PublicKey,
  signTransaction: WalletContextState['signTransaction'],
  listingId: string,
  bidAmount: number, // in human-readable units (SOL or USDC)
  token: 'SOL' | 'USDC' = 'SOL'
): Promise<{ pda: PublicKey; signature: string }> {
  // Get token mint if USDC
  let tokenMint: PublicKey | null = null
  if (token === 'USDC') {
    // Devnet USDC mint (replace with actual if different)
    tokenMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU') // Devnet USDC
  }

  // Convert amount to lamports/token units
  let amountInUnits: number
  if (token === 'SOL') {
    amountInUnits = bidAmount * LAMPORTS_PER_SOL
  } else if (tokenMint) {
    // Get actual decimals from mint
    const mintInfo = await getMint(connection, tokenMint)
    amountInUnits = bidAmount * (10 ** mintInfo.decimals)
  } else {
    throw new Error('USDC mint not configured')
  }

  // Create transaction
  const transaction = await placeBidTx(
    listingId,
    bidder,
    amountInUnits,
    token === 'SOL' ? 'SOL' : (tokenMint?.toString() || 'SOL'),
    connection
  )

  // Sign and send
  const signed = await signTransaction(transaction)
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(signature)

  const pda = await createBidEscrowPDA(listingId, bidder)
  return { pda, signature }
}

/**
 * Check if auction has ended
 */
export async function isAuctionEnded(
  connection: Connection,
  endTime: number // Unix timestamp
): Promise<boolean> {
  const slot = await connection.getSlot()
  const blockTime = await connection.getBlockTime(slot)
  if (!blockTime) return false
  
  return blockTime >= endTime
}

/**
 * Release escrow funds to seller (after auction ends)
 * @deprecated Use releaseEscrowToSellerTx from escrow-release.ts instead
 */
export async function releaseEscrowToSeller(
  connection: Connection,
  escrowPDA: PublicKey,
  seller: PublicKey,
  listingId: string
): Promise<string | null> {
  console.warn('Escrow release requires Solana program - use releaseEscrowToSellerTx instead')
  return null
}

/**
 * Refund bidder (if outbid or auction ended)
 * @deprecated Use refundBidderTx from escrow-release.ts instead
 */
export async function refundBidder(
  connection: Connection,
  escrowPDA: PublicKey,
  bidder: PublicKey,
  amount: number
): Promise<string | null> {
  console.warn('Bidder refund requires Solana program - use refundBidderTx instead')
  return null
}

// Tokens for utility only, not investment
// This is a utility token for marketplace access, not a financial instrument
