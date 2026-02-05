/**
 * GET /api/verify/etsy/connect?wallet=xxx
 * Starts Etsy OAuth flow (PKCE) — redirects to Etsy consent page.
 * Requires: ETSY_CLIENT_ID, ETSY_REDIRECT_URI
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const ETSY_SCOPES = 'shops_r profile_r'

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function GET(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'verifyOAuth')
  if (rateLimited) return rateLimited

  const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
  if (!wallet || wallet.length < 32) {
    return NextResponse.redirect(new URL('/profile?error=invalid_wallet', request.url))
  }

  const clientId = process.env.ETSY_CLIENT_ID
  const redirectUri = process.env.ETSY_REDIRECT_URI

  if (!clientId || !redirectUri) {
    console.error('[verify/etsy/connect] Missing ETSY_CLIENT_ID or ETSY_REDIRECT_URI')
    return NextResponse.redirect(new URL('/profile?error=etsy_not_configured', request.url))
  }

  const state = base64UrlEncode(randomBytes(24))
  const codeVerifier = base64UrlEncode(randomBytes(32))
  const codeChallenge = base64UrlEncode(
    createHash('sha256').update(codeVerifier).digest()
  )
  const walletHash = hashWalletAddress(wallet)

  if (supabaseAdmin) {
    await supabaseAdmin.from('oauth_states').insert({
      state,
      wallet_address_hash: walletHash,
      platform: 'etsy',
      code_verifier: codeVerifier,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: ETSY_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  const authUrl = `https://www.etsy.com/oauth/connect?${params.toString()}`

  return NextResponse.redirect(authUrl)
}
