import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { supabase, hashWalletAddress } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserTokenBalance, getUserTier, getMaxListingsForTier, getMaxImagesForTier, extractFsbdMintFromConfig, getFsbdMintAddress } from '@/lib/tier-check'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')
    const category = searchParams.get('category')
    const subcategory = searchParams.get('subcategory')?.trim()
    const delivery = searchParams.get('delivery') // 'local_pickup' | 'ship' | all
    const locationCity = searchParams.get('location_city')?.trim()
    const locationRegion = searchParams.get('location_region')?.trim()
    const listed = searchParams.get('listed') // '24h' | '7d' | '30d' | 'older'
    const sort = searchParams.get('sort') // 'newest' | 'oldest'

    if (supabase) {
      const now = new Date()
      const toIso = (d: Date) => d.toISOString()

      let query = supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .limit(100)

      if (listed && listed !== 'any') {
        if (listed === '24h') {
          const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          query = query.gte('created_at', toIso(since))
        } else if (listed === '7d') {
          const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          query = query.gte('created_at', toIso(since))
        } else if (listed === '30d') {
          const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          query = query.gte('created_at', toIso(since))
        } else if (listed === 'older') {
          const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          query = query.lt('created_at', toIso(since))
        }
      }

      query = query.order('created_at', { ascending: sort === 'oldest' })

      if (category && category !== 'all') {
        query = query.eq('category', category)
      }
      if (subcategory) {
        query = query.eq('subcategory', subcategory)
      }

      if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      }

      if (delivery === 'local_pickup') {
        query = query.in('delivery_method', ['local_pickup', 'both'])
      } else if (delivery === 'ship') {
        query = query.in('delivery_method', ['ship', 'both'])
      }

      if (locationCity) {
        query = query.ilike('location_city', `%${locationCity}%`)
      }
      if (locationRegion) {
        query = query.ilike('location_region', `%${locationRegion}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return NextResponse.json(data || [])
    }

    // Fallback: return empty array
    return NextResponse.json([])
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const wa = String(body.wallet_address ?? '').trim()

    // Beta mode: block listing creation until platform is open
    if (process.env.NEXT_PUBLIC_BETA_MODE === 'true') {
      return NextResponse.json(
        { error: 'Platform is in beta. Listings will be enabled when we launch.' },
        { status: 403 }
      )
    }

    // Validate wallet_address before storing (prevents corrupted data)
    if (!wa || !BASE58.test(wa)) {
      return NextResponse.json(
        { error: 'Invalid wallet address. Please reconnect your wallet and try again.' },
        { status: 400 }
      )
    }
    try {
      new PublicKey(wa)
    } catch {
      return NextResponse.json(
        { error: 'Invalid wallet address format. Please reconnect your wallet.' },
        { status: 400 }
      )
    }

    const walletHash = hashWalletAddress(wa)
    let listingData = { ...body, wallet_address: wa, wallet_address_hash: walletHash }

    // Resolve fsbd mint for tier checks - robust parsing (string or { value } object)
    let fsbdMint: string | null = null
    if (supabaseAdmin) {
      const { data: configRows } = await supabaseAdmin.from('platform_config').select('key, value_json')
      fsbdMint = extractFsbdMintFromConfig((configRows as { key: string; value_json: unknown }[]) || null)
    }
    const mintForTier = fsbdMint || getFsbdMintAddress(null)

    // Admin bypass for image limit (admins get max 4)
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

    // Get tier via balance-check API (same as limit-check/chat) for reliable $FSBD detection
    let tier: 'free' | 'bronze' | 'silver' | 'gold' = 'free'
    try {
      const base = request.nextUrl?.origin || `https://${process.env.VERCEL_URL || 'fsbd.fun'}`
      const res = await fetch(`${base}/api/config/balance-check?wallet=${encodeURIComponent(wa)}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok && typeof data.tier === 'string') {
        tier = data.tier as 'free' | 'bronze' | 'silver' | 'gold'
      } else {
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
        const connection = new Connection(rpcUrl)
        tier = await getUserTier(wa, connection, undefined, mintForTier)
      }
    } catch {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
      const connection = new Connection(rpcUrl)
      tier = await getUserTier(wa, connection, undefined, mintForTier)
    }

    // Enforce image limit by tier
    const images = Array.isArray(body.images) ? body.images : []
    const maxImages = isAdmin ? 4 : getMaxImagesForTier(tier)
    if (images.length > maxImages) {
      return NextResponse.json(
        { error: `Your tier allows up to ${maxImages} image(s) per listing. You submitted ${images.length}. Hold more $FSBD to unlock more images.` },
        { status: 403 }
      )
    }
    listingData = { ...listingData, images: images.slice(0, maxImages) }

    // Enforce listing cap (tier + extra paid slots) - admin bypass
    if (supabaseAdmin && !isAdmin) {
      const { count } = await supabaseAdmin
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('wallet_address_hash', walletHash)
        .in('status', ['active', 'removed'])
      const currentCount = count ?? 0

      let extraSlots = 0
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('extra_paid_slots')
          .eq('wallet_address_hash', walletHash)
          .maybeSingle()
        extraSlots = Number((profile as { extra_paid_slots?: number } | null)?.extra_paid_slots) || 0
      } catch {}

      const maxAllowed = getMaxListingsForTier(tier) + extraSlots
      if (currentCount >= maxAllowed) {
        return NextResponse.json(
          {
            error: `Listing limit reached (${maxAllowed} max for your tier). Purchase extra slots with 10,000 $FSBD each.`,
          },
          { status: 403 }
        )
      }
    }

    // Digital asset: verify ownership server-side before insert
    if (body.asset_type && body.asset_mint) {
      const base = request.nextUrl?.origin || `https://${process.env.VERCEL_URL || 'fsbd.fun'}`
      const verifyRes = await fetch(`${base}/api/verify-asset-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: wa,
          assetType: body.asset_type,
          mint: body.asset_mint,
          minPercent: body.meme_coin_min_percent || 0,
        }),
      })
      const verifyData = await verifyRes.json().catch(() => ({}))
      if (!verifyData.verified) {
        return NextResponse.json(
          { error: verifyData.error || 'Ownership verification failed. Ensure you hold the asset.' },
          { status: 403 }
        )
      }
      listingData = {
        ...listingData,
        asset_verified_at: new Date().toISOString(),
      }
    }

    // Enforce auction creation gate (tier limit) - uses $FSBD holdings
    if (body.is_auction === true) {
      let auctionMinTokens = 10000000
      let fsbdMint: string | null = null
      if (supabaseAdmin) {
        const { data: configRows } = await supabaseAdmin
          .from('platform_config')
          .select('key, value_json')
        for (const row of configRows || []) {
          const key = (row as { key: string }).key
          const val = (row as { value_json: unknown }).value_json
          if (key === 'auction_min_tokens') {
            auctionMinTokens = typeof val === 'number' ? val : parseInt(String(val), 10) || 10000000
          } else if (key === 'fsbd_token_mint' && typeof val === 'string') {
            fsbdMint = val
          }
        }
      }
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
      const connection = new Connection(rpcUrl)
      const balance = await getUserTokenBalance(wa, connection, fsbdMint || undefined)
      if (balance < auctionMinTokens) {
        return NextResponse.json(
          { error: `Auction creation requires ${auctionMinTokens.toLocaleString()} $FSBD. Your balance: ${balance.toLocaleString()} $FSBD.` },
          { status: 403 }
        )
      }
    }

    // Prefer supabaseAdmin (bypasses RLS) for reliable insert
    const client = supabaseAdmin || supabase
    if (client) {
      const { data, error } = await client
        .from('listings')
        .insert([listingData])
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    return NextResponse.json({ id: 'mock-' + Date.now(), ...listingData })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
