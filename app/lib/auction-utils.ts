import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Transaction,
  LAMPORTS_PER_SOL,
  Keypair,
  ComputeBudgetProgram
} from '@solana/web3.js'
import { 
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  createInitializeMint2Instruction,
  createMintToInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint
} from '@solana/spl-token'
import { transfer, createTransferInstruction } from '@solana/spl-token'
import { WalletContextState } from '@solana/wallet-adapter-react'

// Dev wallet PUBLIC address only - safe to expose (it's a public key, not a secret).
// NEVER use NEXT_PUBLIC_* for private keys or keypairs.
const DEV_WALLET_ADDRESS = process.env.NEXT_PUBLIC_DEV_WALLET_ADDRESS || process.env.DEV_WALLET_ADDRESS || ''
let devWalletPubkey: PublicKey | null = null
if (DEV_WALLET_ADDRESS) {
  try {
    devWalletPubkey = new PublicKey(DEV_WALLET_ADDRESS)
  } catch {
    devWalletPubkey = null
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
  // Generate mint keypair
  const mintKeypair = Keypair.generate()
  const mint = mintKeypair.publicKey

  const totalSupply = BigInt(1_000_000_000) * BigInt(10 ** 9) // 1B tokens
  const sellerAmount = (totalSupply * BigInt(90)) / BigInt(100) // 90%
  const devAmount = totalSupply - sellerAmount // 10%

  // Ensure seller has enough SOL (mint rent + 2 ATAs + fees ~0.015 SOL)
  const minLamports = 0.02 * LAMPORTS_PER_SOL
  const balance = await connection.getBalance(seller)
  if (balance < minLamports) {
    throw new Error(`Insufficient SOL. Need ~0.02 SOL for token creation. Your balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL.`)
  }

  // Get rent exemption for mint account
  const lamports = await getMinimumBalanceForRentExemptMint(connection)

  // Build transaction to create and initialize mint
  const transaction = new Transaction()

  // Add compute budget (avoids simulation failures from default limit)
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 })
  )
  
  // Create mint account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: seller,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    })
  )

  // Initialize mint
  transaction.add(
    createInitializeMint2Instruction(
      mint,
      9, // decimals
      seller, // mint authority
      null   // freeze authority
    )
  )

  // Get seller's associated token account address
  const sellerTokenAccount = getAssociatedTokenAddressSync(mint, seller)
  
  // Create seller's associated token account (idempotent - no-op if exists)
  transaction.add(
    createAssociatedTokenAccountIdempotentInstruction(
      seller, // payer
      sellerTokenAccount, // ATA address
      seller, // owner
      mint // mint
    )
  )

  // Mint seller's portion
  transaction.add(
    createMintToInstruction(
      mint,
      sellerTokenAccount,
      seller, // mint authority
      sellerAmount
    )
  )

  // Create dev token account and mint dev's portion if dev wallet address configured (public key only)
  if (devWalletPubkey) {
    const devTokenAccount = getAssociatedTokenAddressSync(mint, devWalletPubkey)
    
    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(
        seller, // payer
        devTokenAccount, // ATA address
        devWalletPubkey, // owner
        mint // mint
      )
    )

    transaction.add(
      createMintToInstruction(
        mint,
        devTokenAccount,
        seller, // mint authority
        devAmount
      )
    )
  }

  // Set blockhash and feePayer BEFORE any signing (required for valid transaction)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  transaction.recentBlockhash = blockhash
  transaction.feePayer = seller

  // Sign transaction (mint keypair needs to sign the createAccount instruction)
  transaction.partialSign(mintKeypair)

  // Sign with wallet and send
  if (!signTransaction) {
    throw new Error('Wallet signTransaction is not available')
  }
  const signed = await signTransaction(transaction)
  const serialized = signed.serialize()
  let signature: string
  try {
    signature = await connection.sendRawTransaction(serialized, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 5,
    })
  } catch (simErr) {
    // Retry with skipPreflight when simulation fails (RPC can be overly strict)
    signature = await connection.sendRawTransaction(serialized, {
      skipPreflight: true,
      preflightCommitment: 'confirmed',
      maxRetries: 5,
    })
  }
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight })

  return { mint, sellerAmount, devAmount }
}

/**
 * Simulate dev buy of tokens (mock transaction).
 * SECURITY: Requires dev wallet private key to sign - must run server-side only.
 * In client, this is a no-op (returns null). Use POST /api/auction/simulate-dev-buy for server-side execution.
 */
export async function simulateDevBuy(
  connection: Connection,
  tokenMint: PublicKey,
  seller: PublicKey,
  itemValue: number // in SOL
): Promise<string | null> {
  // Never load or use private keys in client bundle
  if (typeof window !== 'undefined') {
    return null
  }
  // Server-side: would require API route with DEV_WALLET_SECRET (never NEXT_PUBLIC_)
  return null
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
  if (!signTransaction) {
    throw new Error('Wallet signTransaction is not available')
  }
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
