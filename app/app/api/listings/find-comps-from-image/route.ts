/**
 * POST /api/listings/find-comps-from-image
 * Analyzes an image with AI (ListingGenius: Gemini + Google Search grounding), describes the item, and returns comparable listings from FSBD.
 * Uses only GOOGLE_GEMINI_API_KEY for AI lookups. Rate limit and max comps are tier-based.
 * Body: { imageBase64: string, wallet?: string }
 * Returns: { itemDescription, suggestedCategory, suggestedSubcategory, searchKeywords, comps, groundingSources?, tier, rateLimit }
 */
import { NextRequest, NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'
import { checkTieredFindCompsRateLimit } from '@/lib/rate-limit'
import { getClientId } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'
import { getUserTier, getSnapToCompareLimits, type Tier } from '@/lib/tier-check'
import { parseAndValidateValidatorResponse } from '@/lib/validator-response-validate'

const AI_LISTING_DAILY_MS = 24 * 60 * 60 * 1000

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY
const INHOUSE_AI_URL = (process.env.INHOUSE_AI_URL || '').replace(/\/$/, '') // no trailing slash
const CATEGORIES = ['for-sale', 'digital-assets', 'services', 'gigs', 'housing', 'community', 'jobs']
const SUBCATEGORIES_FOR_SALE = ['electronics', 'furniture', 'vehicles', 'collectibles', 'clothing', 'sports', 'books', 'other']

function extractBase64(dataUrlOrBase64: string): string {
  const trimmed = dataUrlOrBase64.trim()
  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:image\/[a-z]+;base64,(.+)$/i)
    return match?.[1]?.trim() ?? trimmed
  }
  return trimmed
}

function parseGeminiError(err: string): string {
  try {
    const j = JSON.parse(err) as { error?: { status?: string; message?: string } }
    const msg = j?.error?.message ?? ''
    if (/API_KEY_INVALID|invalid.*key|expired|renew/i.test(msg)) {
      return 'Gemini API key is invalid or expired. Create a new key at aistudio.google.com/apikey and update GOOGLE_GEMINI_API_KEY in Vercel.'
    }
    if (/RESOURCE_EXHAUSTED|429|quota/i.test(msg)) return 'Gemini rate limit reached. Try again in a minute.'
    if (/SAFETY|blocked|harmful/i.test(msg)) return 'Image was blocked by safety filters. Try a different photo.'
    if (msg) return msg.slice(0, 150)
  } catch { /* ignore */ }
  return 'Image analysis failed. Try a clearer photo or use keyword search below.'
}

type GroundingSource = { title?: string; uri?: string }

/** ListingGenius pipeline: Gemini + Google Search grounding. Returns { rawContent, groundingSources }, { error }, or null. */
async function runGeminiWithGoogleSearch(
  base64: string,
  mimeType: string,
  geminiKey: string
): Promise<
  | { rawContent: string; groundingSources: GroundingSource[] }
  | { error: string }
  | null
> {
  try {
    // Step 1: Identify item + find market listings via Google Search grounding
    const searchRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: base64 } },
                {
                  text: `Identify this item precisely. You MUST use Google Search to find current active listings for similar items on eBay, Amazon, Etsy, or other marketplaces. Do not answer from the image alone—always search the web for real listings and prices. Return a brief summary of what you found, including any relevant listing URLs or prices.`,
                },
              ],
            },
          ],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 500 },
        }),
      }
    )
    if (!searchRes.ok) {
      const err = await searchRes.text()
      const msg = parseGeminiError(err)
      return { error: msg }
    }
    const searchData = (await searchRes.json()) as {
      candidates?: {
        content?: { parts?: { text?: string }[] }
        groundingMetadata?: { groundingChunks?: { web?: { title?: string; uri?: string } }[] }
        grounding_metadata?: { grounding_chunks?: { web?: { title?: string; uri?: string } }[] }
      }[]
    }
    const cand = searchData?.candidates?.[0]
    const identifiedText = cand?.content?.parts?.[0]?.text ?? ''
    const meta = cand?.groundingMetadata ?? (cand as Record<string, unknown>)?.grounding_metadata
    const metaObj = meta as Record<string, unknown> | undefined
    const chunks = (metaObj?.groundingChunks ?? metaObj?.grounding_chunks ?? []) as { web?: { title?: string; uri?: string } }[]
    let groundingSources: GroundingSource[] = chunks
      .filter((c) => c?.web?.uri)
      .map((c) => ({ title: c.web?.title, uri: c.web?.uri }))
      .slice(0, 10)

    // If image+search returned no grounding, try a text-only search for the identified item
    if (groundingSources.length === 0 && identifiedText.trim()) {
      const searchQuery = identifiedText.slice(0, 120).replace(/\n/g, ' ')
      const textSearchRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Use Google Search to find current listings for: "${searchQuery}". Search eBay, Amazon, or similar marketplaces. Return a brief summary with links to real listings.`,
              }],
            }],
            tools: [{ google_search: {} }],
            generationConfig: { maxOutputTokens: 400 },
          }),
        }
      )
      if (textSearchRes.ok) {
        const textData = (await textSearchRes.json()) as {
          candidates?: { groundingMetadata?: { groundingChunks?: { web?: { title?: string; uri?: string } }[] }; grounding_metadata?: { grounding_chunks?: { web?: { title?: string; uri?: string } }[] } }[]
        }
        const tc = textData?.candidates?.[0] as Record<string, unknown> | undefined
        const tMeta = (tc?.groundingMetadata ?? tc?.grounding_metadata) as Record<string, unknown> | undefined
        const tChunks = (tMeta?.groundingChunks ?? tMeta?.grounding_chunks ?? []) as { web?: { title?: string; uri?: string } }[]
        const extra = tChunks
          .filter((c) => c?.web?.uri)
          .map((c) => ({ title: c.web?.title, uri: c.web?.uri }))
          .slice(0, 10)
        if (extra.length > 0) groundingSources = extra
      }
    }

    // Step 2: Generate listing JSON from identified item + search results
    const sourcesStr =
      groundingSources.length > 0
        ? JSON.stringify(groundingSources.slice(0, 5).map((s) => ({ title: s.title, uri: s.uri })))
        : 'No direct market matches'
    const genPrompt = `Based on the item identified as "${identifiedText.slice(0, 300)}" and these search results: ${sourcesStr}, create a JSON object (no markdown) with these exact keys:
- "suggestedTitle": A short listing title (max 80 chars), e.g. "Vintage Brass Table Lamp".
- "itemDescription": A 1-2 sentence listing description (condition, key features). Plain text, no code.
- "suggestedPrice": A price string in SOL or USD based on similar listings (e.g. "0.5" or "25").
- "category": One of: ${CATEGORIES.join(', ')}. Usually "for-sale" for physical items.
- "subcategory": For for-sale use one of: ${SUBCATEGORIES_FOR_SALE.join(', ')}. For other categories use "other".
- "searchKeywords": An array of 3-6 search terms, e.g. ["vintage lamp", "brass", "table lamp"]. Use specific descriptive terms.
- "suggestedTokenName": A token name for the item, e.g. "Vintage Lamp Token".
- "suggestedTokenSymbol": 3-6 char ticker, e.g. "VLAMP".
- "suggestedTokenDescription": A 1-sentence marketing blurb for token metadata.`

    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: genPrompt }] }],
          generationConfig: { maxOutputTokens: 600 },
        }),
      }
    )
    if (!genRes.ok) {
      const err = await genRes.text()
      const msg = parseGeminiError(err)
      return { error: msg }
    }
    const genData = (await genRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const rawContent = genData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!rawContent.trim()) return null
    return { rawContent, groundingSources }
  } catch {
    return null
  }
}

/** Safe URL check: http(s) only, no file:// or other schemes */
function isSafeValidatorUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.length > 0
  } catch {
    return false
  }
}

/** Validator pool: call registered validators' /api/analyze. No 3rd party. Each validator is called independently to avoid cross-up. */
async function runValidatorPool(base64: string, mimeType: string): Promise<string | null> {
  if (!supabaseAdmin) return null
  try {
    const { data: validators } = await supabaseAdmin
      .from('ai_validators')
      .select('endpoint_url')
      .eq('status', 'active')
    const list = (validators || []) as { endpoint_url: string }[]
    const filtered = list.filter(
      (v) => v?.endpoint_url && String(v.endpoint_url).trim().length >= 10 && isSafeValidatorUrl(String(v.endpoint_url).trim())
    )
    if (filtered.length === 0) return null
    const shuffled = [...filtered].sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(3, shuffled.length); i++) {
      const url = String(shuffled[i]!.endpoint_url).trim().replace(/\/$/, '')
      try {
        const res = await fetch(`${url}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64, mime_type: mimeType }),
          signal: AbortSignal.timeout(90000),
        })
        if (!res.ok) continue
        const data = (await res.json()) as { raw_content?: string; error?: string }
        const raw = data.raw_content?.trim()
        if (!raw) continue
        const validated = parseAndValidateValidatorResponse(raw)
        if (!validated.ok) continue
        return raw
      } catch {
        continue
      }
    }
    return null
  } catch {
    return null
  }
}

/** In-house vision API (Ollama/llava on buddy's GPU). No 3rd party. Validates response before accepting. */
async function runInHouseVision(base64: string, mimeType: string): Promise<string | null> {
  if (!INHOUSE_AI_URL) return null
  try {
    const res = await fetch(`${INHOUSE_AI_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: base64, mime_type: mimeType }),
      signal: AbortSignal.timeout(90000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { raw_content?: string; error?: string }
    const raw = data.raw_content?.trim()
    if (!raw) return null
    const validated = parseAndValidateValidatorResponse(raw)
    if (!validated.ok) return null
    return raw
  } catch {
    return null
  }
}

/** Fallback: Gemini with image, no Google Search (works on free tier, no billing). */
async function runGeminiImageOnly(
  base64: string,
  mimeType: string,
  geminiKey: string
): Promise<string | null> {
  const prompt = `You are helping a user list an item for sale. Look at this image and respond with a JSON object (no markdown) with these exact keys:
- "suggestedTitle": A short listing title (max 80 chars).
- "itemDescription": A 1-2 sentence description (condition, key features). Plain text, no code.
- "suggestedPrice": A price string in SOL (e.g. "0.5") or USD (e.g. "25") — estimate from typical market value.
- "category": One of: ${CATEGORIES.join(', ')}. Usually "for-sale".
- "subcategory": For for-sale use one of: ${SUBCATEGORIES_FOR_SALE.join(', ')}. Otherwise "other".
- "searchKeywords": An array of 3-6 search terms, e.g. ["vintage lamp", "brass", "table lamp"].
- "suggestedTokenName": A token name for the item, e.g. "Vintage Lamp Token".
- "suggestedTokenSymbol": 3-6 char ticker, e.g. "VLAMP".
- "suggestedTokenDescription": A 1-sentence marketing blurb for token metadata.`
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: base64 } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 600 },
        }),
      }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const hasAnyProvider = !!(supabaseAdmin && (await (async () => {
    const { data } = await supabaseAdmin.from('ai_validators').select('id').eq('status', 'active').limit(1)
    return (data?.length ?? 0) > 0
  })())) || INHOUSE_AI_URL || GEMINI_API_KEY?.trim()
  if (!hasAnyProvider) {
    return NextResponse.json(
      {
        error:
          'Image analysis is not configured. Add validators at /validators, set INHOUSE_AI_URL, or GOOGLE_GEMINI_API_KEY in Vercel.',
      },
      { status: 503 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : ''
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() || null : null

    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 })
    }

    // Resolve tier (wallet = tier lookup; no wallet = free tier)
    let tier: Tier = 'free'
    if (wallet && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
      try {
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
        const connection = new Connection(rpcUrl)
        tier = await getUserTier(wallet, connection)
      } catch {
        tier = 'free'
      }
    }

    // Per-user daily limit: 1 AI listing per day (until we run AI in-house)
    if (wallet && supabaseAdmin && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
      const walletHash = hashWalletAddress(wallet)
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('last_ai_listing_at')
        .eq('wallet_address_hash', walletHash)
        .maybeSingle()
      const lastAt = (profile as { last_ai_listing_at?: string | null } | null)?.last_ai_listing_at
      if (lastAt) {
        const lastMs = new Date(lastAt).getTime()
        const nowMs = Date.now()
        if (nowMs - lastMs < AI_LISTING_DAILY_MS) {
          const resetsAt = new Date(lastMs + AI_LISTING_DAILY_MS).toISOString()
          const resetInSec = Math.ceil((lastMs + AI_LISTING_DAILY_MS - nowMs) / 1000)
          return NextResponse.json(
            {
              error: 'You can use AI listing once per day. Connect again tomorrow or use Manual Listing.',
              resetsAt,
              retryAfter: resetInSec,
            },
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(resetInSec),
                'X-AI-Listing-Resets-At': resetsAt,
              },
            }
          )
        }
      }
    }

    const limits = getSnapToCompareLimits(tier)
    const rateLimitKey = wallet || getClientId(request)
    const { response: rateLimitResponse, headers: rateLimitHeaders } = checkTieredFindCompsRateLimit(
      request,
      rateLimitKey,
      { max: limits.maxPerMin, windowSec: 60 }
    )
    if (rateLimitResponse) return rateLimitResponse

    const base64 = extractBase64(imageBase64)
    const dataUrl = imageBase64.includes(',') ? imageBase64 : `data:image/jpeg;base64,${base64}`
    const mimeMatch = dataUrl.match(/^data:(image\/[a-z]+);base64,/i)
    const mimeType = mimeMatch?.[1] ?? 'image/jpeg'

    // Order: Validator pool → INHOUSE_AI_URL → Gemini (no 3rd party preferred)
    let rawContent = ''
    let groundingSources: GroundingSource[] = []

    const validatorResult = await runValidatorPool(base64, mimeType)
    if (validatorResult) rawContent = validatorResult

    if (!rawContent && INHOUSE_AI_URL) {
      const inHouse = await runInHouseVision(base64, mimeType)
      if (inHouse) rawContent = inHouse
    }

    if (!rawContent && GEMINI_API_KEY?.trim()) {
      const groundingResult = await runGeminiWithGoogleSearch(base64, mimeType, GEMINI_API_KEY)
      if (groundingResult && 'rawContent' in groundingResult) {
        rawContent = groundingResult.rawContent
        groundingSources = groundingResult.groundingSources
      } else if (groundingResult && 'error' in groundingResult) {
        const fallback = await runGeminiImageOnly(base64, mimeType, GEMINI_API_KEY)
        if (fallback) rawContent = fallback
        else return NextResponse.json({ error: groundingResult.error }, { status: 502 })
      } else {
        const fallback = await runGeminiImageOnly(base64, mimeType, GEMINI_API_KEY)
        if (fallback) rawContent = fallback
        else
          return NextResponse.json(
            { error: 'Image analysis failed. Try a clearer photo or use keyword search below.' },
            { status: 502 }
          )
      }
    }

    if (!rawContent) {
      return NextResponse.json(
        {
          error:
            GEMINI_API_KEY?.trim()
              ? 'Image analysis failed. Try again or use keyword search below.'
              : 'Image analysis not configured. Set INHOUSE_AI_URL or GOOGLE_GEMINI_API_KEY.',
        },
        { status: GEMINI_API_KEY?.trim() ? 502 : 503 }
      )
    }

    // Validate and sanitize all AI responses before use (validator, inhouse, Gemini)
    const validation = parseAndValidateValidatorResponse(rawContent)
    const parsed = validation.ok
      ? validation.parsed
      : {
          itemDescription: rawContent.slice(0, 500),
          category: 'for-sale' as const,
          subcategory: 'other' as const,
          searchKeywords: [] as string[],
        }

    const keywords = Array.isArray(parsed.searchKeywords) ? parsed.searchKeywords : []
    const suggestedCategory = (parsed.category && CATEGORIES.includes(parsed.category)) ? parsed.category : 'for-sale'
    const suggestedSubcategory = (parsed.subcategory && SUBCATEGORIES_FOR_SALE.includes(parsed.subcategory)) ? parsed.subcategory : 'other'

    let comps: unknown[] = []
    if (supabaseAdmin && keywords.length > 0) {
      const kws = keywords.slice(0, 5).map((k) => k.replace(/'/g, "''"))
      const orParts = kws.flatMap((kw) => [`title.ilike.%${kw}%`, `description.ilike.%${kw}%`])
      const orFilter = orParts.join(',')
      const { data, error } = await supabaseAdmin
        .from('listings')
        .select('id, title, description, price, price_token, category, subcategory, images')
        .eq('status', 'active')
        .or(orFilter)
        .order('created_at', { ascending: false })
        .limit(limits.maxComps)

      if (!error && data?.length) {
        comps = data
      } else {
        for (const kw of keywords.slice(0, 3)) {
          const safeKw = kw.replace(/'/g, "''")
          const { data: d } = await supabaseAdmin
            .from('listings')
            .select('id, title, description, price, price_token, category, subcategory, images')
            .eq('status', 'active')
            .or(`title.ilike.%${safeKw}%,description.ilike.%${safeKw}%`)
            .limit(6)
          if (d?.length) {
            comps = [...comps, ...d]
            if (comps.length >= limits.maxComps) break
          }
        }
        const seen = new Set<string>()
        comps = (comps as { id: string }[]).filter((c) => {
          if (seen.has(c.id)) return false
          seen.add(c.id)
          return true
        })
      }
    }

    // Fallback suggestedPrice from comps if Gemini did not provide it
    let suggestedPrice = parsed.suggestedPrice?.trim()
    if (!suggestedPrice && Array.isArray(comps) && comps.length > 0) {
      const prices = (comps as { price?: number }[]).map((c) => c.price).filter((p): p is number => typeof p === 'number' && p > 0)
      if (prices.length > 0) {
        prices.sort((a, b) => a - b)
        const median = prices.length % 2 === 0
          ? (prices[prices.length / 2 - 1]! + prices[prices.length / 2]!) / 2
          : prices[Math.floor(prices.length / 2)]!
        suggestedPrice = String(median)
      } else if ((comps[0] as { price?: number })?.price != null) {
        suggestedPrice = String((comps[0] as { price: number }).price)
      }
    }
    if (!suggestedPrice) suggestedPrice = ''

    // Record this AI listing use for daily limit (1 per user per day)
    if (wallet && supabaseAdmin && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
      const walletHash = hashWalletAddress(wallet)
      await supabaseAdmin
        .from('profiles')
        .update({ last_ai_listing_at: new Date().toISOString() })
        .eq('wallet_address_hash', walletHash)
    }

    return NextResponse.json(
      {
        itemDescription: parsed.itemDescription ?? '',
        suggestedTitle: (parsed.suggestedTitle ?? '').slice(0, 200),
        suggestedPrice,
        suggestedCategory,
        suggestedSubcategory,
        searchKeywords: keywords,
        suggestedTokenName: (parsed.suggestedTokenName ?? '').slice(0, 100),
        suggestedTokenSymbol: (parsed.suggestedTokenSymbol ?? '').slice(0, 10),
        suggestedTokenDescription: (parsed.suggestedTokenDescription ?? '').slice(0, 500),
        comps,
        groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
        tier,
        rateLimit: {
          remaining: Number(rateLimitHeaders['X-RateLimit-Remaining']),
          limit: limits.maxPerMin,
          resetIn: Number(rateLimitHeaders['X-RateLimit-Reset']),
        },
        dailyLimit: wallet
          ? { used: 1, limit: 1, resetsAt: new Date(Date.now() + AI_LISTING_DAILY_MS).toISOString() }
          : undefined,
      },
      { headers: rateLimitHeaders }
    )
  } catch (e) {
    console.error('[find-comps-from-image]', e)
    return NextResponse.json(
      { error: 'Failed to analyze image or find comps.' },
      { status: 500 }
    )
  }
}
