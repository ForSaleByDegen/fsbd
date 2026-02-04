/**
 * GET /api/listings/limit-check?wallet=xxx
 * Returns { currentCount, maxAllowed, canCreate, tier } for listing creation.
 * Uses balance-check API for tier (same logic as chat) so $FSBD holdings are detected reliably.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'
import {
  getMaxListingsForTier,
  extractFsbdMintFromConfig,
  getFsbdMintAddress,
  getUserTier,
  getSubscriptionListingLimit,
  EARLY_ADOPTER_LISTING_LIMIT,
  type SubscriptionTier,
} from '@/lib/tier-check'
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

    // Admin bypass: allow creation regardless of listing cap
    let isAdmin = false
    if (supabaseAdmin) {
      const { data: adminRow } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('wallet_address_hash', walletHash)
        .eq('is_active', true)
        .maybeSingle()
      isAdmin = !!adminRow
    }
    if (isAdmin) {
      return NextResponse.json({
        currentCount,
        maxAllowed: 999,
        canCreate: true,
        tier: 'gold',
        extraSlots: 0,
        fsbd_token_mint: null,
      })
    }

    // Use balance-check API (same as chat) for reliable tier detection with Bitquery fallback
    const base = request.nextUrl.origin || `https://${process.env.VERCEL_URL || 'fsbd.fun'}`
    let tier: 'free' | 'bronze' | 'silver' | 'gold' | 'platinum' = 'free'
    try {
      const res = await fetch(`${base}/api/config/balance-check?wallet=${encodeURIComponent(wallet)}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok && typeof data.tier === 'string') {
        tier = data.tier as 'free' | 'bronze' | 'silver' | 'gold' | 'platinum'
      } else {
        const { data: configRows } = await supabaseAdmin.from('platform_config').select('key, value_json')
        const fm = extractFsbdMintFromConfig((configRows as { key: string; value_json: unknown }[]) || null)
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
        tier = await getUserTier(wallet, new Connection(rpcUrl), undefined, fm || getFsbdMintAddress(null))
      }
    } catch {
      try {
        const { data: configRows } = await supabaseAdmin.from('platform_config').select('key, value_json')
        const fm = extractFsbdMintFromConfig((configRows as { key: string; value_json: unknown }[]) || null)
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
        tier = await getUserTier(wallet, new Connection(rpcUrl), undefined, fm || getFsbdMintAddress(null))
      } catch {
        /* keep free */
      }
    }

    // Get profile: extra_paid_slots, early_adopter_rank, subscription_expires_at, subscription_tier
    let extraSlots = 0
    let earlyAdopterRank: number | null = null
    let subscriptionExpiresAt: string | null = null
    let subscriptionTier: SubscriptionTier | null = null
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('extra_paid_slots, early_adopter_rank, subscription_expires_at, subscription_tier')
        .eq('wallet_address_hash', walletHash)
        .maybeSingle()
      const p = profile as { extra_paid_slots?: number; early_adopter_rank?: number | null; subscription_expires_at?: string | null; subscription_tier?: string | null } | null
      extraSlots = Number(p?.extra_paid_slots) || 0
      earlyAdopterRank = typeof p?.early_adopter_rank === 'number' && p.early_adopter_rank >= 1 && p.early_adopter_rank <= 100 ? p.early_adopter_rank : null
      subscriptionExpiresAt = p?.subscription_expires_at ?? null
      subscriptionTier = ['basic', 'bronze', 'silver', 'gold'].includes(p?.subscription_tier ?? '') ? (p!.subscription_tier as SubscriptionTier) : null
    } catch {
      // Columns may not exist yet
    }

    // Early adopter: first 100 users get 99 listings
    let baseLimit: number
    if (earlyAdopterRank !== null) {
      baseLimit = EARLY_ADOPTER_LISTING_LIMIT
    } else {
      const tierLimit = getMaxListingsForTier(tier)
      const subActive = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) > new Date() : false
      const subLimit = subActive && subscriptionTier ? getSubscriptionListingLimit(subscriptionTier) : 0
      baseLimit = Math.max(1, tierLimit, subLimit)
    }

    const maxAllowed = baseLimit + extraSlots
    const canCreate = currentCount < maxAllowed

    const { data: configRows } = await supabaseAdmin.from('platform_config').select('key, value_json')
    const fsbdMint = extractFsbdMintFromConfig((configRows as { key: string; value_json: unknown }[]) || null)

    const subscriptionActive = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) > new Date() : false
    return NextResponse.json({
      currentCount,
      maxAllowed,
      canCreate,
      tier,
      extraSlots,
      fsbd_token_mint: fsbdMint || getFsbdMintAddress(null),
      isEarlyAdopter: earlyAdopterRank !== null,
      subscriptionActive,
    })
  } catch (e) {
    console.error('[limit-check]', e)
    return NextResponse.json({ currentCount: 0, maxAllowed: 3, canCreate: true, tier: 'free' })
  }
}
