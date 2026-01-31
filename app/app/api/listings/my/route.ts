import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

/**
 * GET /api/listings/my?wallet=xxx
 * Returns all listings for a wallet (bypasses RLS).
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')
    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
    }

    const walletHash = hashWalletAddress(wallet)
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('wallet_address_hash', walletHash)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
