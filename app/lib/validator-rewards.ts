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
}

const DEFAULT_CONFIG: ValidatorRewardsConfig = {
  enabled: false,
  base_reward_per_job: 10,
  decay_period_days: 30,
  decay_percent: 5,
  start_date: null,
  min_reward_per_job: 1,
}

/**
 * Compute current reward per job based on config and elapsed time.
 * Reward decays by decay_percent every decay_period_days.
 * Never goes below min_reward_per_job.
 */
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
  }
}
