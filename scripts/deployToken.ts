import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, setAuthority, AuthorityType } from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Deploy $APPTOKEN - the governance and tier token for the marketplace
 * 
 * Usage:
 *   ts-node scripts/deployToken.ts
 * 
 * Make sure to set:
 *   - DEPLOYER_KEYPAIR_PATH: Path to keypair file
 *   - RPC_URL: Solana RPC endpoint
 *   - INITIAL_SUPPLY: Initial token supply (default: 1 billion)
 */

const NETWORK = process.env.SOLANA_NETWORK || 'devnet'
const RPC_URL = process.env.RPC_URL || clusterApiUrl(NETWORK as any)
const DEPLOYER_KEYPAIR_PATH = process.env.DEPLOYER_KEYPAIR_PATH || './deployer-keypair.json'
const INITIAL_SUPPLY = BigInt(process.env.INITIAL_SUPPLY || '1000000000') * BigInt(10 ** 9) // 1B tokens with 9 decimals

async function deployAppToken() {
  console.log('🚀 Deploying $APPTOKEN...')
  console.log(`Network: ${NETWORK}`)
  console.log(`RPC: ${RPC_URL}`)

  // Load deployer keypair
  let deployerKeypair: Keypair
  try {
    const keypairData = JSON.parse(fs.readFileSync(DEPLOYER_KEYPAIR_PATH, 'utf-8'))
    deployerKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData))
    console.log(`Deployer: ${deployerKeypair.publicKey.toString()}`)
  } catch (error) {
    console.error('❌ Error loading keypair:', error)
    console.log('💡 Generate a keypair with: solana-keygen new -o deployer-keypair.json')
    process.exit(1)
  }

  const connection = new Connection(RPC_URL, 'confirmed')

  // Check balance
  const balance = await connection.getBalance(deployerKeypair.publicKey)
  console.log(`Balance: ${balance / 1e9} SOL`)
  
  if (balance < 0.1 * 1e9) {
    console.error('❌ Insufficient balance. Need at least 0.1 SOL for deployment.')
    if (NETWORK === 'devnet') {
      console.log('💡 Get devnet SOL: solana airdrop 2 ' + deployerKeypair.publicKey.toString())
    }
    process.exit(1)
  }

  try {
    // Create mint
    console.log('\n📝 Creating token mint...')
    const mint = await createMint(
      connection,
      deployerKeypair,
      deployerKeypair.publicKey, // mint authority
      deployerKeypair.publicKey, // freeze authority
      9 // decimals
    )
    console.log(`✅ Mint created: ${mint.toString()}`)

    // Create associated token account
    console.log('\n💼 Creating token account...')
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      deployerKeypair,
      mint,
      deployerKeypair.publicKey
    )
    console.log(`✅ Token account: ${tokenAccount.address.toString()}`)

    // Mint initial supply
    console.log('\n🪙 Minting initial supply...')
    await mintTo(
      connection,
      deployerKeypair,
      mint,
      tokenAccount.address,
      deployerKeypair,
      INITIAL_SUPPLY
    )
    console.log(`✅ Minted ${INITIAL_SUPPLY.toString()} tokens`)

    // Optional: Revoke mint authority (makes supply fixed)
    // Uncomment if you want a fixed supply token
    /*
    console.log('\n🔒 Revoking mint authority...')
    await setAuthority(
      connection,
      deployerKeypair,
      mint,
      deployerKeypair.publicKey,
      AuthorityType.MintTokens,
      null
    )
    console.log('✅ Mint authority revoked (fixed supply)')
    */

    // Save deployment info
    const deploymentInfo = {
      network: NETWORK,
      mint: mint.toString(),
      deployer: deployerKeypair.publicKey.toString(),
      initialSupply: INITIAL_SUPPLY.toString(),
      decimals: 9,
      deployedAt: new Date().toISOString()
    }

    const infoPath = path.join(__dirname, '../token-deployment.json')
    fs.writeFileSync(infoPath, JSON.stringify(deploymentInfo, null, 2))
    console.log(`\n📄 Deployment info saved to: ${infoPath}`)

    console.log('\n✅ Deployment complete!')
    console.log('\n📋 Next steps:')
    console.log(`1. Set NEXT_PUBLIC_APP_TOKEN_MINT=${mint.toString()} in your .env`)
    console.log(`2. Set APP_TOKEN_MINT=${mint.toString()} in backend .env`)
    console.log(`3. Update app/utils/solana.js with the mint address`)

  } catch (error) {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  }
}

deployAppToken()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
