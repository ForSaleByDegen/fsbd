/**
 * GET /api/notifications?wallet=xxx
 * Returns notification counts and recent items: DMs, public chat on listings, bids.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const RECENT_DAYS = 7

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    if (!wallet || !supabaseAdmin) {
      return NextResponse.json({ total: 0, items: [], count: 0 })
    }

    const walletHash = hashWalletAddress(wallet)
    const since = new Date()
    since.setDate(since.getDate() - RECENT_DAYS)
    const sinceIso = since.toISOString()

    const items: Array<{
      type: string
      listingId: string
      listingTitle?: string
      message?: string
      amount?: number
      createdAt: string
    }> = []

    // 1. DM threads: messages from OTHER party where user is participant (seller or buyer)
    const { data: dmThreads } = await supabaseAdmin
      .from('chat_threads')
      .select('id, listing_id, seller_wallet_hash, buyer_wallet_hash')
      .or(`seller_wallet_hash.eq.${walletHash},buyer_wallet_hash.eq.${walletHash}`)

    if (dmThreads?.length) {
      const threadIds = dmThreads.map((t) => t.id)
      const { data: dmMessages } = await supabaseAdmin
        .from('chat_messages')
        .select('id, thread_id, sender_wallet_hash, created_at')
        .in('thread_id', threadIds)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(50)

      for (const m of dmMessages || []) {
        const thread = dmThreads.find((t) => t.id === m.thread_id)
        if (!thread) continue
        if (m.sender_wallet_hash === walletHash) continue
        const { data: listing } = await supabaseAdmin
          .from('listings')
          .select('id, title')
          .eq('id', thread.listing_id)
          .single()
        items.push({
          type: 'dm',
          listingId: thread.listing_id,
          listingTitle: (listing as { title?: string })?.title,
          message: 'New message in conversation',
          createdAt: m.created_at,
        })
      }
    }

    // 2. Public chat on user's listings (from others)
    const { data: myListings } = await supabaseAdmin
      .from('listings')
      .select('id, title')
      .eq('wallet_address', wallet)

    if (myListings?.length) {
      const myListingIds = myListings.map((l) => l.id)
      const { data: pubMsgs } = await supabaseAdmin
        .from('listing_public_messages')
        .select('id, listing_id, sender_wallet_hash, created_at')
        .in('listing_id', myListingIds)
        .gte('created_at', sinceIso)
        .neq('sender_wallet_hash', walletHash)
        .order('created_at', { ascending: false })
        .limit(20)

      for (const m of pubMsgs || []) {
        const listing = myListings.find((l) => l.id === m.listing_id)
        items.push({
          type: 'public_chat',
          listingId: m.listing_id,
          listingTitle: (listing as { title?: string })?.title,
          message: 'New message in public chat',
          createdAt: m.created_at,
        })
      }
    }

    // 3. Bids on user's auction listings
    const { data: auctionListings } = await supabaseAdmin
      .from('listings')
      .select('id, title, highest_bid, updated_at')
      .eq('wallet_address', wallet)
      .eq('is_auction', true)
      .not('highest_bidder', 'is', null)
      .gte('updated_at', sinceIso)

    for (const l of auctionListings || []) {
      items.push({
        type: 'bid',
        listingId: (l as { id: string }).id,
        listingTitle: (l as { title?: string }).title,
        amount: (l as { highest_bid?: number }).highest_bid,
        message: 'New bid on your auction',
        createdAt: (l as { updated_at: string }).updated_at,
      })
    }

    // Sort by createdAt desc, dedupe by type+listingId, take top 20
    const seen = new Set<string>()
    const unique = items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((x) => {
        const key = `${x.type}:${x.listingId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 20)

    return NextResponse.json({
      total: unique.length,
      count: unique.length,
      items: unique,
    })
  } catch (e) {
    console.error('Notifications error:', e)
    return NextResponse.json({ total: 0, items: [], count: 0 })
  }
}
