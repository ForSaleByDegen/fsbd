/**
 * Token management for marketplace APIs (eBay, Etsy).
 * Returns valid access tokens, refreshing when expired.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { decryptSellerToken, encryptSellerToken } from '@/lib/seller-verification-encrypt'

const EBAY_APP_ID = process.env.EBAY_APP_ID
const EBAY_CERT_ID = process.env.EBAY_CERT_ID
const EBAY_RU_NAME = process.env.EBAY_RU_NAME
const EBAY_SANDBOX = process.env.EBAY_SANDBOX === 'true'
const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID
const ETSY_CLIENT_SECRET = process.env.ETSY_CLIENT_SECRET
const ETSY_REDIRECT_URI = process.env.ETSY_REDIRECT_URI

export type MarketplacePlatform = 'ebay' | 'etsy'

export async function getValidToken(
  walletHash: string,
  platform: MarketplacePlatform
): Promise<string | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('seller_verifications')
    .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
    .eq('wallet_address_hash', walletHash)
    .eq('platform', platform)
    .maybeSingle()

  if (error || !data) return null

  const accessEncrypted = (data as { access_token_encrypted?: string }).access_token_encrypted
  const refreshEncrypted = (data as { refresh_token_encrypted?: string }).refresh_token_encrypted
  const expiresAt = (data as { token_expires_at?: string }).token_expires_at

  if (!accessEncrypted) return null

  const bufferMinutes = 5
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : 0
  const isExpired = expiresAtMs < Date.now() + bufferMinutes * 60 * 1000

  if (!isExpired) {
    try {
      return decryptSellerToken(accessEncrypted)
    } catch {
      return null
    }
  }

  if (refreshEncrypted && platform === 'ebay') {
    const refreshed = await refreshEbayToken(walletHash)
    return refreshed
  }
  if (refreshEncrypted && platform === 'etsy') {
    const refreshed = await refreshEtsyToken(walletHash)
    return refreshed
  }
  return null
}

export async function refreshEbayToken(walletHash: string): Promise<string | null> {
  if (!supabaseAdmin || !EBAY_APP_ID || !EBAY_CERT_ID || !EBAY_RU_NAME) return null

  const { data, error } = await supabaseAdmin
    .from('seller_verifications')
    .select('refresh_token_encrypted')
    .eq('wallet_address_hash', walletHash)
    .eq('platform', 'ebay')
    .maybeSingle()

  if (error || !data) return null
  const encrypted = (data as { refresh_token_encrypted?: string }).refresh_token_encrypted
  if (!encrypted) return null

  let refreshToken: string
  try {
    refreshToken = decryptSellerToken(encrypted)
  } catch {
    return null
  }

  const tokenUrl = EBAY_SANDBOX
    ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
    : 'https://api.ebay.com/identity/v1/oauth2/token'

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    redirect_uri: EBAY_RU_NAME,
  })

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64'),
    },
    body: body.toString(),
  })

  if (!res.ok) {
    console.error('[marketplace-tokens] eBay refresh failed:', await res.text())
    return null
  }

  const tokenData = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }
  const accessToken = tokenData.access_token
  const newRefresh = tokenData.refresh_token ?? refreshToken
  const expiresIn = tokenData.expires_in ?? 7200
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  try {
    const accessEncrypted = encryptSellerToken(accessToken)
    const refreshEncrypted = encryptSellerToken(newRefresh)
    await supabaseAdmin
      .from('seller_verifications')
      .update({
        access_token_encrypted: accessEncrypted,
        refresh_token_encrypted: refreshEncrypted,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('wallet_address_hash', walletHash)
      .eq('platform', 'ebay')
    return accessToken
  } catch (e) {
    console.error('[marketplace-tokens] eBay token save failed:', e)
    return null
  }
}

export async function refreshEtsyToken(walletHash: string): Promise<string | null> {
  if (!supabaseAdmin || !ETSY_CLIENT_ID || !ETSY_REDIRECT_URI) return null

  const { data, error } = await supabaseAdmin
    .from('seller_verifications')
    .select('refresh_token_encrypted')
    .eq('wallet_address_hash', walletHash)
    .eq('platform', 'etsy')
    .maybeSingle()

  if (error || !data) return null
  const encrypted = (data as { refresh_token_encrypted?: string }).refresh_token_encrypted
  if (!encrypted) return null

  let refreshToken: string
  try {
    refreshToken = decryptSellerToken(encrypted)
  } catch {
    return null
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: ETSY_CLIENT_ID,
    refresh_token: refreshToken,
  })

  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(ETSY_CLIENT_SECRET
        ? { Authorization: 'Basic ' + Buffer.from(`${ETSY_CLIENT_ID}:${ETSY_CLIENT_SECRET}`).toString('base64') }
        : {}),
    },
    body: body.toString(),
  })

  if (!res.ok) {
    console.error('[marketplace-tokens] Etsy refresh failed:', await res.text())
    return null
  }

  const tokenData = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }
  const accessToken = tokenData.access_token
  const newRefresh = tokenData.refresh_token ?? refreshToken
  const expiresIn = tokenData.expires_in ?? 900
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  try {
    const accessEncrypted = encryptSellerToken(accessToken)
    const refreshEncrypted = encryptSellerToken(newRefresh)
    await supabaseAdmin
      .from('seller_verifications')
      .update({
        access_token_encrypted: accessEncrypted,
        refresh_token_encrypted: refreshEncrypted,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('wallet_address_hash', walletHash)
      .eq('platform', 'etsy')
    return accessToken
  } catch (e) {
    console.error('[marketplace-tokens] Etsy token save failed:', e)
    return null
  }
}
