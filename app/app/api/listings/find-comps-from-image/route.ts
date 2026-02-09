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
import { getUserTier, getSnapToCompareLimits, type Tier } from '@/lib/tier-check'

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: base64 } },
                {
                  text: `Identify this item precisely. Use Google Search to find current active listings for similar items on platforms like eBay, Amazon, or specialized marketplaces. Return a brief summary of what you found.`,
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
        groundingMetadata?: {
          groundingChunks?: { web?: { title?: string; uri?: string } }[]
        }
      }[]
    }
    const cand = searchData?.candidates?.[0]
    const identifiedText = cand?.content?.parts?.[0]?.text ?? ''
    const chunks = cand?.groundingMetadata?.groundingChunks ?? []
    const groundingSources: GroundingSource[] = chunks
      .filter((c) => c?.web?.uri)
      .map((c) => ({ title: c.web?.title, uri: c.web?.uri }))
      .slice(0, 10)

    // Step 2: Generate listing JSON from identified item + search results
    const sourcesStr =
      groundingSources.length > 0
        ? JSON.stringify(groundingSources.slice(0, 5).map((s) => ({ title: s.title, uri: s.uri })))
        : 'No direct market matches'
    const genPrompt = `Based on the item identified as "${identifiedText.slice(0, 300)}" and these search results: ${sourcesStr}, create a JSON object (no markdown) with these exact keys:
- "itemDescription": A 1-2 sentence listing description (condition, key features).
- "category": One of: ${CATEGORIES.join(', ')}. Usually "for-sale" for physical items.
- "subcategory": For for-sale use one of: ${SUBCATEGORIES_FOR_SALE.join(', ')}. For other categories use "other".
- "searchKeywords": An array of 3-6 search terms, e.g. ["vintage lamp", "brass", "table lamp"]. Use specific descriptive terms.`

    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: genPrompt }] }],
          generationConfig: { maxOutputTokens: 500 },
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

/** Fallback: Gemini with image, no Google Search (works on free tier, no billing). */
async function runGeminiImageOnly(
  base64: string,
  mimeType: string,
  geminiKey: string
): Promise<string | null> {
  const prompt = `You are helping a user list an item for sale. Look at this image and respond with a JSON object (no markdown) with these exact keys:
- "itemDescription": A 1-2 sentence description (condition, key features).
- "category": One of: ${CATEGORIES.join(', ')}. Usually "for-sale".
- "subcategory": For for-sale use one of: ${SUBCATEGORIES_FOR_SALE.join(', ')}. Otherwise "other".
- "searchKeywords": An array of 3-6 search terms, e.g. ["vintage lamp", "brass", "table lamp"].`
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
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
          generationConfig: { maxOutputTokens: 500 },
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
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      {
        error:
          'Image analysis is not configured. Set GOOGLE_GEMINI_API_KEY in Vercel. Get a free key at aistudio.google.com/apikey',
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

    const limits = getSnapToCompareLimits(tier)
    const rateLimitKey = wallet || getClientId(request)
    const { response: rateLimitResponse, headers: rateLimitHeaders } = checkTieredFindCompsRateLimit(
      request,
      rateLimitKey,
      { max: limits.maxPerMin, windowSec: 60 }
    )
    if (rateLimitResponse) return rateLimitResponse

    if (!GEMINI_API_KEY?.trim()) {
      return NextResponse.json(
        {
          error:
            'Gemini API key is not configured. Set GOOGLE_GEMINI_API_KEY in Vercel. Get a free key at aistudio.google.com/apikey',
        },
        { status: 503 }
      )
    }

    const base64 = extractBase64(imageBase64)
    const dataUrl = imageBase64.includes(',') ? imageBase64 : `data:image/jpeg;base64,${base64}`
    const mimeMatch = dataUrl.match(/^data:(image\/[a-z]+);base64,/i)
    const mimeType = mimeMatch?.[1] ?? 'image/jpeg'

    // Try ListingGenius first (Gemini + Google Search grounding — may require billing)
    let rawContent = ''
    let groundingSources: GroundingSource[] = []
    const groundingResult = await runGeminiWithGoogleSearch(base64, mimeType, GEMINI_API_KEY)

    if (groundingResult && 'rawContent' in groundingResult) {
      rawContent = groundingResult.rawContent
      groundingSources = groundingResult.groundingSources
    } else if (groundingResult && 'error' in groundingResult) {
      // Grounding failed (e.g. billing) — try fallback without Google Search (free tier)
      const fallback = await runGeminiImageOnly(base64, mimeType, GEMINI_API_KEY)
      if (fallback) {
        rawContent = fallback
      } else {
        return NextResponse.json({ error: groundingResult.error }, { status: 502 })
      }
    } else {
      // Grounding returned null — try fallback
      const fallback = await runGeminiImageOnly(base64, mimeType, GEMINI_API_KEY)
      if (fallback) {
        rawContent = fallback
      } else {
        return NextResponse.json(
          { error: 'Image analysis failed. Try a clearer photo or use keyword search below.' },
          { status: 502 }
        )
      }
    }

    let parsed: { itemDescription?: string; category?: string; subcategory?: string; searchKeywords?: string[] }
    try {
      const cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      parsed = JSON.parse(cleaned) as typeof parsed
    } catch {
      parsed = {
        itemDescription: rawContent.slice(0, 500),
        category: 'for-sale',
        subcategory: 'other',
        searchKeywords: [],
      }
    }

    const keywords = Array.isArray(parsed.searchKeywords) ? parsed.searchKeywords : []
    const suggestedCategory = CATEGORIES.includes(parsed.category ?? '') ? parsed.category! : 'for-sale'
    const suggestedSubcategory = parsed.subcategory ?? 'other'

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

    return NextResponse.json(
      {
        itemDescription: parsed.itemDescription ?? '',
        suggestedCategory,
        suggestedSubcategory,
        searchKeywords: keywords,
        comps,
        groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
        tier,
        rateLimit: {
          remaining: Number(rateLimitHeaders['X-RateLimit-Remaining']),
          limit: limits.maxPerMin,
          resetIn: Number(rateLimitHeaders['X-RateLimit-Reset']),
        },
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
