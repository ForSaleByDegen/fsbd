/**
 * POST /api/listings/find-comps-from-image
 * Analyzes an image with AI vision, describes the item, and returns comparable listings from FSBD.
 * Rate limit and max comps are tier-based (pass wallet for tier; anonymous = free tier).
 * Body: { imageBase64: string, wallet?: string }
 * Returns: { itemDescription, suggestedCategory, suggestedSubcategory, searchKeywords, comps, tier, rateLimit }
 */
import { NextRequest, NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'
import { checkTieredFindCompsRateLimit } from '@/lib/rate-limit'
import { getClientId } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserTier, getSnapToCompareLimits, type Tier } from '@/lib/tier-check'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
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

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Image analysis is not configured. Set OPENAI_API_KEY to enable Snap to Compare.' },
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

    const prompt = `You are helping a user list an item for sale on a marketplace. Look at this image and respond with a JSON object (no markdown, no code block) with these exact keys:
- "itemDescription": A 1-2 sentence description of the item for a listing (condition if visible, key features).
- "category": One of: ${CATEGORIES.join(', ')}. Usually "for-sale" for physical items.
- "subcategory": For for-sale use one of: ${SUBCATEGORIES_FOR_SALE.join(', ')}. For other categories use "other" or a sensible value.
- "searchKeywords": An array of 3-6 search terms (strings) to find similar listings, e.g. ["vintage lamp", "brass", "table lamp"]. Use specific descriptive terms.`

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
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.text()
      console.error('[find-comps-from-image] OpenAI error:', err)
      return NextResponse.json(
        { error: 'Image analysis failed. Please try a clearer photo.' },
        { status: 502 }
      )
    }

    const openaiData = await openaiRes.json() as { choices?: { message?: { content?: string } }[] }
    const rawContent = openaiData?.choices?.[0]?.message?.content ?? ''
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
