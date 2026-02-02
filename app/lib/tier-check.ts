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
 * Resolve which $FSBD mint to use (config/env override, or placeholder for devnet)
 */
export function getFsbdMintAddress(mintOverride?: string | null): string {
  const fromOverride = mintOverride?.trim()
  if (fromOverride && fromOverride !== 'FSBD_TOKEN_MINT_PLACEHOLDER') return fromOverride
  if (FSBD_TOKEN_MINT !== 'FSBD_TOKEN_MINT_PLACEHOLDER') return FSBD_TOKEN_MINT
  return MOCK_FSBD_MINT
}

/**
 * Get user's raw $FSBD token balance (for flexible thresholds like auction gate)
 * @param mintOverride - Optional mint from platform_config; when set, uses real $FSBD
 */
export async function getUserTokenBalance(
  walletAddress: string,
  connection: Connection,
  mintOverride?: string | null
): Promise<number> {
  const mintToUse = getFsbdMintAddress(mintOverride)
  try {
    const mintPublicKey = new PublicKey(mintToUse)
    const userPublicKey = new PublicKey(walletAddress)
    const tokenAccount = await getAssociatedTokenAddress(mintPublicKey, userPublicKey)
    const accountInfo = await getAccount(connection, tokenAccount)
    const mintInfo = await getMint(connection, mintPublicKey)
    return Number(accountInfo.amount) / (10 ** mintInfo.decimals)
  } catch {
    return 0
  }
}

export type TierThresholds = { bronze: number; silver: number; gold: number }

/**
 * Get user's tier based on $FSBD token balance
 * Checks on-chain balance - no data sharing, fully private
 * Uses mock mint for devnet testing
 * @param thresholds - Optional overrides (e.g. from /api/config); uses TIER_THRESHOLDS or env vars if not provided
 * @param mintOverride - Optional mint from platform_config; when set, uses real $FSBD
 */
export async function getUserTier(
  walletAddress: string,
  connection: Connection,
  thresholds?: TierThresholds,
  mintOverride?: string | null
): Promise<Tier> {
  const th = thresholds ?? TIER_THRESHOLDS
  const mintToUse = getFsbdMintAddress(mintOverride)

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

    if (balance >= th.gold) return 'gold'
    if (balance >= th.silver) return 'silver'
    if (balance >= th.bronze) return 'bronze'
    return 'free'
  } catch {
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
  
  const maxListings = getMaxListingsForTier(tier as Tier)
  const benefits = {
    free: [
      'Free listings (message signing only)', 
      `Platform fee: ${feePercent}% on sales`,
      `Up to ${maxListings} active listings`,
      '1 image per listing'
    ],
    bronze: [
      'Free listings (message signing only)',
      `Platform fee: ${feePercent}% on sales`,
      `Up to ${maxListings} active listings (10k $FSBD per extra slot)`,
      'Basic listings',
      '2 images per listing'
    ],
    silver: [
      'Free listings (message signing only)',
      `Platform fee: ${feePercent}% on sales`,
      `Up to ${maxListings} active listings (10k $FSBD per extra slot)`,
      'Priority visibility',
      'Basic listings',
      '3 images per listing'
    ],
    gold: [
      'Free listings (message signing only)',
      `Platform fee: ${feePercent}% on sales`,
      `Up to ${maxListings} active listings (10k $FSBD per extra slot)`,
      'Priority visibility',
      'Governance voting',
      'Auction creation',
      'Basic listings',
      '4 images per listing'
    ]
  }
  return benefits[tier] || benefits.free
}

/**
 * Maximum active listings allowed per tier (free=3, bronze=2, silver=4, gold=10)
 * Users can purchase extra slots with 10,000 $FSBD each (see extra_paid_slots in profiles)
 */
export function getMaxListingsForTier(tier: Tier): number {
  const limits: Record<Tier, number> = {
    free: 3,
    bronze: 2,
    silver: 4,
    gold: 10,
  }
  return limits[tier] ?? 3
}

/** Cost in $FSBD to purchase one extra listing slot over tier limit */
export const EXTRA_LISTING_SLOT_COST_FSBD = 10_000

/**
 * Maximum listing images allowed per tier (Tier 1 = 1 image, Tier 2 = 2, etc.)
 */
export function getMaxImagesForTier(tier: Tier): number {
  const limits: Record<Tier, number> = {
    free: 1,
    bronze: 2,
    silver: 3,
    gold: 4,
  }
  return limits[tier] ?? 1
}

/**
 * Check if user can create auctions (balance-based, admin-configurable threshold)
 * Use canCreateAuctionWithBalance(balance, auctionMinTokens) when config is available
 */
export function canCreateAuction(tier: Tier): boolean {
  return tier === 'gold'
}

/**
 * Check if user can create auctions by balance (for admin-configurable threshold)
 */
export function canCreateAuctionWithBalance(balance: number, auctionMinTokens: number): boolean {
  return balance >= auctionMinTokens
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
