/**
 * GET /api/seller/listings?wallet=xxx
 * Returns a seller's active listings for public profile view.
 * Returns [] when profile_private is true (listings hidden, stats still visible).
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')
    if (!wallet || typeof wallet !== 'string') {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      )
    }

    const sellerHash = hashWalletAddress(wallet)

    // Check profile_private
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('profile_private')
      .eq('wallet_address_hash', sellerHash)
      .maybeSingle()

    const profilePrivate = Boolean((profile as { profile_private?: boolean } | null)?.profile_private)

    if (profilePrivate) {
      return NextResponse.json([])
    }

    const { data: listings, error } = await supabaseAdmin
      .from('listings')
      .select('id, title, price, price_token, token_symbol, status, images, category, created_at')
      .eq('wallet_address_hash', sellerHash)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[seller/listings] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(listings || [])
  } catch (err) {
    console.error('[seller/listings] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
