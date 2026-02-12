/**
 * POST /api/connect/woocommerce
 * Connect WooCommerce store: store URL + Consumer Key + Secret
 * Validates by fetching products, then stores encrypted credentials
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'
import { encryptSellerToken } from '@/lib/seller-verification-encrypt'
import { verifyWalletSignature } from '@/lib/verify-wallet-signature'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'connectWooCommerce')
  if (rateLimited) return rateLimited

  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    const storeUrl = typeof body.store_url === 'string' ? body.store_url.trim() : ''
    const consumerKey = typeof body.consumer_key === 'string' ? body.consumer_key.trim() : ''
    const consumerSecret = typeof body.consumer_secret === 'string' ? body.consumer_secret.trim() : ''

    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Valid wallet required' }, { status: 400 })
    }
    const message = typeof body.message === 'string' ? body.message : ''
    const signature = typeof body.signature === 'string' ? body.signature : ''
    if (!message || !signature || !verifyWalletSignature(wallet, message, signature, 'connect_woocommerce')) {
      return NextResponse.json(
        { error: 'Wallet signature required. Please sign the message to prove you own this wallet.' },
        { status: 401 }
      )
    }
    if (!storeUrl || !isValidUrl(storeUrl)) {
      return NextResponse.json({ error: 'Valid store URL required (https:// or http://)' }, { status: 400 })
    }
    if (process.env.NODE_ENV === 'production') {
      try {
        const u = new URL(storeUrl)
        if (u.protocol === 'http:') {
          return NextResponse.json(
            { error: 'Production requires HTTPS store URL' },
            { status: 400 }
          )
        }
      } catch {
        /* invalid url already caught above */
      }
    }
    if (!consumerKey || !consumerSecret) {
      return NextResponse.json({ error: 'Consumer key and secret required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const base = storeUrl.replace(/\/$/, '')
    const testUrl = `${base}/wp-json/wc/v3/products?per_page=1`
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    const testRes = await fetch(testUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    })

    if (!testRes.ok) {
      const errText = await testRes.text()
      return NextResponse.json(
        { error: 'Could not connect to store. Check URL and API credentials.' },
        { status: 400 }
      )
    }

    const walletHash = hashWalletAddress(wallet)
    const keyEncrypted = encryptSellerToken(consumerKey)
    const secretEncrypted = encryptSellerToken(consumerSecret)

    const { error } = await supabaseAdmin.from('woocommerce_connections').upsert(
      {
        wallet_address_hash: walletHash,
        store_url: base,
        consumer_key_encrypted: keyEncrypted,
        consumer_secret_encrypted: secretEncrypted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'wallet_address_hash' }
    )

    if (error) {
      console.error('[connect/woocommerce]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[connect/woocommerce]', e)
    return NextResponse.json({ error: 'Failed to connect WooCommerce' }, { status: 500 })
  }
}
