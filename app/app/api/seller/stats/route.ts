/**
 * GET /api/seller/stats?wallet=xxx
 * Public seller stats - ALWAYS returned regardless of profile_private.
 * Stats: reviews, listing count, sold, bought, shipped, received.
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

    // Profile: total_confirmed_received, total_listings_sold
    let totalConfirmed = 0
    let totalSold = 0
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('total_confirmed_received, total_listings_sold')
        .eq('wallet_address_hash', sellerHash)
        .maybeSingle()
      totalConfirmed = Number(profile?.total_confirmed_received) || 0
      totalSold = Number(profile?.total_listings_sold) || 0
    } catch {
      // Columns may not exist
    }

    // Listing counts from listings table (always public stats)
    let listingCount = 0
    let itemsBought = 0
    let itemsShipped = 0
    try {
      const { count: listingCnt } = await supabaseAdmin
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('wallet_address_hash', sellerHash)
      listingCount = listingCnt ?? 0

      const { count: boughtCnt } = await supabaseAdmin
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_wallet_hash', sellerHash)
      itemsBought = boughtCnt ?? 0

      const { count: shippedCnt } = await supabaseAdmin
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('wallet_address_hash', sellerHash)
        .not('shipped_at', 'is', null)
      itemsShipped = shippedCnt ?? 0
    } catch {
      // May fail if columns don't exist
    }

    // Feedback: count, avg rating, recent (table may not exist)
    let feedbackList: Array<{ id: string; rating: number; comment: string | null; created_at: string }> = []
    try {
      const { data = [] } = await supabaseAdmin
        .from('seller_feedback')
        .select('id, rating, comment, created_at')
        .eq('seller_wallet_hash', sellerHash)
        .order('created_at', { ascending: false })
        .limit(20)
      feedbackList = data as typeof feedbackList
    } catch {
      // Table may not exist
    }

    const count = feedbackList.length
    const avgRating = count > 0
      ? feedbackList.reduce((sum: number, f: { rating: number }) => sum + f.rating, 0) / count
      : null

    return NextResponse.json({
      totalConfirmedReceived: totalConfirmed,
      totalListingsSold: totalSold,
      listingCount,
      itemsBought,
      itemsShipped,
      feedbackCount: count,
      averageRating: avgRating != null ? Math.round(avgRating * 10) / 10 : null,
      feedback: feedbackList.map((f: { id: string; rating: number; comment: string | null; created_at: string }) => ({
        id: f.id,
        rating: f.rating,
        comment: f.comment,
        createdAt: f.created_at,
      })),
    })
  } catch (err) {
    console.error('[seller/stats] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
