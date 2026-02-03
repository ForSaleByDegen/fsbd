/**
 * Proxy for pump.fun IPFS upload to avoid CORS.
 * Browser cannot call pump.fun/api/ipfs directly due to CORS.
 * This API route runs server-side and forwards the upload.
 * Accepts: multipart/form-data (file, name, symbol) OR JSON (imageUrl, name, symbol)
 * Resizes images to pump.fun's ~1MB limit (512x512 recommended).
 */
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

const PUMP_IPFS = 'https://pump.fun/api/ipfs'
const MAX_SIZE_BYTES = 900 * 1024 // pump.fun ~1MB limit; stay under to be safe
const MAX_DIMENSION = 512

/** Resize/compress image to fit pump.fun's ~1MB limit. Returns { buffer, mime }. */
async function resizeForPump(blob: Blob): Promise<{ buffer: Buffer; mime: string }> {
  const buffer = Buffer.from(await blob.arrayBuffer())
  const isPng = blob.type?.includes('png') ?? false
  const mime = isPng ? 'image/png' : 'image/jpeg'

  if (buffer.length <= MAX_SIZE_BYTES) {
    return { buffer, mime: blob.type?.startsWith('image/') ? blob.type : mime }
  }

  let out: Buffer

  if (isPng) {
    out = await sharp(buffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer()
    let level = 8
    while (out.length > MAX_SIZE_BYTES && level > 0) {
      out = await sharp(buffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: level })
        .toBuffer()
      level -= 2
    }
  } else {
    let quality = 85
    out = await sharp(buffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer()
    while (out.length > MAX_SIZE_BYTES && quality > 20) {
      quality -= 15
      out = await sharp(buffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality })
        .toBuffer()
    }
    return { buffer: out, mime: 'image/jpeg' }
  }
  return { buffer: out, mime: 'image/png' }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let file: Blob
    let name: string
    let symbol: string
    let description: string
    let pumpExtras: { twitter?: string; telegram?: string; website?: string; banner?: string } = {}

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const f = formData.get('file')
      if (!f || !(f instanceof Blob)) {
        return NextResponse.json({ error: 'Missing image file' }, { status: 400 })
      }
      file = f
      name = String(formData.get('name') || '').trim()
      symbol = String(formData.get('symbol') || '').trim()
      description = String(formData.get('description') || '').trim() || `Token for listing on $FSBD`
    } else if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}))
      const imageUrl = body.imageUrl
      if (!imageUrl || typeof imageUrl !== 'string') {
        return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 })
      }
      name = String(body.name || '').trim()
      symbol = String(body.symbol || '').trim()
      description = String(body.description || '').trim() || `Token for listing on $FSBD`
      const imgRes = await fetch(imageUrl)
      if (!imgRes.ok) throw new Error('Could not fetch image from URL')
      file = await imgRes.blob()
      // Extract optional socials for pump.fun FormData
      pumpExtras = {
        twitter: typeof body.twitter === 'string' ? body.twitter.trim().slice(0, 500) : undefined,
        telegram: typeof body.telegram === 'string' ? body.telegram.trim().slice(0, 500) : undefined,
        website: typeof body.website === 'string' ? body.website.trim().slice(0, 500) : undefined,
        banner: typeof body.bannerUrl === 'string' ? body.bannerUrl.trim().slice(0, 500) : undefined,
      }
    } else {
      return NextResponse.json(
        { error: 'Expected multipart/form-data or application/json' },
        { status: 400 }
      )
    }

    if (!name) return NextResponse.json({ error: 'Missing token name' }, { status: 400 })
    if (!symbol) return NextResponse.json({ error: 'Missing token symbol' }, { status: 400 })

    // Resize if over pump.fun's ~1MB limit to avoid 413
    const { buffer, mime } = await resizeForPump(file)
    const resizedBlob = new Blob([new Uint8Array(buffer)], { type: mime })

    const pumpForm = new FormData()
    pumpForm.append('file', resizedBlob, 'token-image.png')
    pumpForm.append('name', name)
    pumpForm.append('symbol', symbol)
    pumpForm.append('description', description)
    pumpForm.append('showName', 'true')
    if (pumpExtras.website) pumpForm.append('website', pumpExtras.website)
    if (pumpExtras.twitter) pumpForm.append('twitter', pumpExtras.twitter)
    if (pumpExtras.telegram) pumpForm.append('telegram', pumpExtras.telegram)

    const res = await fetch(PUMP_IPFS, {
      method: 'POST',
      body: pumpForm,
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[pump-ipfs] pump.fun error:', res.status, err)
      return NextResponse.json(
        { error: `Pump.fun IPFS failed: ${err || res.statusText}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    const metadataUri = data.metadataUri || data.uri
    if (!metadataUri) {
      return NextResponse.json(
        { error: 'No metadata URI in pump.fun response' },
        { status: 500 }
      )
    }

    return NextResponse.json({ metadataUri, uri: metadataUri })
  } catch (err) {
    console.error('[pump-ipfs]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
