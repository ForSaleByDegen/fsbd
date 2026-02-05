/**
 * GET /api/seller/verifications?wallet=xxx
 * Returns verification status for a wallet (platforms verified, badge eligibility)
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'sellerVerifications')
  if (rateLimited) return rateLimited

  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    if (!wallet) {
      return NextResponse.json({ error: 'wallet required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ verified: false, platforms: [] })
    }

    const walletHash = hashWalletAddress(wallet)
    const { data, error } = await supabaseAdmin
      .from('seller_verifications')
      .select('platform, platform_username, store_url, verified_at')
      .eq('wallet_address_hash', walletHash)

    if (error) {
      console.error('[seller/verifications]', error)
      return NextResponse.json({ verified: false, platforms: [] })
    }

    const platforms = (data || []).map((r: { platform: string; platform_username?: string; store_url?: string; verified_at?: string }) => ({
      platform: r.platform,
      username: r.platform_username ?? undefined,
      storeUrl: r.store_url ?? undefined,
      verifiedAt: r.verified_at ?? undefined,
    }))

    return NextResponse.json({
      verified: platforms.length > 0,
      platforms,
    })
  } catch (err) {
    console.error('[seller/verifications]', err)
    return NextResponse.json({ verified: false, platforms: [] })
  }
}
