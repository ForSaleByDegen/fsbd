/**
 * Admin-only: update platform config
 * Body: { wallet: string, auction_min_tokens?: number, tier_bronze?: number, tier_silver?: number, tier_gold?: number, fsbd_token_mint?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin, hasPermission } from '@/lib/admin'
import { hashWalletAddress } from '@/lib/supabase'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const wallet = String(body?.wallet ?? '').trim()
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
    }

    const isAdminUser = await isAdmin(wallet)
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const canManage = await hasPermission(wallet, 'manage_listings') || await hasPermission(wallet, 'view_analytics')
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const walletHash = hashWalletAddress(wallet)
    const updates: Record<string, number | string> = {}
    if (typeof body.auction_min_tokens === 'number' && body.auction_min_tokens >= 0) {
      updates.auction_min_tokens = Math.floor(body.auction_min_tokens)
    }
    if (typeof body.tier_bronze === 'number' && body.tier_bronze >= 0) {
      updates.tier_bronze = Math.floor(body.tier_bronze)
    }
    if (typeof body.tier_silver === 'number' && body.tier_silver >= 0) {
      updates.tier_silver = Math.floor(body.tier_silver)
    }
    if (typeof body.tier_gold === 'number' && body.tier_gold >= 0) {
      updates.tier_gold = Math.floor(body.tier_gold)
    }
    if (typeof body.fsbd_token_mint === 'string' && body.fsbd_token_mint.trim()) {
      updates.fsbd_token_mint = body.fsbd_token_mint.trim()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid config updates' }, { status: 400 })
    }

    for (const [key, value] of Object.entries(updates)) {
      await supabaseAdmin
        .from('platform_config')
        .upsert(
          {
            key,
            value_json: value,
            updated_at: new Date().toISOString(),
            updated_by_hash: walletHash,
          },
          { onConflict: 'key' }
        )
    }

    return NextResponse.json({ ok: true, updated: updates })
  } catch (e) {
    console.error('Admin config error:', e)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
