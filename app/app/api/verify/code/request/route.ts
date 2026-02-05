/**
 * POST /api/verify/code/request
 * Body: { wallet: string }
 * Generates a unique code + QR image for manual verification. User adds QR to listing image, then submits URL.
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const CODE_PREFIX = 'FSBD-'
const CODE_LENGTH = 6
const EXPIRES_DAYS = 7

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  const buf = randomBytes(CODE_LENGTH)
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += chars[buf[i]! % chars.length]
  }
  return CODE_PREFIX + out
}

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'verifyCode')
  if (rateLimited) return rateLimited

  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    if (!wallet || wallet.length < 32) {
      return NextResponse.json({ error: 'wallet required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
    }

    const walletHash = hashWalletAddress(wallet)
    const code = generateCode()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + EXPIRES_DAYS)

    await supabaseAdmin.from('pending_verifications').insert({
      wallet_address_hash: walletHash,
      code,
      platform: 'manual',
      expires_at: expiresAt.toISOString(),
    })

    const qrcode = await import('qrcode')
    const qrDataUrl = await qrcode.toDataURL(code, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })

    return NextResponse.json({
      code,
      qrDataUrl,
      expiresAt: expiresAt.toISOString(),
      instructions:
        'Download the QR image, add it to your listing photo (corner), save and upload to your external listing. Then submit the listing URL here.',
    })
  } catch (err) {
    console.error('[verify/code/request]', err)
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 })
  }
}
