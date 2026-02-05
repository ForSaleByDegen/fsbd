/**
 * Upload an image from an external URL to IPFS via Pinata.
 * Used for "Import from product URL" when the user wants to use the imported image.
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || ''
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud'
const MAX_SIZE = 4.5 * 1024 * 1024 // 4.5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'uploadImageFromUrl')
  if (rateLimited) return rateLimited

  try {
    const body = await request.json().catch(() => ({}))
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''
    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 })
    }

    const parsed = new URL(imageUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
    }

    if (!PINATA_JWT || PINATA_JWT.trim() === '') {
      return NextResponse.json(
        { error: 'Pinata JWT not configured' },
        { status: 500 }
      )
    }

    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FSBD/1.0)',
      },
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not fetch image: HTTP ${res.status}` },
        { status: 400 }
      )
    }

    const contentType = res.headers.get('content-type') || ''
    if (!ALLOWED_TYPES.some((t) => contentType.includes(t))) {
      return NextResponse.json(
        { error: 'Unsupported image type. Use JPEG, PNG, WebP, or GIF.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await res.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_SIZE) {
      return NextResponse.json(
        { error: `Image too large (max ${(MAX_SIZE / 1024 / 1024).toFixed(1)}MB)` },
        { status: 400 }
      )
    }

    const blob = new Blob([arrayBuffer], { type: contentType || 'image/jpeg' })
    const formData = new FormData()
    formData.append('file', blob, 'imported.png')

    const pinRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: formData,
    })

    if (!pinRes.ok) {
      const errData = await pinRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: errData.error?.message || `Pinata error: ${pinRes.status}` },
        { status: pinRes.status }
      )
    }

    const data = await pinRes.json()
    const cid = data.IpfsHash
    if (!cid) {
      return NextResponse.json(
        { error: 'No CID returned from Pinata' },
        { status: 500 }
      )
    }

    const url = `https://${PINATA_GATEWAY}/ipfs/${cid}`
    return NextResponse.json({ url })
  } catch (err) {
    console.error('[upload-image-from-url]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
