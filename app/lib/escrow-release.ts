import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getAssociatedTokenAddress, createTransferInstruction, getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token'
import { createBidEscrowPDA } from './auction-utils'

/**
 * Release escrow to seller (after auction ends)
 * Note: This requires a Solana program in production.
 * For MVP, this is a placeholder showing the pattern.
 */
export async function releaseEscrowToSellerTx(
  listingId: string,
  bidder: PublicKey,
  seller: PublicKey,
  amount: number, // in native units (SOL or token amount)
  token: 'SOL' | 'USDC' | string = 'SOL',
  connection: Connection
): Promise<Transaction> {
  const escrowPda = await createBidEscrowPDA(listingId, bidder)
  const transaction = new Transaction()

  if (token === 'SOL') {
    // In a real program, this would be a program instruction
    // For now, this is a placeholder - actual release requires program
    // transaction.add(
    //   SystemProgram.transfer({
    //     fromPubkey: escrowPda,
    //     toPubkey: seller,
    //     lamports: amount,
    //   })
    // )
    throw new Error('Escrow release requires Solana program - not implemented yet')
  } else {
    // SPL token transfer
    const tokenMint = new PublicKey(token)
    const escrowAta = getAssociatedTokenAddressSync(tokenMint, escrowPda, true)
    const sellerAta = await getAssociatedTokenAddress(tokenMint, seller)

    // In a real program, this would be a program instruction
    // transaction.add(
    //   createTransferInstruction(
    //     escrowAta,
    //     sellerAta,
    //     escrowPda, // owner (PDA signs via program)
    //     BigInt(amount)
    //   )
    // )
    throw new Error('Escrow release requires Solana program - not implemented yet')
  }

  return transaction
}

/**
 * Refund bidder (if outbid or auction ended without meeting reserve)
 */
export async function refundBidderTx(
  listingId: string,
  bidder: PublicKey,
  amount: number,
  token: 'SOL' | 'USDC' | string = 'SOL',
  connection: Connection
): Promise<Transaction> {
  const escrowPda = await createBidEscrowPDA(listingId, bidder)
  const transaction = new Transaction()

  if (token === 'SOL') {
    // In a real program, this would transfer from PDA back to bidder
    throw new Error('Bidder refund requires Solana program - not implemented yet')
  } else {
    // SPL token refund
    throw new Error('Bidder refund requires Solana program - not implemented yet')
  }

  return transaction
}

/**
 * Get escrow balance (for checking if funds are held)
 */
export async function getEscrowBalance(
  connection: Connection,
  listingId: string,
  bidder: PublicKey,
  token: 'SOL' | 'USDC' | string = 'SOL'
): Promise<number> {
  const escrowPda = await createBidEscrowPDA(listingId, bidder)

  if (token === 'SOL') {
    const balance = await connection.getBalance(escrowPda)
    return balance / LAMPORTS_PER_SOL
  } else {
    const tokenMint = new PublicKey(token)
    const escrowAta = getAssociatedTokenAddressSync(tokenMint, escrowPda, true)
    try {
      const account = await getAccount(connection, escrowAta)
      return Number(account.amount) / (10 ** account.mint.decimals)
    } catch {
      return 0
    }
  }
}
