import { PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js'
import { Connection } from '@solana/web3.js'
import { 
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint
} from '@solana/spl-token'
import { WalletContextState } from '@solana/wallet-adapter-react'

/**
 * Create a simple SPL token for a listing
 * Basic implementation - no Pump.fun integration
 */
export async function createListingToken(
  wallet: PublicKey,
  signTransaction: WalletContextState['signTransaction'],
  connection: Connection,
  tokenName: string,
  tokenSymbol: string
): Promise<string> {
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
        BigInt(1_000_000_000) * BigInt(10 ** 9) // 1B tokens with 9 decimals
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

    return mint.toString()
  } catch (error) {
    console.error('Error creating listing token:', error)
    throw error
  }
}
