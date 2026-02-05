/**
 * GET /api/verify/ebay/callback?code=xxx&state=xxx
 * eBay OAuth callback — exchanges code for token, fetches user, stores verification.
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'http://localhost:3000'

function redirect(path: string, error?: string) {
  const url = new URL(path, baseUrl)
  if (error) url.searchParams.set('error', error)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'verifyOAuth')
  if (rateLimited) return rateLimited

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')

  if (!code || !state) {
    return redirect('/profile', 'ebay_denied')
  }

  if (!supabaseAdmin) {
    return redirect('/profile', 'config_error')
  }

  const { data: row, error: lookupError } = await supabaseAdmin
    .from('oauth_states')
    .select('wallet_address_hash')
    .eq('state', state)
    .single()

  if (lookupError || !row) {
    return redirect('/profile', 'invalid_state')
  }

  await supabaseAdmin.from('oauth_states').delete().eq('state', state)

  const appId = process.env.EBAY_APP_ID
  const certId = process.env.EBAY_CERT_ID
  const ruName = process.env.EBAY_RU_NAME
  const isSandbox = process.env.EBAY_SANDBOX === 'true'

  if (!appId || !certId || !ruName) {
    return redirect('/profile', 'ebay_not_configured')
  }

  const tokenUrl = isSandbox
    ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
    : 'https://api.ebay.com/identity/v1/oauth2/token'

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: ruName,
  })

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${appId}:${certId}`).toString('base64'),
    },
    body: body.toString(),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('[verify/ebay/callback] token exchange failed:', err)
    return redirect('/profile', 'ebay_token_failed')
  }

  const tokenData = (await tokenRes.json()) as { access_token: string }
  const accessToken = tokenData.access_token

  const identityBase = isSandbox ? 'https://apiz.sandbox.ebay.com' : 'https://apiz.ebay.com'
  const userRes = await fetch(`${identityBase}/commerce/identity/v1/user/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!userRes.ok) {
    console.error('[verify/ebay/callback] getUser failed:', await userRes.text())
    return redirect('/profile', 'ebay_user_failed')
  }

  const userData = (await userRes.json()) as {
    userId?: string
    username?: string
    businessAccount?: { name?: string; doingBusinessAs?: string }
    individualAccount?: { firstName?: string; lastName?: string }
  }

  const platformUserId = userData.userId || ''
  const platformUsername =
    userData.username ||
    userData.businessAccount?.doingBusinessAs ||
    userData.businessAccount?.name ||
    [userData.individualAccount?.firstName, userData.individualAccount?.lastName].filter(Boolean).join(' ') ||
    'eBay Seller'
  const storeUrl = platformUserId ? `https://www.ebay.com/usr/${platformUsername || platformUserId}` : undefined

  await supabaseAdmin
    .from('seller_verifications')
    .upsert(
      {
        wallet_address_hash: row.wallet_address_hash,
        platform: 'ebay',
        platform_user_id: platformUserId || null,
        platform_username: platformUsername || null,
        store_url: storeUrl || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'wallet_address_hash,platform' }
    )

  return redirect('/profile', undefined)
}
