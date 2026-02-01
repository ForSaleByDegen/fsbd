import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/listings/[id]/wallet-check
 * Debug: Check if listing has valid wallet_address (does not expose full address).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('wallet_address')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const wa = data.wallet_address
    const s = String(wa ?? '')
    const looksLikeUrl = /^https?:\/\//i.test(s) || s.includes('://')
    const hasInvalidBase58 = /[0OIl]/.test(s)

    return NextResponse.json({
      hasWalletAddress: !!s,
      length: s.length,
      looksLikeUrl,
      hasInvalidBase58Char: hasInvalidBase58,
      first15: s.slice(0, 15),
      valid: !looksLikeUrl && s.length >= 32 && s.length <= 44 && !hasInvalidBase58,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
