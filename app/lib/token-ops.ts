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
const PUMP_IPFS = 'https://pump.fun/api/ipfs'

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

  // 1. Upload metadata to pump.fun IPFS
  const formData = new FormData()
  formData.append('name', tokenName)
  formData.append('symbol', tokenSymbol)
  formData.append('description', options.description || `Token for listing on $FSBD`)
  formData.append('showName', 'true')
  if (options.imageFile) {
    formData.append('file', options.imageFile)
  } else if (options.imageUrl) {
    // Pump.fun IPFS expects file; fetch and add as blob
    const imgRes = await fetch(options.imageUrl)
    const blob = await imgRes.blob()
    const ext = options.imageUrl.split('.').pop()?.split('?')[0] || 'png'
    formData.append('file', blob, `image.${ext}`)
  } else {
    throw new Error('Token launch requires at least one image. Add an image to your listing first.')
  }

  const ipfsRes = await fetch(PUMP_IPFS, { method: 'POST', body: formData })
  if (!ipfsRes.ok) {
    const err = await ipfsRes.text()
    throw new Error(`Pump.fun IPFS upload failed: ${err}`)
  }
  const ipfsJson = await ipfsRes.json()
  const metadataUri = ipfsJson.metadataUri || ipfsJson.uri
  if (!metadataUri) throw new Error('No metadata URI from pump.fun')

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
  const sig = await connection.sendTransaction(signed as VersionedTransaction)
  await connection.confirmTransaction(sig)

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
    const { blockhash } = await connection.getLatestBlockhash('finalized')
    transaction.recentBlockhash = blockhash
    transaction.feePayer = wallet

    transaction.partialSign(mintKeypair)

    if (!signTransaction) throw new Error('Wallet signTransaction is not available')
    const signed = await signTransaction(transaction)
    const signature = await connection.sendRawTransaction(signed.serialize())
    await connection.confirmTransaction(signature)

    return mint.toString()
  } catch (error) {
    console.error('Error creating listing token:', error)
    throw error
  }
}
