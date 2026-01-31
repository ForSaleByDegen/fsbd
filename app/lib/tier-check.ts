import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, getMint } from '@solana/spl-token'

// TODO: Replace with actual $FSBD token mint address after launch
// For devnet testing, use a mock mint address
const FSBD_TOKEN_MINT = process.env.NEXT_PUBLIC_FSBD_TOKEN_MINT || 'FSBD_TOKEN_MINT_PLACEHOLDER'

// Mock mint for devnet testing (replace with actual after launch)
const MOCK_FSBD_MINT = 'So11111111111111111111111111111111111111112' // Wrapped SOL as placeholder

// Tier thresholds (token amounts)
// Updated: Start at 100k, top tier at 10M
export const TIER_THRESHOLDS = {
  bronze: 100000,      // 100,000 $FSBD - Lowest tier
  silver: 1000000,     // 1,000,000 $FSBD - Mid tier
  gold: 10000000       // 10,000,000 $FSBD - Top tier
} as const

export type Tier = 'free' | 'bronze' | 'silver' | 'gold'

/**
 * Get user's tier based on $FSBD token balance
 * Checks on-chain balance - no data sharing, fully private
 * Uses mock mint for devnet testing
 */
export async function getUserTier(
  walletAddress: string,
  connection: Connection
): Promise<Tier> {
  // Use mock mint for devnet if placeholder
  const mintToUse = FSBD_TOKEN_MINT === 'FSBD_TOKEN_MINT_PLACEHOLDER' 
    ? MOCK_FSBD_MINT 
    : FSBD_TOKEN_MINT

  try {
    const mintPublicKey = new PublicKey(mintToUse)
    const userPublicKey = new PublicKey(walletAddress)
    
    const tokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      userPublicKey
    )

    const accountInfo = await getAccount(connection, tokenAccount)
    const mintInfo = await getMint(connection, mintPublicKey)
    const balance = Number(accountInfo.amount) / (10 ** mintInfo.decimals)

    if (balance >= TIER_THRESHOLDS.gold) return 'gold'
    if (balance >= TIER_THRESHOLDS.silver) return 'silver'
    if (balance >= TIER_THRESHOLDS.bronze) return 'bronze'
    return 'free'
  } catch (error) {
    // Token account doesn't exist or error - return free tier
    // For devnet testing, you can manually set tier by holding mock tokens
    return 'free'
  }
}

/**
 * Calculate listing fee based on user tier
 * NOTE: Regular listings are FREE (just require message signing)
 * This fee only applies when launching a token/NFT for the listing
 * Base fee: 0.1 SOL, reduced by tier
 */
export function calculateListingFee(tier: Tier): number {
  const BASE_FEE = 0.1 // 0.1 SOL base fee (only for token launches)
  
  const reductions = {
    free: 0,       // No discount - need bronze tier for discount
    bronze: 0.25,  // 25% off - bronze tier
    silver: 0.5,   // 50% off - silver tier
    gold: 0.75     // 75% off - gold tier
  }

  const reduction = reductions[tier] || 0
  return BASE_FEE * (1 - reduction)
}

/**
 * Get tier benefits description
 */
export function getTierBenefits(tier: Tier): string[] {
  const platformFeeRate = calculatePlatformFeeRate(tier)
  const feePercent = (platformFeeRate * 100).toFixed(3)
  const listingFee = calculateListingFee(tier)
  
  const benefits = {
    free: [
      'Free listings (message signing only)', 
      `Platform fee: ${feePercent}% on sales`,
      `Token launch fee: ${listingFee.toFixed(3)} SOL (if creating token/NFT)`
    ],
    bronze: [
      'Free listings (message signing only)',
      `Platform fee: ${feePercent}% on sales`,
      `Token launch fee: ${listingFee.toFixed(3)} SOL (25% discount)`,
      'Auction creation',
      'Basic listings'
    ],
    silver: [
      'Free listings (message signing only)',
      `Platform fee: ${feePercent}% on sales`,
      `Token launch fee: ${listingFee.toFixed(3)} SOL (50% discount)`,
      'Priority visibility',
      'Auction creation',
      'Basic listings'
    ],
    gold: [
      'Free listings (message signing only)',
      `Platform fee: ${feePercent}% on sales`,
      `Token launch fee: ${listingFee.toFixed(3)} SOL (75% discount)`,
      'Priority visibility',
      'Governance voting',
      'Auction creation',
      'Basic listings'
    ]
  }
  return benefits[tier] || benefits.free
}

/**
 * Check if user can create auctions (Bronze+ required)
 */
export function canCreateAuction(tier: Tier): boolean {
  return tier !== 'free'
}

/**
 * Calculate platform fee rate based on seller's tier
 * Gold tier gets the lowest fee (0.067%)
 */
export function calculatePlatformFeeRate(tier: Tier): number {
  const feeRates = {
    free: 0.0042,   // 0.42% - base rate
    bronze: 0.0035, // 0.35% - bronze discount
    silver: 0.0021, // 0.21% - silver discount
    gold: 0.00067   // 0.067% - gold discount (highest tier)
  }
  
  return feeRates[tier] || feeRates.free
}
