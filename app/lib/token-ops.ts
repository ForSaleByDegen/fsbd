import { PublicKey, Transaction, SystemProgram, Keypair, VersionedTransaction } from '@solana/web3.js'
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

const PUMP_TRADE_LOCAL = 'https://pumpportal.fun/api/trade-local'

/** Use our API proxy to avoid CORS (pump.fun blocks browser requests) */
async function uploadToPumpIpfs(
  tokenName: string,
  tokenSymbol: string,
  options: { imageFile?: File; imageUrl?: string; description?: string }
): Promise<string> {
  if (options.imageFile) {
    const formData = new FormData()
    formData.append('file', options.imageFile)
    formData.append('name', tokenName)
    formData.append('symbol', tokenSymbol)
    formData.append('description', options.description || `Token for listing on $FSBD`)

    const res = await fetch('/api/pump-ipfs', { method: 'POST', body: formData })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `IPFS upload failed (${res.status})`)
    }
    const data = await res.json()
    const uri = data.metadataUri || data.uri
    if (!uri) throw new Error('No metadata URI returned')
    return uri
  }
  if (options.imageUrl) {
    const res = await fetch('/api/pump-ipfs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: options.imageUrl,
        name: tokenName,
        symbol: tokenSymbol,
        description: options.description,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `IPFS upload failed (${res.status})`)
    }
    const data = await res.json()
    const uri = data.metadataUri || data.uri
    if (!uri) throw new Error('No metadata URI returned')
    return uri
  }
  throw new Error('Token launch requires an image. Add an image to your listing first.')
}

/** Create token via pump.fun (bonding curve, dev buy, pump.fun discoverability) */
export async function createPumpFunToken(
  wallet: PublicKey,
  signTransaction: WalletContextState['signTransaction'],
  connection: Connection,
  tokenName: string,
  tokenSymbol: string,
  options: {
    devBuySol?: number
    imageFile?: File
    imageUrl?: string
    description?: string
  } = {}
): Promise<string> {
  const mintKeypair = Keypair.generate()
  const devBuySol = options.devBuySol ?? 0.01

  // 1. Upload metadata via our proxy (avoids pump.fun CORS)
  if (!options.imageFile && !options.imageUrl) {
    throw new Error('Token launch requires an image. Add an image to your listing first.')
  }
  const metadataUri = await uploadToPumpIpfs(tokenName, tokenSymbol, {
    imageFile: options.imageFile,
    imageUrl: options.imageUrl,
    description: options.description,
  })

  // 2. Get create transaction from PumpPortal (no API key needed for trade-local)
  const body = {
    publicKey: wallet.toBase58(),
    action: 'create',
    tokenMetadata: { name: tokenName, symbol: tokenSymbol, uri: metadataUri },
    mint: mintKeypair.publicKey.toBase58(),
    denominatedInSol: 'true',
    amount: devBuySol,
    slippage: 10,
    priorityFee: 0.00005,
    pool: 'pump',
    isMayhemMode: 'false',
  }

  const txRes = await fetch(PUMP_TRADE_LOCAL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!txRes.ok) {
    const errText = await txRes.text()
    throw new Error(`Pump.fun create failed: ${errText}`)
  }

  const txBuffer = await txRes.arrayBuffer()
  const tx = VersionedTransaction.deserialize(new Uint8Array(txBuffer))

  // 3. Partial sign with mint keypair, then wallet signs
  tx.sign([mintKeypair])

  if (!signTransaction) throw new Error('Wallet signTransaction not available')
  const signed = await signTransaction(tx)
  const sig = await connection.sendTransaction(signed as VersionedTransaction, {
    skipPreflight: true,
    maxRetries: 5,
    preflightCommitment: 'confirmed',
  })
  await connection.confirmTransaction(sig, 'confirmed')

  return mintKeypair.publicKey.toBase58()
}

/**
 * Create a simple SPL token for a listing (fallback when pump.fun fails)
 * Sets blockhash and feePayer BEFORE partialSign to avoid "recentBlockhash required"
 */
export async function createListingToken(
  wallet: PublicKey,
  signTransaction: WalletContextState['signTransaction'],
  connection: Connection,
  tokenName: string,
  tokenSymbol: string
): Promise<string> {
  try {
    const mintKeypair = Keypair.generate()
    const mint = mintKeypair.publicKey

    const lamports = await getMinimumBalanceForRentExemptMint(connection)

    const transaction = new Transaction()
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: wallet,
        newAccountPubkey: mint,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      })
    )
    transaction.add(
      createInitializeMint2Instruction(mint, 9, wallet, null)
    )

    const tokenAccount = getAssociatedTokenAddressSync(mint, wallet)
    transaction.add(
      createAssociatedTokenAccountInstruction(wallet, tokenAccount, wallet, mint)
    )
    transaction.add(
      createMintToInstruction(
        mint,
        tokenAccount,
        wallet,
        BigInt(1_000_000_000) * BigInt(10 ** 9)
      )
    )

    // CRITICAL: Set blockhash and feePayer BEFORE partialSign (avoids "recentBlockhash required")
    // Use 'confirmed' for fresher blockhash; add retries for "Blockhash not found"
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    transaction.recentBlockhash = blockhash
    transaction.feePayer = wallet

    transaction.partialSign(mintKeypair)

    if (!signTransaction) throw new Error('Wallet signTransaction is not available')
    const signed = await signTransaction(transaction)
    const serialized = signed.serialize()
    const signature = await connection.sendRawTransaction(serialized, {
      skipPreflight: true,
      maxRetries: 5,
      preflightCommitment: 'confirmed',
    })
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')

    return mint.toString()
  } catch (error) {
    console.error('Error creating listing token:', error)
    throw error
  }
}
