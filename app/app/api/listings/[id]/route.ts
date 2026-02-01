import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
