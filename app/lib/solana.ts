import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js'
import { 
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint
} from '@solana/spl-token'
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
    // Generate mint keypair
    const mintKeypair = Keypair.generate()
    const mint = mintKeypair.publicKey

    // Get rent exemption for mint account
    const lamports = await getMinimumBalanceForRentExemptMint(connection)

    // Build transaction
    const transaction = new Transaction()
    
    // Create mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: wallet,
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
        wallet, // mint authority
        null   // freeze authority
      )
    )

    // Get associated token account address
    const tokenAccount = getAssociatedTokenAddressSync(mint, wallet)
    
    // Create associated token account
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet, // payer
        tokenAccount, // ATA address
        wallet, // owner
        mint // mint
      )
    )

    // Mint initial supply (1 billion tokens)
    transaction.add(
      createMintToInstruction(
        mint,
        tokenAccount,
        wallet, // mint authority
        BigInt(1_000_000_000) * BigInt(10 ** 9)
      )
    )

    // Sign transaction (mint keypair needs to sign the createAccount instruction)
    transaction.partialSign(mintKeypair)
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = wallet

    // Sign with wallet and send
    if (!signTransaction) {
      throw new Error('Wallet signTransaction is not available')
    }
    const signed = await signTransaction(transaction)
    const signature = await connection.sendRawTransaction(signed.serialize())
    await connection.confirmTransaction(signature)

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
