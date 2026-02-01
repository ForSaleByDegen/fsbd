/**
 * Fetches listings from external classifieds (RSS) for a given area.
 * Used to show "Nearby from the web" in the browse feed.
 * 
 * Query: ?area=austin&limit=10
 * Areas: austin, sfbay, newyork, losangeles, chicago, seattle, dallas, houston, etc.
 */
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_AREAS = new Set([
  'austin', 'sfbay', 'newyork', 'losangeles', 'chicago', 'seattle', 'dallas',
  'houston', 'phoenix', 'sandiego', 'boston', 'denver', 'miami', 'atlanta',
  'portland', 'detroit', 'philadelphia', 'minneapolis', 'tampa', 'orlando',
  'sacramento', 'cleveland', 'stlouis', 'pittsburgh', 'baltimore', 'indianapolis'
])

function parseRssItems(xml: string): Array<{ title: string; link: string; description?: string }> {
  const items: Array<{ title: string; link: string; description?: string }> = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  const getTag = (block: string, tag: string): string | undefined => {
    const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block)
    if (!m) return undefined
    return m[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  }
  let m
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1]
    const title = getTag(block, 'title')
    const link = getTag(block, 'link')
    if (title && link) {
      items.push({
        title: title.slice(0, 200),
        link,
        description: getTag(block, 'description')
      })
    }
  }
  return items
}

export async function GET(request: NextRequest) {
  try {
    const area = request.nextUrl.searchParams.get('area')?.toLowerCase().trim()
    const limit = Math.min(20, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '10', 10)))

    if (!area || !ALLOWED_AREAS.has(area)) {
      return NextResponse.json(
        { error: 'Valid area required (e.g. austin, sfbay, newyork)' },
        { status: 400 }
      )
    }

    const rssUrl = `https://${area}.craigslist.org/search/sss?format=rss`
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'FSBD/1.0 (marketplace; +https://fsbd.fun)' },
      next: { revalidate: 300 }
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Could not fetch external listings' }, { status: 502 })
    }

    const xml = await res.text()
    const items = parseRssItems(xml).slice(0, limit)

    return NextResponse.json({
      source: 'External classifieds',
      attribution: 'Listings from external classifieds. Not affiliated. Prices in local currency.',
      area,
      items
    })
  } catch (e) {
    console.error('External listings error:', e)
    return NextResponse.json({ error: 'Failed to fetch external listings' }, { status: 500 })
  }
}
