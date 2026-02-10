'use client'

import { useState, useMemo } from 'react'

type Props = {
  totalStaked: number
  totalValidators: number
  rewardPerJob: number
  onStakeChange?: (stake: number) => void
}

const STAKE_MIN = 10_000_000
const STAKE_MAX = 100_000_000
const JOBS_MIN = 10
const JOBS_MAX = 2_000

// Compute tiers: Browser (1x), Endpoint/GPU (2x), High-end GPU (4x)
const COMPUTE_OPTIONS = [
  { id: 'browser', label: 'Browser (Phi-3.5)', mult: 1 },
  { id: 'endpoint', label: 'Endpoint / GPU server', mult: 2 },
  { id: 'high-end', label: 'High-end GPU (A100, 4090)', mult: 4 },
] as const

function formatNum(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(Math.round(n))
}

/**
 * APY model: jobs distributed by (stake × compute) share of total pool weight.
 * total_pool_weight ≈ totalStaked × avgCompute (avgCompute = 2 for mix of browser/endpoint)
 * user_share = (userStake × userCompute) / (totalPoolWeight + userStake × userCompute)
 * When pool is empty, user gets 100%.
 */
function computeApy(
  userStake: number,
  userComputeMult: number,
  totalStaked: number,
  totalValidators: number,
  jobsPerMonth: number,
  rewardPerJob: number
): { apy: number; annualEarnings: number; monthlyEarnings: number; jobsShare: number } {
  if (userStake <= 0 || jobsPerMonth <= 0 || rewardPerJob <= 0) {
    return { apy: 0, annualEarnings: 0, monthlyEarnings: 0, jobsShare: 0 }
  }

  const avgCompute = 2 // mix of browser and endpoint
  const poolWeight = totalStaked * avgCompute
  const userWeight = userStake * userComputeMult
  const totalWeight = poolWeight + userWeight
  const userShare = totalWeight > 0 ? userWeight / totalWeight : 1

  const jobsToUser = jobsPerMonth * userShare
  const monthlyEarnings = jobsToUser * rewardPerJob
  const annualEarnings = monthlyEarnings * 12
  const apy = userStake > 0 ? (annualEarnings / userStake) * 100 : 0

  return { apy, annualEarnings, monthlyEarnings, jobsShare: userShare * 100 }
}

export default function ValidatorApyCalculator({
  totalStaked,
  totalValidators,
  rewardPerJob,
  onStakeChange,
}: Props) {
  const [stake, setStake] = useState(10_000_000)
  const [computeIndex, setComputeIndex] = useState(0)
  const [jobsPerMonth, setJobsPerMonth] = useState(200)

  const computeMult = COMPUTE_OPTIONS[computeIndex]!.mult

  const result = useMemo(
    () =>
      computeApy(
        stake,
        computeMult,
        totalStaked,
        totalValidators,
        jobsPerMonth,
        rewardPerJob
      ),
    [stake, computeMult, totalStaked, totalValidators, jobsPerMonth, rewardPerJob]
  )

  return (
    <div className="p-4 border-2 border-cyan-500/50 rounded-lg bg-cyan-500/5 space-y-4">
      <h3 className="font-pixel text-[#00ff00] text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>
        APY Calculator
      </h3>
      <p className="text-purple-muted font-pixel-alt text-sm">
        Estimate your returns based on stake, compute power, and platform usage. Higher stake + stronger compute = larger share of jobs.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-pixel-alt text-cyan-400 mb-2">
            Your stake: {formatNum(stake)} $FSBD
          </label>
          <input
            type="range"
            min={STAKE_MIN}
            max={STAKE_MAX}
            step={Math.max(1000, Math.floor((STAKE_MAX - STAKE_MIN) / 100))}
            value={stake}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              setStake(v)
              onStakeChange?.(v)
            }}
            className="w-full h-2 bg-[#660099]/50 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-purple-muted mt-1">
            <span>{formatNum(STAKE_MIN)}</span>
            <span>{formatNum(STAKE_MAX)}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-pixel-alt text-cyan-400 mb-2">Compute power</label>
          <div className="flex flex-wrap gap-2">
            {COMPUTE_OPTIONS.map((opt, i) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setComputeIndex(i)}
                className={`px-3 py-2 border-2 font-pixel-alt text-sm transition-colors ${
                  computeIndex === i
                    ? 'border-[#00ff00] text-[#00ff00] bg-[#00ff00]/10'
                    : 'border-[#660099] text-purple-muted hover:border-cyan-500 hover:text-cyan-400'
                }`}
              >
                {opt.label} ({opt.mult}x)
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-pixel-alt text-cyan-400 mb-2">
            Est. jobs/month: {jobsPerMonth}
          </label>
          <input
            type="range"
            min={JOBS_MIN}
            max={JOBS_MAX}
            step={10}
            value={jobsPerMonth}
            onChange={(e) => setJobsPerMonth(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-[#660099]/50 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-purple-muted mt-1">
            <span>{JOBS_MIN}</span>
            <span>{JOBS_MAX}</span>
          </div>
          <p className="text-xs text-purple-muted mt-1">
            Snap-to-Compare usage. Adjust based on platform adoption.
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-cyan-500/30 grid gap-3 sm:grid-cols-2">
        <div className="p-3 bg-black/30 rounded border border-[#00ff00]/30">
          <p className="text-xs text-purple-muted font-pixel-alt">Projected APY</p>
          <p className="text-2xl font-pixel text-[#00ff00]">{result.apy.toFixed(1)}%</p>
        </div>
        <div className="p-3 bg-black/30 rounded border border-[#00ff00]/30">
          <p className="text-xs text-purple-muted font-pixel-alt">Your job share</p>
          <p className="text-2xl font-pixel text-cyan-400">{result.jobsShare.toFixed(1)}%</p>
        </div>
        <div className="p-3 bg-black/30 rounded border border-cyan-500/30">
          <p className="text-xs text-purple-muted font-pixel-alt">Est. monthly earnings</p>
          <p className="text-xl font-pixel text-[#00ff00]">{formatNum(result.monthlyEarnings)} $FSBD</p>
        </div>
        <div className="p-3 bg-black/30 rounded border border-cyan-500/30">
          <p className="text-xs text-purple-muted font-pixel-alt">Est. annual earnings</p>
          <p className="text-xl font-pixel text-[#00ff00]">{formatNum(result.annualEarnings)} $FSBD</p>
        </div>
      </div>

      <p className="text-xs text-purple-muted">
        Pool: {formatNum(totalStaked)} $FSBD staked across {totalValidators} validators. Reward: {rewardPerJob} $FSBD/job. Estimates only; actual returns depend on platform usage and validator participation.
      </p>
    </div>
  )
}
