'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

type Stats = {
  validators: { total: number; browser: number; endpoint: number }
  jobs: { total: number; pending: number; claimed: number; completed: number; timeout: number; success_rate_percent: number }
  rewards: { total_pending: number; total_paid: number }
  recent_jobs: Array<{ id: string; status: string; validator_wallet: string | null; created_at: string; claimed_at: string | null; completed_at: string | null }>
}

export default function ValidatorTrialsAdmin() {
  const { publicKey } = useWallet()
  const adminWallet = publicKey?.toString() ?? ''

  const [whitelist, setWhitelist] = useState<string[]>([])
  const [addWallet, setAddWallet] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [whitelistLoading, setWhitelistLoading] = useState(false)
  const [addRemoving, setAddRemoving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [rewardsEnabled, setRewardsEnabled] = useState(false)
  const [rewardsSaving, setRewardsSaving] = useState(false)

  const fetchRewardsConfig = async () => {
    if (!adminWallet) return
    try {
      const res = await fetch(`/api/admin/validator-config?wallet=${encodeURIComponent(adminWallet)}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.validator_rewards_config?.enabled !== undefined) {
        setRewardsEnabled(!!data.validator_rewards_config.enabled)
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

  const fetchWhitelist = async () => {
    if (!adminWallet) return
    setWhitelistLoading(true)
    try {
      const res = await fetch(`/api/admin/validator-whitelist?wallet=${encodeURIComponent(adminWallet)}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.whitelist)) {
        setWhitelist(data.whitelist)
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
      setMessage({ type: 'ok', text: 'Wallet removed from whitelist' })
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Failed to remove' })
    } finally {
      setAddRemoving(false)
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
          Add wallet addresses to grant validator pool access for trials. Whitelisted users can register and run validators (browser or endpoint).
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
          <ul className="space-y-1">
            {whitelist.map((w) => (
              <li key={w} className="flex items-center justify-between gap-2 py-1 border-b border-[#660099]/30">
                <code className="text-cyan-400 font-mono text-xs truncate flex-1">{w}</code>
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
        <div className="flex items-center gap-3">
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
