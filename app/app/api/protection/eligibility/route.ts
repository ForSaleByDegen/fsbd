/**
 * GET /api/protection/eligibility?listingId=xxx&wallet=xxx
 * Returns { eligible: boolean, claimStatus?: 'none'|'pending'|'approved'|'rejected' }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const listingId = request.nextUrl.searchParams.get('listingId')?.trim()
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()

    if (!listingId || !wallet) {
      return NextResponse.json({ error: 'listingId and wallet required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
    }

    const buyerHash = hashWalletAddress(wallet)

    const { data: fee } = await supabaseAdmin
      .from('protection_fees')
      .select('id')
      .eq('listing_id', listingId)
      .eq('buyer_wallet_hash', buyerHash)
      .maybeSingle()

    const eligible = !!fee

    const { data: claim } = await supabaseAdmin
      .from('protection_claims')
      .select('status')
      .eq('listing_id', listingId)
      .eq('buyer_wallet_hash', buyerHash)
      .maybeSingle()

    const claimStatus = claim?.status ?? (eligible ? 'none' : undefined)

    return NextResponse.json({ eligible, claimStatus })
  } catch (err) {
    console.error('[protection/eligibility]', err)
    return NextResponse.json({ error: 'Failed to check eligibility' }, { status: 500 })
  }
}
