/**
 * Admin-only: manage ai_validators_whitelist (validator trial access)
 * GET: returns current whitelist
 * PATCH: add or remove wallets. Body: { wallet: admin_wallet, add?: string, remove?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin, hasPermission } from '@/lib/admin'
import { hashWalletAddress } from '@/lib/supabase'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function normalizeWallet(s: string) {
  return s.trim().toLowerCase()
}

async function getWhitelist(): Promise<string[]> {
  if (!supabaseAdmin) return []
  const { data } = await supabaseAdmin
    .from('platform_config')
    .select('value_json')
    .eq('key', 'ai_validators_whitelist')
    .maybeSingle()
  const raw = (data as { value_json?: unknown } | null)?.value_json
  const list = Array.isArray(raw) ? raw : []
  return list
    .filter((x: unknown): x is string => typeof x === 'string')
    .map((s) => normalizeWallet(s))
    .filter((s) => s.length > 0)
}

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
    }

    const isAdminUser = await isAdmin(wallet)
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const list = await getWhitelist()
    return NextResponse.json({ whitelist: list })
  } catch (e) {
    console.error('[admin/validator-whitelist] GET', e)
    return NextResponse.json({ error: 'Failed to fetch whitelist' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const adminWallet = String(body?.wallet ?? '').trim()
    const addWallet = typeof body.add === 'string' ? body.add.trim() : ''
    const removeWallet = typeof body.remove === 'string' ? body.remove.trim() : ''

    if (!adminWallet || !BASE58.test(adminWallet)) {
      return NextResponse.json({ error: 'Admin wallet required' }, { status: 400 })
    }

    const isAdminUser = await isAdmin(adminWallet)
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const canManage = await hasPermission(adminWallet, 'manage_listings') || await hasPermission(adminWallet, 'view_analytics')
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (!addWallet && !removeWallet) {
      return NextResponse.json({ error: 'Provide add or remove wallet' }, { status: 400 })
    }

    if (addWallet && !BASE58.test(addWallet)) {
      return NextResponse.json({ error: 'Invalid wallet to add' }, { status: 400 })
    }
    if (removeWallet && !BASE58.test(removeWallet)) {
      return NextResponse.json({ error: 'Invalid wallet to remove' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    let list = await getWhitelist()

    if (addWallet) {
      const norm = normalizeWallet(addWallet)
      if (!list.includes(norm)) {
        list = [...list, norm].sort()
      }
    }

    if (removeWallet) {
      const norm = normalizeWallet(removeWallet)
      list = list.filter((w) => w !== norm)
    }

    const walletHash = hashWalletAddress(adminWallet)
    await supabaseAdmin
      .from('platform_config')
      .upsert(
        {
          key: 'ai_validators_whitelist',
          value_json: list,
          updated_at: new Date().toISOString(),
          updated_by_hash: walletHash,
        },
        { onConflict: 'key' }
      )

    return NextResponse.json({ ok: true, whitelist: list })
  } catch (e) {
    console.error('[admin/validator-whitelist] PATCH', e)
    return NextResponse.json({ error: 'Failed to update whitelist' }, { status: 500 })
  }
}
