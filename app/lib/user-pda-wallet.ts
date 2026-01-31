/**
 * User PDA Escrow Wallet System
 * 
 * Each user gets a unique PDA that acts as their escrow wallet.
 * Only the user (via Solana program) can withdraw from this PDA.
 * Funds are held here until all obligations are met (items shipped, purchases completed).
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

// Program ID for user PDA derivation
// NOTE: In production, this should be a deployed Solana program ID
const USER_PDA_PROGRAM_ID = SystemProgram.programId

/**
 * Create PDA for user's escrow wallet
 * Seeds: ['user-escrow', walletAddress]
 * This creates a unique escrow wallet for each user
 */
export async function createUserEscrowPDA(
  userWalletAddress: string
): Promise<PublicKey> {
  const userPubkey = new PublicKey(userWalletAddress)
  const seeds = [
    Buffer.from('user-escrow'),
    userPubkey.toBuffer()
  ]
  const [pda] = await PublicKey.findProgramAddress(seeds, USER_PDA_PROGRAM_ID)
  return pda
}

/**
 * Get user's escrow PDA address (synchronous version for database storage)
 */
export function getUserEscrowPDAAddress(userWalletAddress: string): string {
  // This is a placeholder - actual PDA derivation requires async PublicKey.findProgramAddress
  // In practice, you'd derive this on the backend or cache it in the database
  // For now, return a placeholder that will be replaced with actual PDA
  return `user-escrow-${userWalletAddress.slice(0, 8)}...`
}

/**
 * Transfer funds to user's escrow PDA
 * Used when buyer purchases an item - funds go to seller's escrow PDA
 */
export async function transferToUserEscrowTx(
  fromWallet: PublicKey,
  toUserWalletAddress: string, // Seller's wallet address
  amount: number,
  token: 'SOL' | 'USDC' | string,
  connection: Connection
): Promise<{ transaction: Transaction; escrowPda: PublicKey }> {
  const escrowPda = await createUserEscrowPDA(toUserWalletAddress)
  const transaction = new Transaction()

  if (token === 'SOL') {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: fromWallet,
        toPubkey: escrowPda,
        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
      })
    )
  } else {
    // SPL token transfer
    const mintPublicKey = new PublicKey(token)
    const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromWallet)
    const escrowTokenAccount = getAssociatedTokenAddressSync(mintPublicKey, escrowPda, true)
    
    const mintInfo = await getMint(connection, mintPublicKey)
    const decimals = mintInfo.decimals
    const amountBigInt = BigInt(Math.floor(amount * (10 ** decimals)))
    
    // Ensure escrow token account exists
    try {
      await getAccount(connection, escrowTokenAccount)
    } catch {
      transaction.add(
        createAssociatedTokenAccountIdempotentInstruction(
          fromWallet,
          escrowTokenAccount,
          escrowPda,
          mintPublicKey
        )
      )
    }
    
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        escrowTokenAccount,
        fromWallet,
        amountBigInt
      )
    )
  }

  return { transaction, escrowPda }
}

/**
 * Get balance in user's escrow PDA
 */
export async function getUserEscrowBalance(
  connection: Connection,
  userWalletAddress: string,
  token: 'SOL' | 'USDC' | string = 'SOL'
): Promise<number> {
  const escrowPda = await createUserEscrowPDA(userWalletAddress)

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
 * Check if user can withdraw from escrow
 * Returns true only if:
 * - All items sold are shipped
 * - All purchases made are completed
 * - No pending disputes
 */
export async function canUserWithdraw(
  userWalletAddress: string,
  supabase: any
): Promise<{ canWithdraw: boolean; reason?: string; pendingItems?: number }> {
  if (!supabase) {
    return { canWithdraw: false, reason: 'Database not available' }
  }

  const walletHash = await import('@/lib/supabase').then(m => m.hashWalletAddress(userWalletAddress))

  // Check for unshipped items (seller)
  const { data: unshippedListings } = await supabase
    .from('listings')
    .select('id, title, escrow_status')
    .eq('wallet_address_hash', walletHash)
    .in('escrow_status', ['pending', 'in_escrow'])
    .neq('status', 'completed')

  if (unshippedListings && unshippedListings.length > 0) {
    return {
      canWithdraw: false,
      reason: `You have ${unshippedListings.length} item(s) that need to be shipped`,
      pendingItems: unshippedListings.length
    }
  }

  // Check for incomplete purchases (buyer)
  const { data: incompletePurchases } = await supabase
    .from('listings')
    .select('id, title, escrow_status')
    .eq('buyer_wallet_address', userWalletAddress)
    .in('escrow_status', ['pending', 'shipped'])
    .neq('status', 'completed')

  if (incompletePurchases && incompletePurchases.length > 0) {
    return {
      canWithdraw: false,
      reason: `You have ${incompletePurchases.length} purchase(s) pending receipt confirmation`,
      pendingItems: incompletePurchases.length
    }
  }

  // Check for disputes
  const { data: disputes } = await supabase
    .from('listings')
    .select('id')
    .or(`wallet_address_hash.eq.${walletHash},buyer_wallet_address.eq.${userWalletAddress}`)
    .eq('escrow_status', 'disputed')

  if (disputes && disputes.length > 0) {
    return {
      canWithdraw: false,
      reason: `You have ${disputes.length} disputed transaction(s)`,
      pendingItems: disputes.length
    }
  }

  return { canWithdraw: true }
}

/**
 * Withdraw funds from user's escrow PDA
 * NOTE: Requires Solana program to actually release funds
 */
export async function withdrawFromUserEscrowTx(
  userWalletAddress: string,
  amount: number,
  token: 'SOL' | 'USDC' | string,
  connection: Connection
): Promise<Transaction> {
  const escrowPda = await createUserEscrowPDA(userWalletAddress)
  const userPubkey = new PublicKey(userWalletAddress)
  const transaction = new Transaction()

  if (token === 'SOL') {
    // NOTE: In production, this would be a program instruction
    // The program would validate that user can withdraw (all obligations met)
    throw new Error(
      'Withdrawal requires Solana program. ' +
      'The program must validate that all items are shipped and purchases completed.'
    )
  } else {
    const tokenMint = new PublicKey(token)
    const escrowAta = getAssociatedTokenAddressSync(tokenMint, escrowPda, true)
    const userAta = await getAssociatedTokenAddress(tokenMint, userPubkey)
    const mintInfo = await getMint(connection, tokenMint)
    const amountBigInt = BigInt(Math.floor(amount * (10 ** mintInfo.decimals)))
    
    // NOTE: In production, this would be a program instruction
    throw new Error(
      'Withdrawal requires Solana program. ' +
      'The program must validate that all items are shipped and purchases completed.'
    )
  }

  return transaction
}
