/**
 * GET /api/marketplace/connected?wallet=xxx
 * Returns which platforms the user has connected (for cross-post UI)
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'general')
  if (rateLimited) return rateLimited

  const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  }

  const walletHash = hashWalletAddress(wallet)
  const result = { ebay: false, etsy: false, woocommerce: false }

  if (!supabaseAdmin) {
    return NextResponse.json(result)
  }

  const [verifications, woo] = await Promise.all([
    supabaseAdmin
      .from('seller_verifications')
      .select('platform')
      .eq('wallet_address_hash', walletHash)
      .in('platform', ['ebay', 'etsy']),
    supabaseAdmin
      .from('woocommerce_connections')
      .select('id')
      .eq('wallet_address_hash', walletHash)
      .maybeSingle(),
  ])

  for (const r of verifications.data || []) {
    const p = (r as { platform: string }).platform
    if (p === 'ebay') result.ebay = true
    if (p === 'etsy') result.etsy = true
  }

  if (woo.data) result.woocommerce = true

  return NextResponse.json(result)
}
