/**
 * Create extended token metadata and upload to Pinata.
 * Used when launching a token with a listing — includes description, listing link, banner, socials.
 * Returns a metadata URI suitable for pump.fun token creation.
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || process.env.PINATA_JWT || ''
const GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fsbd.fun'

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'tokenMetadata')
  if (rateLimited) return rateLimited

  try {
    if (!PINATA_JWT?.trim()) {
      return NextResponse.json({ error: 'Pinata not configured' }, { status: 503 })
    }

    const body = await request.json().catch(() => ({}))
    const name = String(body.name || '').trim()
    const symbol = String(body.symbol || '').trim()
    let description = String(body.description || '').trim() || `Token for listing on $FSBD`
    if (!description.includes('Launched on FSBD.fun')) {
      description += '\n\nLaunched on FSBD.fun'
    }
    const imageUrl = body.imageUrl
    if (!name || !symbol) {
      return NextResponse.json({ error: 'Missing name or symbol' }, { status: 400 })
    }
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 })
    }

    const externalUrl = typeof body.externalUrl === 'string' ? body.externalUrl.trim().slice(0, 500) : ''
    const website = typeof body.website === 'string' ? body.website.trim().slice(0, 500) : ''
    const twitter = typeof body.twitter === 'string' ? body.twitter.trim().slice(0, 500) : ''
    const telegram = typeof body.telegram === 'string' ? body.telegram.trim().slice(0, 500) : ''
    const discord = typeof body.discord === 'string' ? body.discord.trim().slice(0, 500) : ''
    const bannerUrl = typeof body.bannerUrl === 'string' ? body.bannerUrl.trim().slice(0, 500) : ''
    // Use listing URL (externalUrl) as website when no custom website provided
    const websiteDisplay = website || externalUrl

    const attributes: Array<{ trait_type: string; value: string }> = []
    if (websiteDisplay) attributes.push({ trait_type: 'website', value: websiteDisplay })
    if (twitter) attributes.push({ trait_type: 'twitter', value: twitter })
    if (telegram) attributes.push({ trait_type: 'telegram', value: telegram })
    if (discord) attributes.push({ trait_type: 'discord', value: discord })
    if (bannerUrl) attributes.push({ trait_type: 'banner', value: bannerUrl })

    // Pump.fun expects twitter, telegram, website as top-level fields and optionally a links object
    const metadata: Record<string, unknown> = {
      name,
      symbol,
      description,
      image: imageUrl,
      external_url: externalUrl || website || BASE_URL,
      showName: true,
      // Top-level fields for pump.fun social display
      ...(websiteDisplay && { website: websiteDisplay }),
      ...(twitter && { twitter }),
      ...(telegram && { telegram }),
      ...(discord && { discord }),
      ...(bannerUrl && { banner: bannerUrl }),
      // Links object for platforms that expect this structure (e.g. Moralis)
      ...((websiteDisplay || twitter || telegram || discord) && {
        links: {
          ...(websiteDisplay && { website: websiteDisplay }),
          ...(twitter && { twitter }),
          ...(telegram && { telegram }),
          ...(discord && { discord }),
        },
      }),
      attributes: attributes.length > 0 ? attributes : undefined,
      properties: {
        files: bannerUrl
          ? [
              { uri: imageUrl, type: 'image/png' },
              { uri: bannerUrl, type: 'image/png' },
            ]
          : [{ uri: imageUrl, type: 'image/png' }],
        category: 'image',
      },
    }

    const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: { name: `token-metadata-${symbol}-${Date.now()}.json` },
        pinataOptions: { cidVersion: 1 },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[token-metadata] Pinata error:', res.status, err)
      return NextResponse.json(
        { error: `Pinata upload failed: ${(err as { error?: string }).error || res.statusText}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    const cid = data.IpfsHash
    if (!cid) {
      return NextResponse.json({ error: 'No CID from Pinata' }, { status: 500 })
    }

    const metadataUri = `https://${GATEWAY}/ipfs/${cid}`
    return NextResponse.json({ metadataUri, uri: metadataUri })
  } catch (err) {
    console.error('[token-metadata]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
