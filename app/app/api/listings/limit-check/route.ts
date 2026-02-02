/**
 * GET /api/listings/limit-check?wallet=xxx
 * Returns { currentCount, maxAllowed, canCreate, tier } for listing creation
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'
import { getUserTier, getMaxListingsForTier } from '@/lib/tier-check'
import { Connection } from '@solana/web3.js'

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    if (!wallet || !supabaseAdmin) {
      return NextResponse.json({ currentCount: 0, maxAllowed: 3, canCreate: true, tier: 'free' })
    }

    const walletHash = hashWalletAddress(wallet)

    // Count active + removed listings (slots in use)
    const { count } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_address_hash', walletHash)
      .in('status', ['active', 'removed'])

    const currentCount = count ?? 0

    // Get tier (need RPC)
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl)
    let fsbdMint: string | null = null
    const { data: configRows } = await supabaseAdmin.from('platform_config').select('key, value_json')
    for (const row of configRows || []) {
      const key = (row as { key: string }).key
      const val = (row as { value_json: unknown }).value_json
      if (key === 'fsbd_token_mint' && typeof val === 'string') fsbdMint = val
    }
    const tier = await getUserTier(wallet, connection, undefined, fsbdMint || undefined)

    // Get extra_paid_slots from profile (column added in migration_extra_listing_slots)
    let extraSlots = 0
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('extra_paid_slots')
        .eq('wallet_address_hash', walletHash)
        .maybeSingle()
      extraSlots = Number((profile as { extra_paid_slots?: number } | null)?.extra_paid_slots) || 0
    } catch {
      // Column may not exist yet
    }

    const tierLimit = getMaxListingsForTier(tier)
    const maxAllowed = tierLimit + extraSlots
    const canCreate = currentCount < maxAllowed

    return NextResponse.json({
      currentCount,
      maxAllowed,
      canCreate,
      tier,
      extraSlots,
      fsbd_token_mint: fsbdMint || null,
    })
  } catch (e) {
    console.error('[limit-check]', e)
    return NextResponse.json({ currentCount: 0, maxAllowed: 3, canCreate: true, tier: 'free' })
  }
}
