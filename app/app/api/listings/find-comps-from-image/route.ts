/**
 * POST /api/listings/find-comps-from-image
 * Analyzes an image with AI vision, describes the item, and returns comparable listings from FSBD.
 * Pipeline order: 1) Gemini + Google Search grounding (ListingGenius), 2) Vision→Gemini, 3) Gemini image, 4) OpenAI.
 * Rate limit and max comps are tier-based (pass wallet for tier; anonymous = free tier).
 * Body: { imageBase64: string, wallet?: string }
 * Returns: { itemDescription, suggestedCategory, suggestedSubcategory, searchKeywords, comps, groundingSources?, tier, rateLimit }
 */
import { NextRequest, NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'
import { checkTieredFindCompsRateLimit } from '@/lib/rate-limit'
import { getClientId } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserTier, getSnapToCompareLimits, type Tier } from '@/lib/tier-check'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY
const VISION_API_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY || process.env.GOOGLE_VISION_API_KEY
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

function parseOpenAIError(err: string): string {
  try {
    const j = JSON.parse(err) as { error?: { code?: string; message?: string } }
    const msg = j?.error?.message ?? ''
    if (/invalid_api_key|incorrect_api_key|authentication/i.test(msg)) return 'OpenAI API key is invalid. Check your OPENAI_API_KEY.'
    if (/rate_limit|quota|overloaded/i.test(msg)) return 'OpenAI is busy. Please try again in a minute.'
    if (/content_policy|safety/i.test(msg)) return 'Image was blocked. Try a different photo.'
    if (msg) return msg.slice(0, 150)
  } catch { /* ignore */ }
  return 'Image analysis failed. Try a clearer photo or use keyword search below.'
}

function parseGeminiError(err: string): string {
  try {
    const j = JSON.parse(err) as { error?: { status?: string; message?: string } }
    const msg = j?.error?.message ?? ''
    if (/API_KEY_INVALID|invalid.*key/i.test(msg)) return 'Gemini API key is invalid. Get a free key at aistudio.google.com/apikey'
    if (/RESOURCE_EXHAUSTED|429|quota/i.test(msg)) return 'Gemini rate limit reached. Try again in a minute.'
    if (/SAFETY|blocked|harmful/i.test(msg)) return 'Image was blocked by safety filters. Try a different photo.'
    if (msg) return msg.slice(0, 150)
  } catch { /* ignore */ }
  return 'Image analysis failed. Try a clearer photo or use keyword search below.'
}

type VisionWebDetection = {
  bestGuessLabels?: { label?: string }[]
  webEntities?: { description?: string; score?: number }[]
}
type VisionLabel = { description?: string; score?: number }
type VisionResponse = {
  error?: unknown
  webDetection?: VisionWebDetection
  labelAnnotations?: VisionLabel[]
}

type GroundingSource = { title?: string; uri?: string }

/** ListingGenius pipeline: Gemini + Google Search grounding. Returns { rawContent, groundingSources } or null. */
async function runGeminiWithGoogleSearch(
  base64: string,
  mimeType: string,
  geminiKey: string
): Promise<{ rawContent: string; groundingSources: GroundingSource[] } | null> {
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
    if (!searchRes.ok) return null
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
    if (!genRes.ok) return null
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

/** Call Google Cloud Vision API; return findings text or null on failure */
async function getGoogleVisionFindings(base64: string): Promise<string | null> {
  if (!VISION_API_KEY) return null
  try {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [
                { type: 'WEB_DETECTION', maxResults: 15 },
                { type: 'LABEL_DETECTION', maxResults: 15 },
              ],
            },
          ],
        }),
      }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { responses?: VisionResponse[] }
    const r: VisionResponse | undefined = data?.responses?.[0]
    if (!r || r.error) return null

    const parts: string[] = []
    const bestGuess = r.webDetection?.bestGuessLabels?.map((x) => x.label).filter(Boolean)
    if (bestGuess?.length) parts.push(`Best guess: ${bestGuess.join(', ')}`)

    const webEntities = r.webDetection?.webEntities
      ?.filter((e) => e.description && (e.score ?? 0) > 0.5)
      .map((e) => e.description)
      .slice(0, 10)
    if (webEntities?.length) parts.push(`Related: ${webEntities.join(', ')}`)

    const labels = r.labelAnnotations
      ?.filter((l) => (l.score ?? 0) > 0.7)
      .map((l) => l.description)
      .slice(0, 10)
    if (labels?.length) parts.push(`Labels: ${labels.join(', ')}`)

    return parts.length ? parts.join('. ') : null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const hasDirectVision = !!(OPENAI_API_KEY || GEMINI_API_KEY)
  const hasVisionPipeline = !!(VISION_API_KEY && GEMINI_API_KEY)
  if (!hasDirectVision && !hasVisionPipeline) {
    return NextResponse.json(
      {
        error:
          'Image analysis is not configured. Set OPENAI_API_KEY or GOOGLE_GEMINI_API_KEY to enable Snap to Compare. ' +
          'Optionally add GOOGLE_CLOUD_VISION_API_KEY for Google Vision → Gemini pipeline. Get a free Gemini key at aistudio.google.com/apikey',
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

    const base64 = extractBase64(imageBase64)
    const dataUrl = base64.includes(',') ? imageBase64 : `data:image/jpeg;base64,${base64}`

    const promptWithImage = `You are helping a user list an item for sale on a marketplace. Look at this image and respond with a JSON object (no markdown, no code block) with these exact keys:
- "itemDescription": A 1-2 sentence description of the item for a listing (condition if visible, key features).
- "category": One of: ${CATEGORIES.join(', ')}. Usually "for-sale" for physical items.
- "subcategory": For for-sale use one of: ${SUBCATEGORIES_FOR_SALE.join(', ')}. For other categories use "other" or a sensible value.
- "searchKeywords": An array of 3-6 search terms (strings) to find similar listings, e.g. ["vintage lamp", "brass", "table lamp"]. Use specific descriptive terms.`

    const promptFromFindings = (findings: string) =>
      `Google Vision analyzed an image and found: "${findings}". Based on these findings, create a JSON object (no markdown, no code block) with these exact keys:
- "itemDescription": A 1-2 sentence listing description (condition, key features).
- "category": One of: ${CATEGORIES.join(', ')}. Usually "for-sale" for physical items.
- "subcategory": For for-sale use one of: ${SUBCATEGORIES_FOR_SALE.join(', ')}. For other categories use "other".
- "searchKeywords": An array of 3-6 search terms to find similar listings, e.g. ["vintage lamp", "brass", "table lamp"]. Use specific descriptive terms from the findings.`

    let rawContent = ''
    let groundingSources: GroundingSource[] = []
    const mimeMatch = dataUrl.match(/^data:(image\/[a-z]+);base64,/i)
    const mimeType = mimeMatch?.[1] ?? 'image/jpeg'

    // Pipeline 1: ListingGenius — Gemini + Google Search grounding (real market data)
    if (GEMINI_API_KEY) {
      const groundingResult = await runGeminiWithGoogleSearch(base64, mimeType, GEMINI_API_KEY)
      if (groundingResult) {
        rawContent = groundingResult.rawContent
        groundingSources = groundingResult.groundingSources
      }
    }

    // Pipeline 2: Google Vision (findings) → Gemini (text)
    const visionFindings = !rawContent ? await getGoogleVisionFindings(base64) : null
    if (visionFindings && GEMINI_API_KEY) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptFromFindings(visionFindings) }] }],
            generationConfig: { maxOutputTokens: 500 },
          }),
        }
      )
      if (geminiRes.ok) {
        const geminiData = (await geminiRes.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[]
        }
        rawContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      }
    }

    // Pipeline 3: Gemini with image (no grounding)
    if (!rawContent && GEMINI_API_KEY) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inline_data: { mime_type: mimeType, data: base64 } },
                  { text: promptWithImage },
                ],
              },
            ],
            generationConfig: { maxOutputTokens: 500 },
          }),
        }
      )
      if (!geminiRes.ok) {
        const err = await geminiRes.text()
        console.error('[find-comps-from-image] Gemini error:', err)
        const msg = parseGeminiError(err)
        return NextResponse.json({ error: msg }, { status: 502 })
      }
      const geminiData = (await geminiRes.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      rawContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    }

    if (!rawContent && OPENAI_API_KEY) {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: promptWithImage },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
        }),
      })
      if (!openaiRes.ok) {
        const err = await openaiRes.text()
        console.error('[find-comps-from-image] OpenAI error:', err)
        const msg = parseOpenAIError(err)
        return NextResponse.json({ error: msg }, { status: 502 })
      }
      const openaiData = (await openaiRes.json()) as { choices?: { message?: { content?: string } }[] }
      rawContent = openaiData?.choices?.[0]?.message?.content ?? ''
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
