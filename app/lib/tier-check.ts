import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, getMint, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { getTokenBalanceViaBitquery } from './bitquery-balance'

// $FSBD token mint - env/config override, or production fallback
const FSBD_TOKEN_MINT = process.env.NEXT_PUBLIC_FSBD_TOKEN_MINT || 'FSBD_TOKEN_MINT_PLACEHOLDER'

// Production $FSBD (pump.fun) - used when env/config not set
const FSBD_PRODUCTION_MINT = 'A8sdJBY6UGErXW2gNVT6s13Qn4FJwGyRp63Y5mZBpump'

// Mock mint for devnet testing only
const MOCK_FSBD_MINT = 'So11111111111111111111111111111111111111112' // Wrapped SOL

// Tier thresholds (token amounts) - 4 tiers: 2, 10, 30, 100 listings
export const TIER_THRESHOLDS = {
  bronze: 100000,      // 100k $FSBD -> 2 listings
  silver: 500000,      // 500k $FSBD -> 10 listings
  gold: 2000000,       // 2M $FSBD -> 30 listings
  platinum: 10000000   // 10M $FSBD -> 100 listings
} as const

export type Tier = 'free' | 'bronze' | 'silver' | 'gold' | 'platinum'

/**
 * Extract fsbd_token_mint from platform_config rows.
 * Handles both string and { value: string } formats (admin UI may save as object).
 */
export function extractFsbdMintFromConfig(rows: { key: string; value_json: unknown }[] | null): string | null {
  const row = rows?.find((r) => r.key === 'fsbd_token_mint')
  if (!row) return null
  const v = row.value_json
  if (typeof v === 'string' && v && v !== 'FSBD_TOKEN_MINT_PLACEHOLDER') return v
  if (typeof v === 'object' && v !== null && 'value' in v && typeof (v as { value: unknown }).value === 'string') {
    const s = (v as { value: string }).value
    return s && s !== 'FSBD_TOKEN_MINT_PLACEHOLDER' ? s : null
  }
  return null
}

/**
 * Resolve which $FSBD mint to use (config/env override, production fallback, or devnet mock)
 */
export function getFsbdMintAddress(mintOverride?: string | null): string {
  const fromOverride = mintOverride?.trim()
  if (fromOverride && fromOverride !== 'FSBD_TOKEN_MINT_PLACEHOLDER') return fromOverride
  if (FSBD_TOKEN_MINT && FSBD_TOKEN_MINT !== 'FSBD_TOKEN_MINT_PLACEHOLDER') return FSBD_TOKEN_MINT
  const isDevnet = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet'
  return isDevnet ? MOCK_FSBD_MINT : FSBD_PRODUCTION_MINT
}

/**
 * Get user's raw $FSBD token balance (for flexible thresholds like auction gate)
 * Tries: parsed+mint filter -> ATA -> all accounts filter (RPC fallbacks for pump.fun)
 * @param mintOverride - Optional mint from platform_config; when set, uses real $FSBD
 */
export async function getUserTokenBalance(
  walletAddress: string,
  connection: Connection,
  mintOverride?: string | null
): Promise<number> {
  const mintToUse = getFsbdMintAddress(mintOverride)
  const mintPublicKey = new PublicKey(mintToUse)
  const userPublicKey = new PublicKey(walletAddress)

  const tryParsed = async (): Promise<number> => {
    const { value } = await connection.getParsedTokenAccountsByOwner(userPublicKey, { mint: mintPublicKey })
    if (value.length === 0) return 0
    const info = value[0].account.data?.parsed?.info
    if (!info?.tokenAmount) return 0
    const ui = info.tokenAmount.uiAmount
    return typeof ui === 'number' ? ui : Number(info.tokenAmount.amount || 0) / Math.pow(10, info.tokenAmount.decimals || 6)
  }
  const tryAllAccounts = async (): Promise<number> => {
    const { value } = await connection.getParsedTokenAccountsByOwner(userPublicKey, { programId: TOKEN_PROGRAM_ID })
    const mintLower = mintToUse.toLowerCase()
    for (const item of value) {
      const info = item.account.data?.parsed?.info
      if (info?.mint && String(info.mint).toLowerCase() === mintLower && info?.tokenAmount) {
        const ui = info.tokenAmount.uiAmount
        return typeof ui === 'number' ? ui : Number(info.tokenAmount.amount || 0) / Math.pow(10, info.tokenAmount.decimals || 6)
      }
    }
    return 0
  }

  try {
    let balance = await tryParsed()
    if (balance > 0) return balance
  } catch { /* ignore */ }
  try {
    const tokenAccount = await getAssociatedTokenAddress(mintPublicKey, userPublicKey)
    const accountInfo = await getAccount(connection, tokenAccount)
    const mintInfo = await getMint(connection, mintPublicKey)
    return Number(accountInfo.amount) / (10 ** mintInfo.decimals)
  } catch { /* ignore */ }
  try {
    const balance = await tryAllAccounts()
    if (balance > 0) return balance
  } catch {
    /* ignore */
  }
  // Bitquery fallback (same logic as balance-check API / chat) when RPC returns 0
  try {
    const bitqueryBalance = getTokenBalanceViaBitquery(walletAddress, mintToUse)
    return await bitqueryBalance
  } catch {
    return 0
  }
}

export type TierThresholds = { bronze: number; silver: number; gold: number; platinum?: number }

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

  try {
    const balance = await getUserTokenBalance(walletAddress, connection, mintOverride)
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
 * Uses lookup table to avoid floating-point artifacts (0.04 not 0.04000000000000001)
 */
export function calculateListingFee(tier: Tier): number {
  const fees: Record<Tier, number> = {
    free: 0.1,       // full price
    bronze: 0.08,    // 20% off
    silver: 0.06,    // 40% off
    gold: 0.04,      // 60% off
    platinum: 0.025, // 75% off
  }
  return fees[tier] ?? 0.1
}

/**
 * Get tier benefits description — all token-gated perks for $FSBD holders
 */
export function getTierBenefits(tier: Tier): string[] {
  const platformFeeRate = calculatePlatformFeeRate(tier)
  const feePercent = (platformFeeRate * 100).toFixed(3)
  const listingFee = calculateListingFee(tier)
  const listingFeeFormatted = Number(listingFee.toFixed(4)) // avoid 0.04000000000000001
  const maxListings = getMaxListingsForTier(tier)
  const maxImages = getMaxImagesForTier(tier)

  const benefits: Record<Tier, string[]> = {
    free: [
      '1 free listing (hold $FSBD or subscribe for more)',
      `Platform fee: ${feePercent}% on sales`,
      `Up to ${maxListings} active listing`,
      `${maxImages} images per listing`,
      `Token launch fee: ${listingFee} SOL (full price)`,
    ],
    bronze: [
      'Free listings (message signing only)',
      `Platform fee: ${feePercent}% on sales`,
      `Up to ${maxListings} active listings (10k $FSBD per extra slot)`,
      `${maxImages} images per listing`,
      `Token launch fee: ${listingFee} SOL (20% off)`,
      'Socials & banner in token metadata when launching',
    ],
    silver: [
      'Free listings (message signing only)',
      `Platform fee: ${feePercent}% on sales`,
      `Up to ${maxListings} active listings (10k $FSBD per extra slot)`,
      `${maxImages} images per listing`,
      `Token launch fee: ${listingFee} SOL (40% off)`,
      'Socials & banner in token metadata when launching',
      'Priority visibility',
    ],
    gold: [
      'Free listings (message signing only)',
      `Platform fee: ${feePercent}% on sales`,
      `Up to ${maxListings} active listings (10k $FSBD per extra slot)`,
      `${maxImages} images per listing`,
      `Token launch fee: ${listingFee} SOL (60% off)`,
      'Socials & banner in token metadata when launching',
      'Priority visibility',
      'Auction creation',
    ],
    platinum: [
      'Free listings (message signing only)',
      `Platform fee: ${feePercent}% on sales`,
      `Up to ${maxListings} active listings (10k $FSBD per extra slot)`,
      `${maxImages} images per listing`,
      `Token launch fee: ${listingFee} SOL (75% off)`,
      'Socials & banner in token metadata when launching',
      'Priority visibility',
      'Auction creation',
      'Governance voting',
    ],
  }
  return benefits[tier] || benefits.free
}

/**
 * Maximum active listings allowed per tier. Aligned with subscription: 2, 10, 30, 100
 * free=1, bronze=2, silver=10, gold=30, platinum=100
 * Early adopters get 99. Users can buy extra slots with 10k $FSBD each.
 */
export function getMaxListingsForTier(tier: Tier): number {
  const limits: Record<Tier, number> = {
    free: 1,
    bronze: 2,
    silver: 10,
    gold: 30,
    platinum: 100,
  }
  return limits[tier] ?? 1
}

/** Subscription tier type (mirrors token tiers) */
export type SubscriptionTier = 'basic' | 'bronze' | 'silver' | 'gold'

/** Subscription tiers: 2, 10, 30, 100 listings. Same structure as token holder tiers. */
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, { listings: number; priceUsd: number }> = {
  basic: { listings: 2, priceUsd: 0.99 },
  bronze: { listings: 10, priceUsd: 2.99 },
  silver: { listings: 30, priceUsd: 5.99 },
  gold: { listings: 100, priceUsd: 10.99 },
}

export function getSubscriptionListingLimit(tier: SubscriptionTier): number {
  return SUBSCRIPTION_TIERS[tier]?.listings ?? 2
}

/** Early adopter listing limit (first 100 users) */
export const EARLY_ADOPTER_LISTING_LIMIT = 99

/** Cost in $FSBD to purchase one extra listing slot over tier limit */
export const EXTRA_LISTING_SLOT_COST_FSBD = 10_000

/**
 * Maximum listing images allowed per tier (2–4 based on $FSBD holdings)
 */
export function getMaxImagesForTier(tier: Tier): number {
  const limits: Record<Tier, number> = {
    free: 2,
    bronze: 2,
    silver: 3,
    gold: 4,
    platinum: 4,
  }
  return limits[tier] ?? 2
}

/**
 * Whether user can add socials/banner to token metadata (bronze+ = 100k+ $FSBD)
 */
export function canAddSocialsForTier(tier: Tier): boolean {
  return tier !== 'free'
}

/**
 * Check if user can create auctions (balance-based, admin-configurable threshold)
 * Use canCreateAuctionWithBalance(balance, auctionMinTokens) when config is available
 */
export function canCreateAuction(tier: Tier): boolean {
  return tier === 'gold' || tier === 'platinum'
}

/**
 * Check if user can create auctions by balance (for admin-configurable threshold)
 */
export function canCreateAuctionWithBalance(balance: number, auctionMinTokens: number): boolean {
  return balance >= auctionMinTokens
}

/**
 * Calculate platform fee rate based on seller's tier
 * Platinum gets the lowest fee
 */
export function calculatePlatformFeeRate(tier: Tier): number {
  const feeRates: Record<Tier, number> = {
    free: 0.0042,
    bronze: 0.0035,
    silver: 0.0025,
    gold: 0.0015,
    platinum: 0.00067,
  }
  return feeRates[tier] ?? feeRates.free
}
