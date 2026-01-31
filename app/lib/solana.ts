import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token'
import { calculateListingFee } from './tier-check'

const connection = new Connection(
  process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
)

/**
 * Create listing with fee payment
 */
export async function createListingWithPayment(
  wallet: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  listingData: {
    title: string
    description: string
    category: string
    price: number
    priceToken: 'SOL' | 'USDC'
    images: string[]
    launchToken?: boolean
    tokenName?: string
    tokenSymbol?: string
  }
): Promise<{ success: boolean; listingId?: string; error?: string }> {
  try {
    // Calculate fee based on tier
    const fee = await calculateListingFee(wallet.toString(), connection)
    
    // Create transaction
    const transaction = new Transaction()
    
    // Add fee payment to app wallet
    const appWallet = new PublicKey(
      process.env.NEXT_PUBLIC_APP_WALLET || '11111111111111111111111111111111'
    )
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet,
        toPubkey: appWallet,
        lamports: fee * LAMPORTS_PER_SOL,
      })
    )

    // Sign and send transaction
    const signed = await signTransaction(transaction)
    const signature = await connection.sendRawTransaction(signed.serialize())
    await connection.confirmTransaction(signature)

    // Launch token if requested
    let tokenMint = null
    if (listingData.launchToken && listingData.tokenName && listingData.tokenSymbol) {
      tokenMint = await launchListingToken(wallet, signTransaction, listingData)
    }

    return {
      success: true,
      listingId: signature // Use transaction signature as temporary ID
    }
  } catch (error: any) {
    console.error('Error creating listing:', error)
    return {
      success: false,
      error: error.message || 'Failed to create listing'
    }
  }
}

/**
 * Launch a token for a listing
 */
async function launchListingToken(
  wallet: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  listingData: { tokenName?: string; tokenSymbol?: string }
): Promise<PublicKey> {
  try {
    const mint = await createMint(
      connection,
      wallet, // payer
      wallet, // mint authority
      null,   // freeze authority (null = no freeze)
      9       // decimals
    )

    // Create associated token account and mint initial supply
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mint,
      wallet
    )

    // Mint initial supply (1 billion tokens)
    await mintTo(
      connection,
      wallet,
      mint,
      tokenAccount.address,
      wallet,
      1_000_000_000 * (10 ** 9)
    )

    return mint
  } catch (error) {
    console.error('Error launching token:', error)
    throw error
  }
}

/**
 * Create payment transaction (Solana Pay style)
 * NOTE: Simplified escrow - production should use a Solana program with PDA
 */
export async function createPaymentTransaction(
  buyerWallet: PublicKey,
  sellerWallet: PublicKey,
  amount: number,
  token: 'SOL' | 'USDC' = 'SOL'
): Promise<Transaction> {
  const transaction = new Transaction()
  
  if (token === 'SOL') {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: buyerWallet,
        toPubkey: sellerWallet,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    )
  } else {
    // USDC handling would go here
    // For now, SOL only
    throw new Error('USDC payments not yet implemented')
  }

  return transaction
}

export { connection }
