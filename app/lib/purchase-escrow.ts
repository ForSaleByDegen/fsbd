/**
 * Purchase Escrow System
 * 
 * IMPORTANT LEGAL DISCLAIMER:
 * This escrow system facilitates peer-to-peer transactions on a decentralized platform.
 * The platform does NOT act as a money transmitter, custodian, or escrow agent.
 * Users are responsible for compliance with all applicable laws and regulations.
 * 
 * The platform provides technical infrastructure only - users transact directly with each other.
 * Funds are held in Program Derived Addresses (PDAs) on the Solana blockchain.
 * The platform cannot access or control these funds.
 * 
 * Users should consult legal counsel regarding:
 * - Money transmitter regulations
 * - Escrow service regulations
 * - Consumer protection laws
 * - Tax obligations
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import { 
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  getMint
} from '@solana/spl-token'

// Program ID for escrow PDA derivation
// NOTE: In production, this should be a deployed Solana program ID
// For now, using SystemProgram.programId as placeholder
// A real program is required to actually release funds from PDA
const ESCROW_PROGRAM_ID = SystemProgram.programId

/**
 * Create PDA for purchase escrow
 * Seeds: ['purchase-escrow', listingId, buyerPubkey]
 * This creates a unique escrow account for each purchase
 */
export async function createPurchaseEscrowPDA(
  listingId: string,
  buyer: PublicKey
): Promise<PublicKey> {
  const seeds = [
    Buffer.from('purchase-escrow'),
    Buffer.from(listingId),
    buyer.toBuffer()
  ]
  const [pda] = await PublicKey.findProgramAddress(seeds, ESCROW_PROGRAM_ID)
  return pda
}

/**
 * Create transaction to transfer purchase funds to escrow PDA
 * This is called when buyer purchases an item
 */
export async function createPurchaseEscrowTx(
  listingId: string,
  buyer: PublicKey,
  seller: PublicKey,
  amount: number, // Total purchase amount (including platform fee)
  platformFee: number, // Platform fee amount
  token: 'SOL' | 'USDC' | string,
  connection: Connection
): Promise<{ transaction: Transaction; escrowPda: PublicKey }> {
  const escrowPda = await createPurchaseEscrowPDA(listingId, buyer)
  const transaction = new Transaction()

  if (token === 'SOL') {
    // Transfer total amount (price + platform fee) to escrow PDA
    const totalLamports = Math.floor(amount * LAMPORTS_PER_SOL)
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: buyer,
        toPubkey: escrowPda,
        lamports: totalLamports,
      })
    )
  } else {
    // SPL token transfer to escrow
    const mintPublicKey = new PublicKey(token)
    const buyerTokenAccount = await getAssociatedTokenAddress(mintPublicKey, buyer)
    const escrowTokenAccount = getAssociatedTokenAddressSync(mintPublicKey, escrowPda, true)
    
    // Get token decimals
    const mintInfo = await getMint(connection, mintPublicKey)
    const decimals = mintInfo.decimals
    const totalAmount = BigInt(Math.floor(amount * (10 ** decimals)))
    
    // Ensure escrow token account exists
    try {
      await getAccount(connection, escrowTokenAccount)
    } catch {
      // Create escrow token account if it doesn't exist
      transaction.add(
        createAssociatedTokenAccountIdempotentInstruction(
          buyer, // payer
          escrowTokenAccount, // ATA address
          escrowPda, // owner (PDA)
          mintPublicKey // mint
        )
      )
    }
    
    // Transfer tokens to escrow
    transaction.add(
      createTransferInstruction(
        buyerTokenAccount,
        escrowTokenAccount,
        buyer,
        totalAmount
      )
    )
  }

  return { transaction, escrowPda }
}

/**
 * Get escrow balance for a purchase
 */
export async function getPurchaseEscrowBalance(
  connection: Connection,
  listingId: string,
  buyer: PublicKey,
  token: 'SOL' | 'USDC' | string = 'SOL'
): Promise<number> {
  const escrowPda = await createPurchaseEscrowPDA(listingId, buyer)

  if (token === 'SOL') {
    const balance = await connection.getBalance(escrowPda)
    return balance / LAMPORTS_PER_SOL
  } else {
    const tokenMint = new PublicKey(token)
    const escrowAta = getAssociatedTokenAddressSync(tokenMint, escrowPda, true)
    try {
      const account = await getAccount(connection, escrowAta)
      const mintInfo = await getMint(connection, tokenMint)
      return Number(account.amount) / (10 ** mintInfo.decimals)
    } catch {
      return 0
    }
  }
}

/**
 * Release first 50% to seller (when item is marked as shipped)
 * NOTE: This requires a Solana program in production to actually release from PDA
 * For MVP, this creates the transaction structure but actual release needs program
 */
export async function releaseFirstHalfToSellerTx(
  listingId: string,
  buyer: PublicKey,
  seller: PublicKey,
  totalAmount: number, // Total amount in escrow
  platformFee: number, // Platform fee (already deducted)
  token: 'SOL' | 'USDC' | string,
  connection: Connection
): Promise<Transaction> {
  const escrowPda = await createPurchaseEscrowPDA(listingId, buyer)
  const transaction = new Transaction()
  
  // Calculate amounts: 50% of (total - platform fee) goes to seller
  const sellerAmount = (totalAmount - platformFee) * 0.5

  if (token === 'SOL') {
    // NOTE: In production, this would be a program instruction
    // The program would validate that seller is the listing creator
    // and that the item has been marked as shipped
    // For MVP, this is a placeholder showing the structure
    throw new Error(
      'Escrow release requires Solana program. ' +
      'In production, deploy an escrow program that validates seller identity ' +
      'and escrow state before releasing funds.'
    )
  } else {
    const tokenMint = new PublicKey(token)
    const escrowAta = getAssociatedTokenAddressSync(tokenMint, escrowPda, true)
    const sellerAta = await getAssociatedTokenAddress(tokenMint, seller)
    const mintInfo = await getMint(connection, tokenMint)
    const sellerAmountBigInt = BigInt(Math.floor(sellerAmount * (10 ** mintInfo.decimals)))
    
    // NOTE: In production, this would be a program instruction
    throw new Error(
      'Escrow release requires Solana program. ' +
      'In production, deploy an escrow program that validates seller identity ' +
      'and escrow state before releasing funds.'
    )
  }

  return transaction
}

/**
 * Release remaining 50% to seller (when buyer confirms receipt)
 * NOTE: This requires a Solana program in production
 */
export async function releaseRemainingToSellerTx(
  listingId: string,
  buyer: PublicKey,
  seller: PublicKey,
  totalAmount: number,
  platformFee: number,
  token: 'SOL' | 'USDC' | string,
  connection: Connection
): Promise<Transaction> {
  const escrowPda = await createPurchaseEscrowPDA(listingId, buyer)
  const transaction = new Transaction()
  
  // Calculate remaining amount: 50% of (total - platform fee)
  const sellerAmount = (totalAmount - platformFee) * 0.5

  if (token === 'SOL') {
    // NOTE: In production, this would be a program instruction
    // The program would validate that buyer has confirmed receipt
    throw new Error(
      'Escrow release requires Solana program. ' +
      'In production, deploy an escrow program that validates buyer confirmation ' +
      'before releasing remaining funds.'
    )
  } else {
    const tokenMint = new PublicKey(token)
    const escrowAta = getAssociatedTokenAddressSync(tokenMint, escrowPda, true)
    const sellerAta = await getAssociatedTokenAddress(tokenMint, seller)
    const mintInfo = await getMint(connection, tokenMint)
    const sellerAmountBigInt = BigInt(Math.floor(sellerAmount * (10 ** mintInfo.decimals)))
    
    // NOTE: In production, this would be a program instruction
    throw new Error(
      'Escrow release requires Solana program. ' +
      'In production, deploy an escrow program that validates buyer confirmation ' +
      'before releasing remaining funds.'
    )
  }

  return transaction
}

/**
 * Refund buyer (if dispute or cancellation)
 * NOTE: This requires a Solana program in production
 */
export async function refundBuyerTx(
  listingId: string,
  buyer: PublicKey,
  totalAmount: number,
  token: 'SOL' | 'USDC' | string,
  connection: Connection
): Promise<Transaction> {
  const escrowPda = await createPurchaseEscrowPDA(listingId, buyer)
  const transaction = new Transaction()

  if (token === 'SOL') {
    // NOTE: In production, this would be a program instruction
    // The program would validate dispute resolution or cancellation
    throw new Error(
      'Escrow refund requires Solana program. ' +
      'In production, deploy an escrow program that handles disputes and refunds.'
    )
  } else {
    const tokenMint = new PublicKey(token)
    const escrowAta = getAssociatedTokenAddressSync(tokenMint, escrowPda, true)
    const buyerAta = await getAssociatedTokenAddress(tokenMint, buyer)
    
    // NOTE: In production, this would be a program instruction
    throw new Error(
      'Escrow refund requires Solana program. ' +
      'In production, deploy an escrow program that handles disputes and refunds.'
    )
  }

  return transaction
}
