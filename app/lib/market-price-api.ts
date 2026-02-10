/**
 * Fetch market price and recent sales from external API (e.g. RapidAPI eBay).
 * Set EBAY_RAPIDAPI_KEY and optionally EBAY_RAPIDAPI_HOST in env.
 * If unset, returns null (find-comps works without market data).
 */

export type MarketPriceRange = {
  min: number
  max: number
  median: number
  currency: string
}

export type RecentSale = {
  price: number
  date?: string
}

export type MarketPriceResult = {
  marketPriceRange?: MarketPriceRange
  recentSales?: RecentSale[]
}

const RAPIDAPI_KEY = process.env.EBAY_RAPIDAPI_KEY || ''
const RAPIDAPI_HOST = process.env.EBAY_RAPIDAPI_HOST || 'ebay-search2.p.rapidapi.com'

function extractPrices(items: unknown[]): number[] {
  const prices: number[] = []
  for (const item of items) {
    const o = item as Record<string, unknown>
    const p = o?.price ?? (o?.currentPrice as Record<string, unknown>)?.value ?? (o?.price as Record<string, unknown>)?.value
    const n = typeof p === 'number' ? p : typeof p === 'string' ? parseFloat(p) : NaN
    if (Number.isFinite(n) && n > 0) prices.push(n)
  }
  return prices
}

function computeMedian(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/**
 * Fetch market prices for a search query. Returns null if API unavailable or no key.
 */
export async function fetchMarketPrices(searchQuery: string): Promise<MarketPriceResult | null> {
  if (!RAPIDAPI_KEY || !searchQuery.trim()) return null

  try {
    const url = new URL('https://' + RAPIDAPI_HOST + '/search')
    url.searchParams.set('query', searchQuery.trim().slice(0, 100))
    url.searchParams.set('page', '1')
    url.searchParams.set('count', '30')

    const res = await fetch(url.toString(), {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const data = (await res.json()) as { items?: unknown[]; searchResult?: { item?: unknown[] }; itemSummaries?: unknown[] }
    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.searchResult?.item)
        ? data.searchResult.item
        : Array.isArray(data.itemSummaries)
          ? data.itemSummaries
          : []

    const prices = extractPrices(items)
    if (prices.length === 0) return null

    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const median = computeMedian(prices)

    return {
      marketPriceRange: { min, max, median, currency: 'USD' },
      recentSales: prices.slice(0, 5).map((price) => ({ price })),
    }
  } catch {
    return null
  }
}
