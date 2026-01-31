import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token'

// TODO: Replace with actual $FBSD token mint address after launch
// For devnet testing, use a mock mint address
const FBSD_TOKEN_MINT = process.env.NEXT_PUBLIC_FBSD_TOKEN_MINT || 'FBSD_TOKEN_MINT_PLACEHOLDER'

// Mock mint for devnet testing (replace with actual after launch)
const MOCK_FBSD_MINT = 'So11111111111111111111111111111111111111112' // Wrapped SOL as placeholder

// Tier thresholds (token amounts)
export const TIER_THRESHOLDS = {
  bronze: 1000,
  silver: 10000,
  gold: 100000
} as const

export type Tier = 'free' | 'bronze' | 'silver' | 'gold'

/**
 * Get user's tier based on $FBSD token balance
 * Checks on-chain balance - no data sharing, fully private
 * Uses mock mint for devnet testing
 */
export async function getUserTier(
  walletAddress: string,
  connection: Connection
): Promise<Tier> {
  // Use mock mint for devnet if placeholder
  const mintToUse = FBSD_TOKEN_MINT === 'FBSD_TOKEN_MINT_PLACEHOLDER' 
    ? MOCK_FBSD_MINT 
    : FBSD_TOKEN_MINT

  try {
    const mintPublicKey = new PublicKey(mintToUse)
    const userPublicKey = new PublicKey(walletAddress)
    
    const tokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      userPublicKey
    )

    const accountInfo = await getAccount(connection, tokenAccount)
    const balance = Number(accountInfo.amount) / (10 ** accountInfo.mint.decimals)

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
 * Base fee: 0.1 SOL, reduced by tier
 */
export function calculateListingFee(tier: Tier): number {
  const BASE_FEE = 0.1 // 0.1 SOL base fee
  
  const reductions = {
    free: 0,
    bronze: 0.25,  // 25% off
    silver: 0.5,   // 50% off
    gold: 0.75     // 75% off
  }

  const reduction = reductions[tier] || 0
  return BASE_FEE * (1 - reduction)
}

/**
 * Get tier benefits description
 */
export function getTierBenefits(tier: Tier): string[] {
  const benefits = {
    free: ['Basic listings', 'Standard fees (0.1 SOL)'],
    bronze: ['25% fee reduction', 'Auction creation', 'Basic listings'],
    silver: ['50% fee reduction', 'Priority visibility', 'Auction creation', 'Basic listings'],
    gold: ['75% fee reduction', 'Priority visibility', 'Governance voting', 'Auction creation', 'Basic listings']
  }
  return benefits[tier] || benefits.free
}

/**
 * Check if user can create auctions (Bronze+ required)
 */
export function canCreateAuction(tier: Tier): boolean {
  return tier !== 'free'
}
