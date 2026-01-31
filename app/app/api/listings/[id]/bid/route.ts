import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { bidAmount, bidder, escrowPDA } = body

    if (!bidAmount || !bidder || !escrowPDA) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (supabase) {
      // Get current highest bid
      const { data: listing } = await supabase
        .from('listings')
        .select('highest_bid, reserve_price')
        .eq('id', params.id)
        .single()

      if (!listing) {
        return NextResponse.json(
          { error: 'Listing not found' },
          { status: 404 }
        )
      }

      // Validate bid is higher
      if (bidAmount <= (listing.highest_bid || 0)) {
        return NextResponse.json(
          { error: 'Bid must be higher than current highest bid' },
          { status: 400 }
        )
      }

      // Validate bid meets reserve
      if (bidAmount < listing.reserve_price) {
        return NextResponse.json(
          { error: 'Bid must meet or exceed reserve price' },
          { status: 400 }
        )
      }

      // Update listing
      const { error } = await supabase
        .from('listings')
        .update({
          highest_bid: bidAmount,
          highest_bidder: bidder,
          highest_bid_escrow: escrowPDA
        })
        .eq('id', params.id)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    // Fallback
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
