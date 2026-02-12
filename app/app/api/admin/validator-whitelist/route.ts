/**
 * Admin-only: manage ai_validators_whitelist (validator trial access)
 * GET: returns current whitelist and min_stake_overrides
 * PATCH: add/remove wallets, or set min_stake per address.
 *   Body: { wallet: admin_wallet, add?: string, remove?: string, setMinStake?: { wallet: string, min_stake: number } }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin, hasPermission } from '@/lib/admin'
import { hashWalletAddress } from '@/lib/supabase'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function normalizeWallet(s: string) {
  return s.trim().toLowerCase()
}

const MIN_STAKE_KEY = 'ai_validators_whitelist_min_stake'

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

async function getMinStakeOverrides(): Promise<Record<string, number>> {
  if (!supabaseAdmin) return {}
  const { data } = await supabaseAdmin
    .from('platform_config')
    .select('value_json')
    .eq('key', MIN_STAKE_KEY)
    .maybeSingle()
  const raw = (data as { value_json?: unknown } | null)?.value_json
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) {
    const addr = normalizeWallet(k)
    if (addr && typeof v === 'number' && v >= 0 && Number.isFinite(v)) {
      out[addr] = Math.floor(v)
    }
  }
  return out
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

    const [list, minStakeOverrides] = await Promise.all([getWhitelist(), getMinStakeOverrides()])
    return NextResponse.json({ whitelist: list, min_stake_overrides: minStakeOverrides })
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
    const setMinStake = body?.setMinStake && typeof body.setMinStake === 'object'
      ? body.setMinStake as { wallet?: string; min_stake?: number }
      : null

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

    if (!addWallet && !removeWallet && !setMinStake) {
      return NextResponse.json({ error: 'Provide add, remove, or setMinStake' }, { status: 400 })
    }

    if (addWallet && !BASE58.test(addWallet)) {
      return NextResponse.json({ error: 'Invalid wallet to add' }, { status: 400 })
    }
    if (removeWallet && !BASE58.test(removeWallet)) {
      return NextResponse.json({ error: 'Invalid wallet to remove' }, { status: 400 })
    }
    if (setMinStake) {
      const targetWallet = typeof setMinStake.wallet === 'string' ? setMinStake.wallet.trim().toLowerCase() : ''
      const minStake = typeof setMinStake.min_stake === 'number' ? setMinStake.min_stake : Number(setMinStake.min_stake)
      // Target wallet must exist in whitelist (already validated when added); use length check to avoid rejecting valid addresses
      if (!targetWallet || targetWallet.length < 32 || targetWallet.length > 44) {
        return NextResponse.json({ error: 'Invalid wallet in setMinStake' }, { status: 400 })
      }
      if (!Number.isFinite(minStake) || minStake < 0) {
        return NextResponse.json({ error: 'Invalid min_stake (must be >= 0)' }, { status: 400 })
      }
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
    let minStakeOverrides = await getMinStakeOverrides()

    if (addWallet || removeWallet) {
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
    }

    if (setMinStake) {
      const targetWallet = typeof setMinStake.wallet === 'string' ? setMinStake.wallet.trim() : ''
      const minStake = typeof setMinStake.min_stake === 'number' ? setMinStake.min_stake : Math.floor(Number(setMinStake.min_stake))
      const norm = normalizeWallet(targetWallet)
      if (list.includes(norm)) {
        minStakeOverrides = { ...minStakeOverrides, [norm]: minStake }
        await supabaseAdmin
          .from('platform_config')
          .upsert(
            {
              key: MIN_STAKE_KEY,
              value_json: minStakeOverrides,
              updated_at: new Date().toISOString(),
              updated_by_hash: walletHash,
            },
            { onConflict: 'key' }
          )
      } else {
        return NextResponse.json({ error: 'Wallet must be whitelisted before setting min_stake' }, { status: 400 })
      }
    }

    return NextResponse.json({ ok: true, whitelist: list, min_stake_overrides: minStakeOverrides })
  } catch (e) {
    console.error('[admin/validator-whitelist] PATCH', e)
    return NextResponse.json({ error: 'Failed to update whitelist' }, { status: 500 })
  }
}
