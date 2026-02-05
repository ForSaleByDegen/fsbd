/**
 * GET /api/verify/ebay/connect?wallet=xxx
 * Starts eBay OAuth flow — redirects to eBay consent page.
 * Requires: EBAY_APP_ID, EBAY_CERT_ID, EBAY_RU_NAME (RuName = redirect URI)
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
].join(' ')

export async function GET(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'verifyOAuth')
  if (rateLimited) return rateLimited

  const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
  const origin = request.nextUrl.origin
  if (!wallet || wallet.length < 32) {
    return NextResponse.redirect(`${origin}/profile?error=invalid_wallet`)
  }

  const appId = process.env.EBAY_APP_ID
  const ruName = process.env.EBAY_RU_NAME
  const isSandbox = process.env.EBAY_SANDBOX === 'true'

  if (!appId || !ruName) {
    console.error('[verify/ebay/connect] Missing EBAY_APP_ID or EBAY_RU_NAME')
    return NextResponse.redirect(`${request.nextUrl.origin}/profile?error=ebay_not_configured`)
  }

  const state = randomBytes(24).toString('base64url')
  const walletHash = hashWalletAddress(wallet)

  if (supabaseAdmin) {
    await supabaseAdmin.from('oauth_states').insert({
      state,
      wallet_address_hash: walletHash,
      platform: 'ebay',
      code_verifier: null,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
  }

  const base = isSandbox ? 'https://auth.sandbox.ebay.com' : 'https://auth.ebay.com'
  const params = new URLSearchParams({
    client_id: appId,
    response_type: 'code',
    redirect_uri: ruName,
    scope: EBAY_SCOPES,
    state,
  })
  const authUrl = `${base}/oauth2/authorize?${params.toString()}`

  return NextResponse.redirect(authUrl)
}
