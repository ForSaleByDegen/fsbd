/**
 * GET /api/marketplace/hub
 * Returns merged listings: native FSBD + external (eBay, Etsy, WooCommerce)
 * Query: ?wallet=xxx (seller's listings only) or omit (all)
 * Query: ?source=all|fsbd|ebay|etsy|woocommerce (filter by source)
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

type HubItem = {
  id: string
  source: 'fsbd' | 'ebay' | 'etsy' | 'woocommerce'
  title: string
  description: string | null
  price: number | null
  price_token: string | null
  images: string[]
  category: string | null
  external_url: string | null
  wallet_address: string | null
  created_at: string
}

export async function GET(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'general')
  if (rateLimited) return rateLimited

  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    const sourceFilter = request.nextUrl.searchParams.get('source') || 'all'
    const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)))

    if (!supabaseAdmin) {
      return NextResponse.json({ items: [] })
    }

    const walletHash = wallet && BASE58.test(wallet) ? hashWalletAddress(wallet) : null
    const items: HubItem[] = []

    if (sourceFilter === 'all' || sourceFilter === 'fsbd') {
      let query = supabaseAdmin
        .from('listings')
        .select('id, title, description, price, price_token, images, category, external_listing_url, wallet_address, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (walletHash) {
        query = query.eq('wallet_address_hash', walletHash)
      }

      const { data } = await query
      for (const row of data ?? []) {
        const r = row as {
          id: string
          title: string
          description: string | null
          price: number | null
          price_token: string | null
          images: string[] | null
          category: string | null
          external_listing_url: string | null
          wallet_address: string | null
          created_at: string
        }
        items.push({
          id: r.id,
          source: 'fsbd',
          title: r.title ?? 'Untitled',
          description: r.description ?? null,
          price: r.price ?? null,
          price_token: r.price_token ?? null,
          images: Array.isArray(r.images) ? r.images : [],
          category: r.category ?? null,
          external_url: r.external_listing_url ?? null,
          wallet_address: r.wallet_address ?? null,
          created_at: r.created_at,
        })
      }
    }

    if (sourceFilter === 'all' || ['ebay', 'etsy', 'woocommerce'].includes(sourceFilter)) {
      let query = supabaseAdmin
        .from('external_synced_listings')
        .select('id, platform, title, description, price_json, images, category, external_url, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (walletHash) {
        query = query.eq('wallet_address_hash', walletHash)
      }
      if (sourceFilter !== 'all') {
        query = query.eq('platform', sourceFilter)
      }

      const { data } = await query
      for (const row of data ?? []) {
        const r = row as {
          id: string
          platform: string
          title: string
          description: string | null
          price_json: { value?: number; currency?: string } | null
          images: string[] | null
          category: string | null
          external_url: string | null
          created_at: string
        }
        const platform = r.platform as 'ebay' | 'etsy' | 'woocommerce'
        items.push({
          id: r.id,
          source: platform,
          title: r.title ?? 'Untitled',
          description: r.description ?? null,
          price: r.price_json?.value ?? null,
          price_token: r.price_json?.currency ?? null,
          images: Array.isArray(r.images) ? r.images : [],
          category: r.category ?? null,
          external_url: r.external_url ?? null,
          wallet_address: null,
          created_at: r.created_at,
        })
      }
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const truncated = items.slice(0, limit)

    return NextResponse.json({ items: truncated })
  } catch (e) {
    console.error('[marketplace/hub]', e)
    return NextResponse.json({ items: [] })
  }
}
