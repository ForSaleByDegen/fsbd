'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

type Stats = {
  validators: { total: number; browser: number; endpoint: number }
  jobs: { total: number; pending: number; claimed: number; completed: number; timeout: number; success_rate_percent: number }
  rewards: { total_pending: number; total_paid: number }
  verifications?: { pending: number; claimed: number; completed: number }
  recent_jobs: Array<{ id: string; status: string; validator_wallet: string | null; created_at: string; claimed_at: string | null; completed_at: string | null }>
}

export default function ValidatorTrialsAdmin() {
  const { publicKey } = useWallet()
  const adminWallet = publicKey?.toString() ?? ''

  const [whitelist, setWhitelist] = useState<string[]>([])
  const [minStakeOverrides, setMinStakeOverrides] = useState<Record<string, number>>({})
  const [addWallet, setAddWallet] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [whitelistLoading, setWhitelistLoading] = useState(false)
  const [addRemoving, setAddRemoving] = useState(false)
  const [savingMinStake, setSavingMinStake] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [rewardsEnabled, setRewardsEnabled] = useState(false)
  const [rewardsSaving, setRewardsSaving] = useState(false)
  const [advancedRewards, setAdvancedRewards] = useState({
    primary_reward_share: 0.75,
    verifier_reward_share: 0.25,
    lottery_interval: 10,
    lottery_bonus_multiplier: 2,
  })
  const [advancedSaving, setAdvancedSaving] = useState(false)

  const fetchRewardsConfig = async () => {
    if (!adminWallet) return
    try {
      const res = await fetch(`/api/admin/validator-config?wallet=${encodeURIComponent(adminWallet)}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.validator_rewards_config) {
        const r = data.validator_rewards_config
        setRewardsEnabled(!!r.enabled)
        if (typeof r.primary_reward_share === 'number') setAdvancedRewards((a) => ({ ...a, primary_reward_share: r.primary_reward_share }))
        if (typeof r.verifier_reward_share === 'number') setAdvancedRewards((a) => ({ ...a, verifier_reward_share: r.verifier_reward_share }))
        if (typeof r.lottery_interval === 'number') setAdvancedRewards((a) => ({ ...a, lottery_interval: r.lottery_interval }))
        if (typeof r.lottery_bonus_multiplier === 'number') setAdvancedRewards((a) => ({ ...a, lottery_bonus_multiplier: r.lottery_bonus_multiplier }))
      }
    } catch { /* ignore */ }
  }

  const toggleRewards = async () => {
    if (!adminWallet) return
    setRewardsSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/validator-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: adminWallet, enabled: !rewardsEnabled }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      setRewardsEnabled(!rewardsEnabled)
      setMessage({ type: 'ok', text: rewardsEnabled ? 'Rewards disabled' : 'Rewards enabled — new completions will log to ledger' })
      fetchStats()
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Failed to update' })
    } finally {
      setRewardsSaving(false)
    }
  }

  const saveAdvancedRewards = async () => {
    if (!adminWallet) return
    setAdvancedSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/validator-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: adminWallet,
          primary_reward_share: Math.min(1, Math.max(0, advancedRewards.primary_reward_share)),
          verifier_reward_share: Math.min(1, Math.max(0, advancedRewards.verifier_reward_share)),
          lottery_interval: Math.max(1, advancedRewards.lottery_interval),
          lottery_bonus_multiplier: Math.max(1, advancedRewards.lottery_bonus_multiplier),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      setMessage({ type: 'ok', text: 'Tiered rewards config saved' })
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Failed to update' })
    } finally {
      setAdvancedSaving(false)
    }
  }

  const fetchWhitelist = async () => {
    if (!adminWallet) return
    setWhitelistLoading(true)
    try {
      const res = await fetch(`/api/admin/validator-whitelist?wallet=${encodeURIComponent(adminWallet)}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (Array.isArray(data.whitelist)) setWhitelist(data.whitelist)
        if (data.min_stake_overrides && typeof data.min_stake_overrides === 'object') {
          setMinStakeOverrides(data.min_stake_overrides)
        }
      }
    } catch {
      setMessage({ type: 'err', text: 'Failed to load whitelist' })
    } finally {
      setWhitelistLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!adminWallet) return
    try {
      const res = await fetch(`/api/admin/validator-stats?wallet=${encodeURIComponent(adminWallet)}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStats(data)
      }
    } catch {
      setMessage({ type: 'err', text: 'Failed to load stats' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!adminWallet) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetchWhitelist()
    fetchStats()
    fetchRewardsConfig()
  }, [adminWallet])

  const handleAdd = async () => {
    const w = addWallet.trim()
    if (!adminWallet || !w || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(w)) {
      setMessage({ type: 'err', text: 'Enter a valid Solana wallet address' })
      return
    }
    setAddRemoving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/validator-whitelist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: adminWallet, add: w }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to add')
      setWhitelist(data.whitelist ?? [...whitelist, w.toLowerCase()])
      if (data.min_stake_overrides && typeof data.min_stake_overrides === 'object') {
        setMinStakeOverrides(data.min_stake_overrides)
      }
      setAddWallet('')
      setMessage({ type: 'ok', text: 'Wallet added to whitelist' })
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Failed to add' })
    } finally {
      setAddRemoving(false)
    }
  }

  const handleRemove = async (wallet: string) => {
    if (!adminWallet) return
    setAddRemoving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/validator-whitelist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: adminWallet, remove: wallet }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to remove')
      setWhitelist(data.whitelist ?? whitelist.filter((x) => x !== wallet.toLowerCase()))
      setMinStakeOverrides((o) => {
        const next = { ...o }
        delete next[wallet.toLowerCase()]
        return next
      })
      setMessage({ type: 'ok', text: 'Wallet removed from whitelist' })
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Failed to remove' })
    } finally {
      setAddRemoving(false)
    }
  }

  const handleSetMinStake = async (wallet: string, minStake: number) => {
    if (!adminWallet) return
    setSavingMinStake(wallet)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/validator-whitelist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: adminWallet, setMinStake: { wallet, min_stake: minStake } }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to set min stake')
      setMinStakeOverrides((o) => ({ ...o, [wallet.toLowerCase()]: minStake }))
      setMessage({ type: 'ok', text: `Min stake set to ${minStake.toLocaleString()} $FSBD for ${wallet.slice(0, 8)}…` })
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Failed to set min stake' })
    } finally {
      setSavingMinStake(null)
    }
  }

  const formatShort = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`
  const formatDate = (s: string | null) => (s ? new Date(s).toLocaleString() : '—')

  if (!adminWallet) {
    return <p className="text-purple-readable font-pixel-alt text-sm">Connect wallet to manage validator trials.</p>
  }

  return (
    <div className="space-y-6">
      {/* Whitelist management */}
      <div className="p-4 border-2 border-[#660099] bg-black/50 rounded">
        <h3 className="font-pixel text-[#00ff00] mb-2 text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>
          Validator Trial Access
        </h3>
        <p className="text-purple-muted font-pixel-alt text-sm mb-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Add wallet addresses to grant validator pool access for trials. Set a per-address min $FSBD threshold — use 0 to allow validators without tokens (e.g. device validation).
        </p>

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Wallet address (base58)"
            value={addWallet}
            onChange={(e) => setAddWallet(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 bg-black border-2 border-[#660099] text-[#00ff00] font-mono text-sm"
          />
          <Button
            onClick={handleAdd}
            disabled={addRemoving || !addWallet.trim()}
            className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt"
          >
            {addRemoving ? '…' : 'Add'}
          </Button>
        </div>

        {whitelistLoading ? (
          <p className="text-purple-muted text-sm">Loading whitelist…</p>
        ) : whitelist.length === 0 ? (
          <p className="text-purple-muted text-sm">No wallets whitelisted yet.</p>
        ) : (
          <ul className="space-y-2">
            {whitelist.map((w) => (
              <li key={w} className="flex flex-wrap items-center gap-2 py-2 border-b border-[#660099]/30">
                <code className="text-cyan-400 font-mono text-xs truncate flex-1 min-w-[120px]">{w}</code>
                <span className="text-purple-muted text-xs font-pixel-alt shrink-0">Min $FSBD:</span>
                <Input
                  type="number"
                  min={0}
                  step={1000000}
                  placeholder="0 = no tokens"
                  value={minStakeOverrides[w] ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0)
                    setMinStakeOverrides((o) => {
                      if (v === undefined) {
                        const next = { ...o }
                        delete next[w]
                        return next
                      }
                      return { ...o, [w]: v }
                    })
                  }}
                  className="w-28 bg-black border border-[#660099] text-[#00ff00] font-mono text-xs h-8"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 shrink-0"
                  disabled={addRemoving || savingMinStake === w}
                  onClick={() => handleSetMinStake(w, minStakeOverrides[w] ?? 0)}
                >
                  {savingMinStake === w ? '…' : 'Set'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-500 text-amber-400 hover:bg-amber-500/20 shrink-0"
                  disabled={addRemoving}
                  onClick={() => handleRemove(w)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        {message && (
          <p className={`mt-3 text-sm font-pixel-alt ${message.type === 'ok' ? 'text-[#00ff00]' : 'text-red-400'}`}>
            {message.text}
          </p>
        )}
      </div>

      {/* Rewards ledger toggle */}
      <div className="p-4 border-2 border-[#660099] bg-black/50 rounded">
        <h3 className="font-pixel text-[#ff00ff] mb-2 text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>
          Validator Rewards Ledger
        </h3>
        <p className="text-purple-muted font-pixel-alt text-sm mb-3">
          When enabled, each completed job is logged and adds to the validator&apos;s total earned. Disabled = no ledger entries.
        </p>
        <div className="flex items-center gap-3 mb-4">
          <span className={`font-pixel-alt text-sm ${rewardsEnabled ? 'text-[#00ff00]' : 'text-amber-400'}`}>
            {rewardsEnabled ? 'Ledger ON — completions logged' : 'Ledger OFF — completions not logged'}
          </span>
          <Button
            onClick={toggleRewards}
            disabled={rewardsSaving}
            className={`border-2 font-pixel-alt ${rewardsEnabled ? 'border-amber-500 text-amber-400 hover:bg-amber-500/20' : 'border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20'}`}
          >
            {rewardsSaving ? '…' : rewardsEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
        <details className="mt-2">
          <summary className="font-pixel-alt text-cyan-400 text-sm cursor-pointer hover:text-[#00ff00]">Tiered rewards (primary / verifier / lottery)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs text-purple-muted font-pixel-alt mb-1">Primary share (0–1)</label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={advancedRewards.primary_reward_share}
                onChange={(e) => setAdvancedRewards((a) => ({ ...a, primary_reward_share: parseFloat(e.target.value) || 0.75 }))}
                className="bg-black border border-[#660099] text-[#00ff00] text-sm h-8"
              />
            </div>
            <div>
              <label className="block text-xs text-purple-muted font-pixel-alt mb-1">Verifier share (0–1)</label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={advancedRewards.verifier_reward_share}
                onChange={(e) => setAdvancedRewards((a) => ({ ...a, verifier_reward_share: parseFloat(e.target.value) || 0.25 }))}
                className="bg-black border border-[#660099] text-[#00ff00] text-sm h-8"
              />
            </div>
            <div>
              <label className="block text-xs text-purple-muted font-pixel-alt mb-1">Lottery every N jobs</label>
              <Input
                type="number"
                min={1}
                value={advancedRewards.lottery_interval}
                onChange={(e) => setAdvancedRewards((a) => ({ ...a, lottery_interval: parseInt(e.target.value, 10) || 10 }))}
                className="bg-black border border-[#660099] text-[#00ff00] text-sm h-8"
              />
            </div>
            <div>
              <label className="block text-xs text-purple-muted font-pixel-alt mb-1">Lottery bonus ×</label>
              <Input
                type="number"
                min={1}
                value={advancedRewards.lottery_bonus_multiplier}
                onChange={(e) => setAdvancedRewards((a) => ({ ...a, lottery_bonus_multiplier: parseInt(e.target.value, 10) || 2 }))}
                className="bg-black border border-[#660099] text-[#00ff00] text-sm h-8"
              />
            </div>
          </div>
          <Button
            onClick={saveAdvancedRewards}
            disabled={advancedSaving}
            size="sm"
            className="mt-3 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 font-pixel-alt text-xs"
          >
            {advancedSaving ? '…' : 'Save tiered config'}
          </Button>
        </details>
      </div>

      {/* Monitoring stats */}
      <div className="p-4 border-2 border-[#660099] bg-black/50 rounded">
        <h3 className="font-pixel text-[#ff00ff] mb-3 text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>
          Validator Pool Monitoring
        </h3>
        <p className="text-purple-muted font-pixel-alt text-sm mb-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Track validators and job completion to see if the pool is working and feasible.
        </p>

        {loading ? (
          <p className="text-purple-muted text-sm">Loading stats…</p>
        ) : stats ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-3 border border-cyan-500/50 rounded bg-cyan-500/5">
                <p className="text-xs text-purple-muted font-pixel-alt">Active Validators</p>
                <p className="text-xl font-pixel text-[#00ff00]">{stats.validators.total}</p>
                <p className="text-xs text-purple-muted mt-1">
                  {stats.validators.browser} browser, {stats.validators.endpoint} endpoint
                </p>
              </div>
              <div className="p-3 border border-cyan-500/50 rounded bg-cyan-500/5">
                <p className="text-xs text-purple-muted font-pixel-alt">Jobs Completed</p>
                <p className="text-xl font-pixel text-[#00ff00]">{stats.jobs.completed}</p>
                <p className="text-xs text-purple-muted mt-1">of {stats.jobs.total} total</p>
              </div>
              <div className="p-3 border border-cyan-500/50 rounded bg-cyan-500/5">
                <p className="text-xs text-purple-muted font-pixel-alt">Success Rate</p>
                <p className="text-xl font-pixel text-[#00ff00]">{stats.jobs.success_rate_percent}%</p>
                <p className="text-xs text-purple-muted mt-1">
                  pending: {stats.jobs.pending} · claimed: {stats.jobs.claimed} · timeout: {stats.jobs.timeout}
                </p>
              </div>
              <div className="p-3 border border-cyan-500/50 rounded bg-cyan-500/5">
                <p className="text-xs text-purple-muted font-pixel-alt">Rewards</p>
                <p className="text-xl font-pixel text-[#00ff00]">{stats.rewards.total_pending + stats.rewards.total_paid} $FSBD</p>
                <p className="text-xs text-purple-muted mt-1">
                  {stats.rewards.total_pending} pending · {stats.rewards.total_paid} paid
                  {!rewardsEnabled && (
                    <span className="block mt-1 text-amber-400">Ledger off — enable in Rewards section</span>
                  )}
                </p>
              </div>
              {stats.verifications && (
                <div className="p-3 border border-amber-500/50 rounded bg-amber-500/5">
                  <p className="text-xs text-purple-muted font-pixel-alt">Verifications</p>
                  <p className="text-xl font-pixel text-[#00ff00]">{stats.verifications.completed}</p>
                  <p className="text-xs text-purple-muted mt-1">
                    {stats.verifications.pending} pending · {stats.verifications.claimed} claimed
                  </p>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-pixel text-cyan-400 mb-2 text-sm" style={{ fontFamily: 'var(--font-pixel)' }}>
                Recent Jobs
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border border-[#660099]/50">
                  <thead>
                    <tr className="border-b border-[#660099]/50">
                      <th className="px-2 py-1 text-purple-muted font-pixel-alt">Status</th>
                      <th className="px-2 py-1 text-purple-muted font-pixel-alt">Validator</th>
                      <th className="px-2 py-1 text-purple-muted font-pixel-alt">Created</th>
                      <th className="px-2 py-1 text-purple-muted font-pixel-alt">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_jobs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-2 py-3 text-purple-muted">
                          No jobs yet. Use Snap to Compare to create jobs.
                        </td>
                      </tr>
                    ) : (
                      stats.recent_jobs.map((j) => (
                        <tr key={j.id} className="border-b border-[#660099]/30">
                          <td className="px-2 py-1">
                            <span
                              className={
                                j.status === 'completed'
                                  ? 'text-[#00ff00]'
                                  : j.status === 'timeout'
                                    ? 'text-amber-400'
                                    : 'text-purple-muted'
                              }
                            >
                              {j.status}
                            </span>
                          </td>
                          <td className="px-2 py-1 font-mono text-xs">
                            {j.validator_wallet ? formatShort(j.validator_wallet) : '—'}
                          </td>
                          <td className="px-2 py-1 text-purple-muted text-xs">{formatDate(j.created_at)}</td>
                          <td className="px-2 py-1 text-purple-muted text-xs">{formatDate(j.completed_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-[#660099] text-purple-readable hover:border-[#00ff00] hover:text-[#00ff00] font-pixel-alt"
                onClick={() => {
                  setLoading(true)
                  fetchStats()
                }}
              >
                Refresh
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-purple-muted text-sm">Could not load stats.</p>
        )}
      </div>
    </div>
  )
}
