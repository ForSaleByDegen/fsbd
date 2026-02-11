/**
 * Validator reward computation. Configurable base rate with optional decay over time.
 * Allows adjusting and slowly slowing down token distribution.
 */

export type ValidatorRewardsConfig = {
  enabled: boolean
  base_reward_per_job: number
  decay_period_days: number
  decay_percent: number
  start_date: string | null
  min_reward_per_job: number
  payout_min_accumulated: number
  payout_schedule: 'immediate' | 'daily' | 'weekly'
  primary_reward_share: number
  verifier_reward_share: number
  lottery_interval: number
  lottery_bonus_multiplier: number
}

const DEFAULT_CONFIG: ValidatorRewardsConfig = {
  enabled: false,
  base_reward_per_job: 25,
  decay_period_days: 30,
  decay_percent: 5,
  start_date: null,
  min_reward_per_job: 1,
  payout_min_accumulated: 100,
  payout_schedule: 'weekly',
  primary_reward_share: 0.75,
  verifier_reward_share: 0.25,
  lottery_interval: 10,
  lottery_bonus_multiplier: 2,
}

/**
 * Compute current reward per job based on config and elapsed time.
 * Reward decays by decay_percent every decay_period_days.
 * Never goes below min_reward_per_job.
 */
/** Primary (fastest) validator reward: base × primary_share */
export function getPrimaryReward(config: ValidatorRewardsConfig): number {
  const base = getCurrentRewardPerJob(config)
  const share = typeof config.primary_reward_share === 'number' ? Math.min(1, Math.max(0, config.primary_reward_share)) : 0.75
  return Math.floor(base * share)
}

/** Per-verifier reward: (base × verifier_share) / verifierCount */
export function getVerifierReward(config: ValidatorRewardsConfig, verifierCount: number): number {
  if (verifierCount <= 0) return 0
  const base = getCurrentRewardPerJob(config)
  const share = typeof config.verifier_reward_share === 'number' ? Math.min(1, Math.max(0, config.verifier_reward_share)) : 0.25
  return Math.max(1, Math.floor((base * share) / verifierCount))
}

/** Lottery bonus: base × lottery_bonus_multiplier */
export function getLotteryBonus(config: ValidatorRewardsConfig): number {
  const base = getCurrentRewardPerJob(config)
  const mult = typeof config.lottery_bonus_multiplier === 'number' ? Math.max(1, config.lottery_bonus_multiplier) : 2
  return Math.floor(base * mult)
}

export function getCurrentRewardPerJob(config: ValidatorRewardsConfig): number {
  if (!config.enabled || config.base_reward_per_job <= 0) return 0

  const start = config.start_date ? new Date(config.start_date).getTime() : Date.now()
  const now = Date.now()
  const elapsedDays = Math.max(0, (now - start) / (24 * 60 * 60 * 1000))
  const periodsElapsed = elapsedDays / Math.max(1, config.decay_period_days)
  const decayFactor = Math.pow(1 - (config.decay_percent ?? 0) / 100, Math.floor(periodsElapsed))
  const reward = Math.max(
    config.min_reward_per_job ?? 1,
    Math.floor(config.base_reward_per_job * decayFactor)
  )
  return reward
}

/**
 * Parse config from platform_config value_json.
 */
export function parseRewardsConfig(raw: unknown): ValidatorRewardsConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_CONFIG
  const o = raw as Record<string, unknown>
  return {
    enabled: typeof o.enabled === 'boolean' ? o.enabled : DEFAULT_CONFIG.enabled,
    base_reward_per_job: typeof o.base_reward_per_job === 'number' ? o.base_reward_per_job : DEFAULT_CONFIG.base_reward_per_job,
    decay_period_days: typeof o.decay_period_days === 'number' ? o.decay_period_days : DEFAULT_CONFIG.decay_period_days,
    decay_percent: typeof o.decay_percent === 'number' ? o.decay_percent : DEFAULT_CONFIG.decay_percent,
    start_date: typeof o.start_date === 'string' ? o.start_date : null,
    min_reward_per_job: typeof o.min_reward_per_job === 'number' ? o.min_reward_per_job : DEFAULT_CONFIG.min_reward_per_job,
    payout_min_accumulated: typeof o.payout_min_accumulated === 'number' ? Math.max(0, o.payout_min_accumulated) : DEFAULT_CONFIG.payout_min_accumulated,
    payout_schedule: (o.payout_schedule === 'immediate' || o.payout_schedule === 'daily' || o.payout_schedule === 'weekly') ? o.payout_schedule : DEFAULT_CONFIG.payout_schedule,
    primary_reward_share: typeof o.primary_reward_share === 'number' ? Math.min(1, Math.max(0, o.primary_reward_share)) : DEFAULT_CONFIG.primary_reward_share,
    verifier_reward_share: typeof o.verifier_reward_share === 'number' ? Math.min(1, Math.max(0, o.verifier_reward_share)) : DEFAULT_CONFIG.verifier_reward_share,
    lottery_interval: typeof o.lottery_interval === 'number' ? Math.max(1, o.lottery_interval) : DEFAULT_CONFIG.lottery_interval,
    lottery_bonus_multiplier: typeof o.lottery_bonus_multiplier === 'number' ? Math.max(1, o.lottery_bonus_multiplier) : DEFAULT_CONFIG.lottery_bonus_multiplier,
  }
}
