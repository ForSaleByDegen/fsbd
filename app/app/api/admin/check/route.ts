/**
 * GET /api/admin/check?wallet=xxx
 * Returns { isAdmin: boolean } - used by client to show admin-only UI (e.g. token launch)
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    if (!wallet || !supabaseAdmin) {
      return NextResponse.json({ isAdmin: false })
    }
    const walletHash = hashWalletAddress(wallet)
    const { data } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('wallet_address_hash', walletHash)
      .eq('is_active', true)
      .maybeSingle()
    return NextResponse.json({ isAdmin: !!data })
  } catch {
    return NextResponse.json({ isAdmin: false })
  }
}
