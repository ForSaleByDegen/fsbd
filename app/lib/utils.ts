import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format numeric price to max 4 decimals (avoids 0.08000000000000002) */
export function formatPrice(value: number, maxDecimals = 4): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0'
  const fixed = value.toFixed(maxDecimals)
  return parseFloat(fixed).toString()
}

/** Display label for price token — LISTING_TOKEN shows token_symbol when available */
export function formatPriceToken(priceToken: string | null | undefined, tokenSymbol?: string | null): string {
  if (!priceToken || priceToken === 'SOL') return 'SOL'
  if (priceToken === 'LISTING_TOKEN' && tokenSymbol?.trim()) return tokenSymbol.trim()
  if (priceToken === 'LISTING_TOKEN') return 'My token'
  return priceToken
}
