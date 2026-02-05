/**
 * GET /api/verify/etsy/callback?code=xxx&state=xxx
 * Etsy OAuth callback — exchanges code for token (PKCE), fetches shop, stores verification.
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
    return redirect('/profile', 'etsy_denied')
  }

  if (!supabaseAdmin) {
    return redirect('/profile', 'config_error')
  }

  const { data: row, error: lookupError } = await supabaseAdmin
    .from('oauth_states')
    .select('wallet_address_hash, code_verifier')
    .eq('state', state)
    .single()

  if (lookupError || !row || !row.code_verifier) {
    return redirect('/profile', 'invalid_state')
  }

  await supabaseAdmin.from('oauth_states').delete().eq('state', state)

  const clientId = process.env.ETSY_CLIENT_ID
  const clientSecret = process.env.ETSY_CLIENT_SECRET
  const redirectUri = process.env.ETSY_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return redirect('/profile', 'etsy_not_configured')
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
    code_verifier: row.code_verifier,
  })

  const tokenRes = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(clientSecret ? { Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64') } : {}),
    },
    body: body.toString(),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('[verify/etsy/callback] token exchange failed:', err)
    return redirect('/profile', 'etsy_token_failed')
  }

  const tokenData = (await tokenRes.json()) as { access_token: string }
  const accessToken = tokenData.access_token
  const userId = accessToken.split('.')[0]

  if (!userId) {
    return redirect('/profile', 'etsy_user_failed')
  }

  const shopRes = await fetch(
    `https://api.etsy.com/v3/application/users/${userId}/shops`,
    {
      headers: {
        'x-api-key': clientId,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  let platformUsername = 'Etsy Seller'
  let storeUrl: string | null = null

  if (shopRes.ok) {
    const shopData = (await shopRes.json()) as {
      count?: number
      results?: Array<{ shop_id: number; shop_name: string; url: string }>
    }
    const shop = shopData.results?.[0]
    if (shop) {
      platformUsername = shop.shop_name || platformUsername
      storeUrl = shop.url || null
    }
  }

  await supabaseAdmin
    .from('seller_verifications')
    .upsert(
      {
        wallet_address_hash: row.wallet_address_hash,
        platform: 'etsy',
        platform_user_id: userId || null,
        platform_username: platformUsername || null,
        store_url: storeUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'wallet_address_hash,platform' }
    )

  return redirect('/profile', undefined)
}
