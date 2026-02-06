/**
 * Telegram bot - post new listings to a channel.
 * Requires: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID (e.g. @channelname or -100xxxxx)
 */

function formatPriceToken(priceToken: string | null | undefined, tokenSymbol?: string | null): string {
  if (!priceToken || priceToken === 'SOL') return 'SOL'
  if (priceToken === 'LISTING_TOKEN' && tokenSymbol?.trim()) return tokenSymbol.trim()
  if (priceToken === 'LISTING_TOKEN') return 'Token'
  return priceToken
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export interface ListingForTelegram {
  id: string
  title: string
  description?: string | null
  price: number
  price_token?: string | null
  token_symbol?: string | null
  token_mint?: string | null
  category?: string | null
  subcategory?: string | null
  images?: string[]
  location_city?: string | null
  location_region?: string | null
  has_token?: boolean
}

const PUMP_FUN_BASE = 'https://pump.fun/coin'

function formatMarketCap(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

import { getBondingCurveProgress } from './bitquery-bonding-curve'

async function fetchTokenMarketCap(mint: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/solana/${mint}`,
      { next: { revalidate: 0 }, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const pairs = (await res.json()) as Array<{ marketCap?: number; fdv?: number; baseToken?: { address?: string } }>
    if (!Array.isArray(pairs) || pairs.length === 0) return null
    const mintLower = mint.toLowerCase()
    const pair = pairs.find((p) => p.baseToken?.address?.toLowerCase() === mintLower) ?? pairs[0]
    const mc = pair.marketCap ?? pair.fdv
    return typeof mc === 'number' && mc > 0 ? mc : null
  } catch {
    return null
  }
}

/**
 * Post a new listing to the Telegram channel.
 * Fire-and-forget; does not throw (logs errors).
 */
export async function postListingToTelegram(
  listing: ListingForTelegram,
  baseUrl: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const channelId = process.env.TELEGRAM_CHANNEL_ID
  if (!token || !channelId) {
    console.warn('[telegram-bot] Skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not set in env')
    return
  }

  const listingUrl = `${baseUrl.replace(/\/$/, '')}/listings/${listing.id}`
  const priceLabel = formatPriceToken(listing.price_token, listing.token_symbol)
  const categoryLabel = [listing.category, listing.subcategory].filter(Boolean).join(' · ') || 'For Sale'
  const location = [listing.location_city, listing.location_region].filter(Boolean).join(', ') || '—'
  const desc = (listing.description || '').trim().slice(0, 160)
  const descLine = desc ? `${escapeHtml(desc)}${desc.length >= 160 ? '…' : ''}` : ''

  let tokenBlock = ''
  const tokenMint = listing.token_mint?.trim()
  if (tokenMint && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenMint)) {
    const pumpUrl = `${PUMP_FUN_BASE}/${tokenMint}`
    const symbol = listing.token_symbol?.trim() || 'Token'
    const [marketCap, bcProgress] = await Promise.all([
      fetchTokenMarketCap(tokenMint),
      getBondingCurveProgress(tokenMint),
    ])
    const parts: string[] = []
    if (marketCap != null) parts.push(`MC ${formatMarketCap(marketCap)}`)
    if (bcProgress != null) parts.push(`${bcProgress}% BC`)
    const statsLine = parts.length > 0 ? ` · ${parts.join(' · ')}` : ''
    tokenBlock = `🪙 <b>${escapeHtml(symbol)}</b>${statsLine}\n<a href="${pumpUrl}">🟣 Buy on pump.fun</a>`
  }

  const caption = [
    '🆕 <b>NEW LISTING</b>',
    '',
    `📦 ${escapeHtml(listing.title)}`,
    `💰 ${Number(listing.price).toLocaleString()} ${escapeHtml(priceLabel)}`,
    `📂 ${escapeHtml(categoryLabel)}`,
    `📍 ${escapeHtml(location)}`,
    tokenBlock,
    listing.has_token && !tokenBlock ? '🪙 Token listing' : '',
    descLine ? `\n${descLine}` : '',
    '',
    `<a href="${listingUrl}">🔗 View listing</a>`,
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 1024)

  const imageUrl = Array.isArray(listing.images) && listing.images[0] ? listing.images[0] : null

  try {
    const apiUrl = `https://api.telegram.org/bot${token}/sendPhoto`
    const body: Record<string, string> = {
      chat_id: channelId,
      caption,
      parse_mode: 'HTML',
    }
    if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
      body.photo = imageUrl
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[telegram-bot] sendPhoto failed:', res.status, text.slice(0, 200))
      // Fallback: send text-only if photo fails (e.g. URL not accessible by Telegram)
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: channelId, text: caption, parse_mode: 'HTML' }),
      }).catch(() => {})
      return
    }

    const data = await res.json().catch(() => ({}))
    if (!data.ok) {
      console.error('[telegram-bot] API error:', data.description)
    }
  } catch (err) {
    console.error('[telegram-bot]', err instanceof Error ? err.message : String(err))
  }
}
