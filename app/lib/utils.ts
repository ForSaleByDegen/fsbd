import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Display label for price token — LISTING_TOKEN shows token_symbol when available */
export function formatPriceToken(priceToken: string | null | undefined, tokenSymbol?: string | null): string {
  if (!priceToken || priceToken === 'SOL') return 'SOL'
  if (priceToken === 'LISTING_TOKEN' && tokenSymbol?.trim()) return tokenSymbol.trim()
  if (priceToken === 'LISTING_TOKEN') return 'My token'
  return priceToken
}
