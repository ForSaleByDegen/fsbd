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

/** Extended metadata for token (listing link, socials, banner) — uses custom Pinata metadata when provided */
export type TokenMetadataExtras = {
  externalUrl?: string
  website?: string
  twitter?: string
  telegram?: string
  discord?: string
  bannerUrl?: string
}

/** Use our API proxy to avoid CORS (pump.fun blocks browser requests).
 * Prefer imageUrl over imageFile to avoid 413 (Content Too Large) from Vercel's 4.5MB body limit.
 * When extras (externalUrl, socials, banner) are provided, uses /api/token-metadata for extended metadata. */
async function getMetadataUri(
  tokenName: string,
  tokenSymbol: string,
  options: {
    imageFile?: File
    imageUrl?: string
    description?: string
    extras?: TokenMetadataExtras
  }
): Promise<string> {
  const hasExtras = options.extras && (
    options.extras.externalUrl ||
    options.extras.website ||
    options.extras.twitter ||
    options.extras.telegram ||
    options.extras.discord ||
    options.extras.bannerUrl
  )

  if (hasExtras && options.imageUrl) {
    const res = await fetch('/api/token-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: tokenName,
        symbol: tokenSymbol,
        description: options.description || `Token for listing on $FSBD`,
        imageUrl: options.imageUrl,
        externalUrl: options.extras?.externalUrl,
        website: options.extras?.website,
        twitter: options.extras?.twitter,
        telegram: options.extras?.telegram,
        discord: options.extras?.discord,
        bannerUrl: options.extras?.bannerUrl,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      const uri = data.metadataUri || data.uri
      if (uri) return uri
    }
  }

  const desc = (options.description || `Token for listing on $FSBD`) + '\n\nLaunched on FSBD.fun'
  return uploadToPumpIpfs(tokenName, tokenSymbol, {
    imageFile: options.imageFile,
    imageUrl: options.imageUrl,
    description: desc,
    extras: options.extras,
  })
}

async function uploadToPumpIpfs(
  tokenName: string,
  tokenSymbol: string,
  options: {
    imageFile?: File
    imageUrl?: string
    description?: string
    extras?: TokenMetadataExtras
  }
): Promise<string> {
  // Prefer imageUrl: sends tiny JSON, server fetches image - avoids 413 on large files
  if (options.imageUrl) {
    const body: Record<string, unknown> = {
      imageUrl: options.imageUrl,
      name: tokenName,
      symbol: tokenSymbol,
      description: options.description,
    }
    if (options.extras) {
      if (options.extras.website) body.website = options.extras.website
      if (options.extras.externalUrl && !body.website) body.website = options.extras.externalUrl
      if (options.extras.twitter) body.twitter = options.extras.twitter
      if (options.extras.telegram) body.telegram = options.extras.telegram
      if (options.extras.bannerUrl) body.bannerUrl = options.extras.bannerUrl
    }
    const res = await fetch('/api/pump-ipfs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
  if (options.imageFile) {
    const formData = new FormData()
    formData.append('file', options.imageFile)
    formData.append('name', tokenName)
    formData.append('symbol', tokenSymbol)
    formData.append('description', options.description || `Token for listing on $FSBD`)

    const res = await fetch('/api/pump-ipfs', { method: 'POST', body: formData })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `IPFS upload failed (${res.status}). Try a smaller image (under 4MB) or ensure listing image uploaded successfully.`)
    }
    const data = await res.json()
    const uri = data.metadataUri || data.uri
    if (!uri) throw new Error('No metadata URI returned')
    return uri
  }
  throw new Error('Token launch requires an image. Add an image to your listing first.')
}

/** Create token via pump.fun — split create + dev buy to avoid "read-only account" simulation errors */
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
    extras?: TokenMetadataExtras
    mintKeypair?: Keypair
  } = {}
): Promise<string> {
  const mintKeypair = options.mintKeypair ?? Keypair.generate()
  const devBuySol = Math.max(0, options.devBuySol ?? 0.01)

  // Where your SOL goes: ~0.02–0.025 SOL creation/network fee → pump.fun; dev buy → bonding curve (you receive tokens); ~0.001 tx fee
  const minSolRequired = devBuySol + 0.03
  const balance = await connection.getBalance(wallet)
  const solBalance = balance / 1e9
  if (solBalance < minSolRequired) {
    throw new Error(
      `Insufficient SOL. Need ~${minSolRequired.toFixed(2)} SOL (${devBuySol > 0 ? `${devBuySol} dev buy + ` : ''}~0.03 fees) but you have ${solBalance.toFixed(3)} SOL.`
    )
  }

  if (!options.imageFile && !options.imageUrl) {
    throw new Error('Token launch requires an image. Add an image to your listing first.')
  }
  const metadataUri = await getMetadataUri(tokenName, tokenSymbol, {
    imageFile: options.imageFile,
    imageUrl: options.imageUrl,
    description: options.description,
    extras: options.extras,
  })

  // Create token with dev buy in one tx (PumpPortal docs use amount > 0; amount: 0 can cause read-only account errors)
  const createBody = {
    publicKey: wallet.toBase58(),
    action: 'create',
    tokenMetadata: { name: tokenName, symbol: tokenSymbol, uri: metadataUri },
    mint: mintKeypair.publicKey.toBase58(),
    denominatedInSol: 'true',
    amount: devBuySol,
    slippage: 15,
    priorityFee: 0.0005,
    pool: 'pump',
    isMayhemMode: 'false',
  }

  const createRes = await fetch(PUMP_TRADE_LOCAL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createBody),
  })

  if (!createRes.ok) {
    const errText = await createRes.text()
    throw new Error(`Pump.fun create failed: ${errText}`)
  }

  const createBuffer = await createRes.arrayBuffer()
  const createTx = VersionedTransaction.deserialize(new Uint8Array(createBuffer))
  createTx.sign([mintKeypair])

  if (!signTransaction) throw new Error('Wallet signTransaction not available')
  const signedCreate = await signTransaction(createTx)

  let createSig: string
  try {
    createSig = await connection.sendTransaction(signedCreate as VersionedTransaction, {
      skipPreflight: true,
      maxRetries: 5,
      preflightCommitment: 'confirmed',
    })
  } catch (sendErr: unknown) {
    const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr)
    if (/insufficient/i.test(errMsg)) {
      throw new Error(
        `Token create failed (likely insufficient SOL). Need ~${minSolRequired.toFixed(2)} SOL (dev buy + ~0.03 fees). ${errMsg}`
      )
    }
    if (/0x1|custom program error|read-only account|instruction changed the balance/i.test(errMsg)) {
      throw new Error(
        `Transaction may have succeeded — check your wallet for the token. If you see it, use the recovery below to link it. Error: ${errMsg}`
      )
    }
    throw sendErr
  }

  try {
    await connection.confirmTransaction(createSig, 'confirmed')
  } catch (confirmErr: unknown) {
    const errMsg = confirmErr instanceof Error ? confirmErr.message : String(confirmErr)
    const statuses = await connection.getSignatureStatuses([createSig])
    const status = statuses.value[0]
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
      return mintKeypair.publicKey.toBase58()
    }
    if (/0x1|custom program error|read-only account|instruction changed the balance/i.test(errMsg)) {
      throw new Error(
        `Transaction may have succeeded — check your wallet for the token. If you see it, you can manually link it to your listing. Error: ${errMsg}`
      )
    }
    throw confirmErr
  }

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
