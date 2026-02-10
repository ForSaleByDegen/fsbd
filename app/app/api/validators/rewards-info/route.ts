/**
 * GET /api/validators/rewards-info
 * Returns current validator reward rate (for display). No auth required.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { parseRewardsConfig, getCurrentRewardPerJob } from '@/lib/validator-rewards'

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ enabled: false, current_reward_per_job: 0 })
    }

    const { data } = await supabaseAdmin
      .from('platform_config')
      .select('value_json')
      .eq('key', 'validator_rewards_config')
      .maybeSingle()

    const raw = (data as { value_json?: unknown } | null)?.value_json
    const config = parseRewardsConfig(raw)
    const currentReward = getCurrentRewardPerJob(config)

    return NextResponse.json({
      enabled: config.enabled,
      current_reward_per_job: currentReward,
      decay_percent: config.decay_percent,
      decay_period_days: config.decay_period_days,
    })
  } catch (e) {
    console.error('[validators/rewards-info]', e)
    return NextResponse.json({ enabled: false, current_reward_per_job: 0 })
  }
}
