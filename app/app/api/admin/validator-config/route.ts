/**
 * Admin-only: get/update validator requirements and payout config
 * GET ?wallet=xxx - returns min_validator_stake, validator_rewards_config
 * PATCH - Body: { wallet, min_validator_stake?, ...validator_rewards_config }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin, hasPermission } from '@/lib/admin'
import { hashWalletAddress } from '@/lib/supabase'
import { parseRewardsConfig } from '@/lib/validator-rewards'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

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

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: rows } = await supabaseAdmin
      .from('platform_config')
      .select('key, value_json')
      .in('key', ['min_validator_stake', 'validator_rewards_config'])

    let min_validator_stake = 0
    let validator_rewards_config = parseRewardsConfig(null)

    for (const r of rows ?? []) {
      const row = r as { key: string; value_json: unknown }
      if (row.key === 'min_validator_stake' && typeof row.value_json === 'number') {
        min_validator_stake = Math.max(0, Math.floor(row.value_json))
      }
      if (row.key === 'validator_rewards_config') {
        validator_rewards_config = parseRewardsConfig(row.value_json)
      }
    }

    return NextResponse.json({ min_validator_stake, validator_rewards_config })
  } catch (e) {
    console.error('[admin/validator-config] GET', e)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const wallet = String(body?.wallet ?? '').trim()
    if (!wallet || !BASE58.test(wallet)) {
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

    if (typeof body.min_validator_stake === 'number' && body.min_validator_stake >= 0) {
      await supabaseAdmin.from('platform_config').upsert(
        { key: 'min_validator_stake', value_json: Math.floor(body.min_validator_stake), updated_at: new Date().toISOString(), updated_by_hash: walletHash },
        { onConflict: 'key' }
      )
    }

    const rewardsFields = [
      'enabled',
      'base_reward_per_job',
      'decay_period_days',
      'decay_percent',
      'start_date',
      'min_reward_per_job',
      'payout_min_accumulated',
      'payout_schedule',
    ] as const
    const rewardsUpdate: Record<string, unknown> = {}
    for (const k of rewardsFields) {
      if (k === 'enabled' && typeof body[k] === 'boolean') rewardsUpdate[k] = body[k]
      if ((k === 'base_reward_per_job' || k === 'decay_period_days' || k === 'decay_percent' || k === 'min_reward_per_job' || k === 'payout_min_accumulated') && typeof body[k] === 'number') {
        rewardsUpdate[k] = body[k]
      }
      if (k === 'start_date' && (body[k] === null || body[k] === '' || typeof body[k] === 'string')) {
        rewardsUpdate[k] = body[k] === null || body[k] === '' ? null : String(body[k])
      }
      if (k === 'payout_schedule' && ['immediate', 'daily', 'weekly'].includes(body[k])) {
        rewardsUpdate[k] = body[k]
      }
    }

    if (Object.keys(rewardsUpdate).length > 0) {
      const { data: existing } = await supabaseAdmin.from('platform_config').select('value_json').eq('key', 'validator_rewards_config').maybeSingle()
      const current = parseRewardsConfig((existing as { value_json?: unknown } | null)?.value_json) as Record<string, unknown>
      const merged = { ...current, ...rewardsUpdate }
      await supabaseAdmin.from('platform_config').upsert(
        { key: 'validator_rewards_config', value_json: merged, updated_at: new Date().toISOString(), updated_by_hash: walletHash },
        { onConflict: 'key' }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/validator-config] PATCH', e)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
