/**
 * POST /api/verify/code/verify
 * Body: { wallet: string, listingUrl: string }
 * Fetches listing page, extracts main image, decodes QR, validates code, marks verified.
 */
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

function extractMeta(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${name}["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

function extractImageFromHtml(html: string, hostname?: string): string | null {
  const og = extractMeta(html, 'image')
  if (og && /^https?:\/\//i.test(og)) return og
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = scriptRegex.exec(html)) !== null) {
    try {
      const raw = m[1].trim().replace(/\/\*[\s\S]*?\*\//g, '')
      const parsed = JSON.parse(raw)
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      for (const obj of arr) {
        if (obj['@type'] === 'Product' && obj.image) {
          const img = obj.image
          const url = Array.isArray(img) ? img[0] : img
          if (typeof url === 'string' && /^https?:\/\//i.test(url)) return url
        }
      }
    } catch {
      /* skip */
    }
  }
  if (hostname && /amazon\./i.test(hostname)) {
    const hiResMatch = html.match(/"hiRes"\s*:\s*"([^"]+)"/i)
    if (hiResMatch?.[1]) {
      let url = hiResMatch[1].replace(/\\u0026/g, '&').trim()
      if (url.startsWith('//')) url = 'https:' + url
      if (/^https?:\/\//i.test(url)) return url
    }
  }
  if (hostname && /ebay\./i.test(hostname)) {
    const ebayMatch = html.match(/"image":\s*\[?\s*"([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"\]?/i)
    if (ebayMatch?.[1]) return ebayMatch[1].replace(/\\/g, '')
  }
  if (hostname && /etsy\./i.test(hostname)) {
    const etsyMatch = html.match(/"full_url":\s*"([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)
    if (etsyMatch?.[1]) return etsyMatch[1].replace(/\\u002F/g, '/').replace(/\\/g, '')
  }
  return null
}

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'verifyCode')
  if (rateLimited) return rateLimited

  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    const listingUrl = typeof body.listingUrl === 'string' ? body.listingUrl.trim() : ''

    if (!wallet || !listingUrl) {
      return NextResponse.json({ error: 'wallet and listingUrl required' }, { status: 400 })
    }

    let parsed: URL
    try {
      parsed = new URL(listingUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid listing URL' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
    }

    const walletHash = hashWalletAddress(wallet)

    const pageRes = await fetch(listingUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      next: { revalidate: 0 },
    })

    if (!pageRes.ok) {
      return NextResponse.json({ error: 'Could not fetch listing page' }, { status: 502 })
    }

    const html = await pageRes.text()
    const imageUrl = extractImageFromHtml(html, parsed.hostname)

    if (!imageUrl) {
      return NextResponse.json({ error: 'No product image found on listing' }, { status: 400 })
    }

    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FSBD/1.0)' },
      next: { revalidate: 0 },
    })
    if (!imgRes.ok) {
      return NextResponse.json({ error: 'Could not fetch listing image' }, { status: 502 })
    }

    const buf = Buffer.from(await imgRes.arrayBuffer())
    const { data, info } = await sharp(buf)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const width = info.width
    const height = info.height
    const rgba = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength)

    const jsQR = await import('jsqr')
    const decoded = jsQR.default(rgba, width, height)

    if (!decoded || !decoded.data) {
      return NextResponse.json({
        error: 'QR code not found in image. Add the verification QR to your listing photo and try again.',
      }, { status: 400 })
    }

    const foundCode = decoded.data.trim().toUpperCase()

    const { data: allPending } = await supabaseAdmin
      .from('pending_verifications')
      .select('id, code')
      .eq('wallet_address_hash', walletHash)
      .eq('platform', 'manual')
      .gte('expires_at', new Date().toISOString())

    const match = (allPending || []).find(
      (r: { code: string }) => r.code.toUpperCase() === foundCode
    )

    if (!match) {
      return NextResponse.json({
        error: (allPending?.length ?? 0) === 0
          ? 'No valid verification code. Request a new code first.'
          : 'QR code does not match. Use the code we gave you and add it to your listing image.',
      }, { status: 400 })
    }

    await supabaseAdmin.from('pending_verifications').delete().eq('id', match.id)

    await supabaseAdmin.from('seller_verifications').upsert(
      {
        wallet_address_hash: walletHash,
        platform: 'manual',
        platform_username: 'Verified (manual)',
        store_url: listingUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'wallet_address_hash,platform' }
    )

    return NextResponse.json({ ok: true, message: 'Verified successfully!' })
  } catch (err) {
    console.error('[verify/code/verify]', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
