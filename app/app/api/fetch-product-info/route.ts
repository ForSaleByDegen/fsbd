/**
 * Fetches product metadata (title, description, price, image) from a URL.
 * Supports Open Graph meta tags, JSON-LD product schema, and common e-commerce patterns.
 * Used when creating a listing from an external product URL (e.g. Amazon, eBay).
 */
import { NextRequest, NextResponse } from 'next/server'

function extractMeta(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${name}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
    new RegExp(`<meta[^>]+property=["']twitter:${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return decodeEntities(m[1].trim())
  }
  return null
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extractJsonLdPrice(html: string): string | null {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = scriptRegex.exec(html)) !== null) {
    try {
      const raw = m[1].trim().replace(/\/\*[\s\S]*?\*\//g, '')
      const parsed = JSON.parse(raw)
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      for (const obj of arr) {
        if (obj['@type'] === 'Product' && obj.offers) {
          const offers = Array.isArray(obj.offers) ? obj.offers : [obj.offers]
          for (const o of offers) {
            const p = o.price ?? o.lowPrice ?? o.highPrice
            if (p != null) return String(p)
          }
        }
      }
    } catch {
      // skip invalid JSON
    }
  }
  return null
}

function extractAmazonPrice(html: string): string | null {
  // Amazon embeds price in various formats; price is often loaded via JS so may be missing
  const patterns = [
    /"priceAmount":\s*\{[^}]*"value":\s*([\d.]+)/i,
    /"displayAmount":\s*"[\$]?\s*([\d,]+\.?\d*)"/i,
    /data-a-color="price"[^>]*>[\s\$]*([\d,]+\.?\d*)/i,
    /["']price["'][^>]*>[\s\$]*([\d,]+\.?\d*)/i,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1].replace(/,/g, '')
  }
  return null
}

function extractTitle(html: string): string | null {
  const t = extractMeta(html, 'title') ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  if (t) return decodeEntities(t.trim()).slice(0, 300)
  return null
}

function extractDescription(html: string): string | null {
  const d = extractMeta(html, 'description')
  if (d) return d.slice(0, 2000)
  return null
}

function extractImage(html: string): string | null {
  const img = extractMeta(html, 'image')
  if (img && /^https?:\/\//i.test(img)) return img
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const url = typeof body.url === 'string' ? body.url.trim() : ''
    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 })
    }

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    if (!parsed.protocol.startsWith('http')) {
      return NextResponse.json({ error: 'URL must be http or https' }, { status: 400 })
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not fetch page (${res.status})` },
        { status: 502 }
      )
    }

    const html = await res.text()
    const title = extractTitle(html)
    const description = extractDescription(html)
    const imageUrl = extractImage(html)

    let price: string | null = extractJsonLdPrice(html)
    if (!price && /amazon/i.test(parsed.hostname)) {
      price = extractAmazonPrice(html)
    }

    return NextResponse.json({
      title: title || undefined,
      description: description || undefined,
      price: price || undefined,
      imageUrl: imageUrl || undefined,
    })
  } catch (e) {
    console.error('Fetch product info error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch product info' },
      { status: 500 }
    )
  }
}
