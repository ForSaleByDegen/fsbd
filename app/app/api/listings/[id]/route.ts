import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

/**
 * GET /api/listings/[id]
 * Fetch a single listing by ID.
 * Uses service role to ensure wallet_address is returned correctly (RLS may hide it for anon).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing listing ID' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      console.error('Listing fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Validate wallet_address - must be base58 Solana address, not URL/hash
    const wa = data?.wallet_address
    if (wa && (/^https?:\/\//i.test(wa) || wa.includes('://') || wa.length > 50 || /[0OIl]/.test(wa))) {
      console.error('[Listings API] Invalid wallet_address for listing', id, ':', typeof wa, String(wa).slice(0, 80))
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Listing API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/listings/[id]
 * Unlist (soft delete) a listing. Owner only.
 * Body: { wallet: string, action: 'unlist' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing listing ID' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    const action = body.action

    if (!wallet || action !== 'unlist') {
      return NextResponse.json(
        { error: 'Invalid request. Provide wallet and action: "unlist".' },
        { status: 400 }
      )
    }

    const walletHash = hashWalletAddress(wallet)

    const { data: listing, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id, wallet_address_hash, status')
      .eq('id', id)
      .single()

    if (fetchError || !listing) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      return NextResponse.json(
        { error: fetchError?.message || 'Listing not found' },
        { status: 500 }
      )
    }

    if (listing.wallet_address_hash !== walletHash) {
      return NextResponse.json({ error: 'You can only unlist your own listings.' }, { status: 403 })
    }

    if (listing.status !== 'active') {
      return NextResponse.json(
        { error: `Cannot unlist: listing is ${listing.status}.` },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('listings')
      .update({ status: 'removed' })
      .eq('id', id)

    if (updateError) {
      console.error('Unlist error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: 'removed' })
  } catch (err) {
    console.error('Unlist API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
