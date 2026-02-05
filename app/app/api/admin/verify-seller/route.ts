/**
 * POST /api/admin/verify-seller
 * Admin-only: Add a seller verification for a wallet.
 * Body: { wallet: string, platform: 'ebay'|'etsy'|'amazon'|'manual', platform_username?: string, store_url?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const PLATFORMS = ['ebay', 'etsy', 'amazon', 'manual'] as const

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'adminVerifySeller')
  if (rateLimited) return rateLimited

  try {
    const body = await request.json().catch(() => ({}))
    const adminWallet = typeof body.adminWallet === 'string' ? body.adminWallet.trim() : ''
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    const platform = body.platform
    const platformUsername = typeof body.platform_username === 'string' ? body.platform_username.trim() || null : null
    const storeUrl = typeof body.store_url === 'string' ? body.store_url.trim() || null : null

    if (!adminWallet || !wallet || !platform || !PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: 'Missing wallet, platform, or adminWallet. Platform must be ebay, etsy, amazon, or manual.' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
    }

    const adminHash = hashWalletAddress(adminWallet)
    const { data: adminRow } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('wallet_address_hash', adminHash)
      .eq('is_active', true)
      .maybeSingle()

    if (!adminRow) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const walletHash = hashWalletAddress(wallet)
    const { error } = await supabaseAdmin
      .from('seller_verifications')
      .upsert(
        {
          wallet_address_hash: walletHash,
          platform,
          platform_username: platformUsername,
          store_url: storeUrl,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'wallet_address_hash,platform',
        }
      )

    if (error) {
      console.error('[admin/verify-seller]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/verify-seller]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
