'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export default function PlatformConfig() {
  const { publicKey } = useWallet()
  const [config, setConfig] = useState({
    auction_min_tokens: 10000000,
    tier_bronze: 100000,
    tier_silver: 500000,
    tier_gold: 2000000,
    tier_platinum: 10000000,
    fsbd_token_mint: '',
    protection_coverage_cap_usd: 100,
    sol_usd_rate: 200,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [whitelist, setWhitelist] = useState<string[]>([])
  const [validatorAddWallet, setValidatorAddWallet] = useState('')
  const [whitelistBusy, setWhitelistBusy] = useState(false)

  const [validatorConfig, setValidatorConfig] = useState({
    min_validator_stake: 0,
    enabled: false,
    base_reward_per_job: 10,
    decay_period_days: 30,
    decay_percent: 5,
    min_reward_per_job: 1,
    payout_min_accumulated: 100,
    payout_schedule: 'weekly' as 'immediate' | 'daily' | 'weekly',
  })
  const [validatorConfigSaving, setValidatorConfigSaving] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!publicKey) return
    fetch(`/api/admin/validator-whitelist?wallet=${encodeURIComponent(publicKey.toString())}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data.whitelist) && setWhitelist(data.whitelist))
      .catch(() => {})
  }, [publicKey])

  useEffect(() => {
    if (!publicKey) return
    fetch(`/api/admin/validator-config?wallet=${encodeURIComponent(publicKey.toString())}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.min_validator_stake != null) setValidatorConfig((c) => ({ ...c, min_validator_stake: data.min_validator_stake }))
        const r = data.validator_rewards_config
        if (r) {
          setValidatorConfig((c) => ({
            ...c,
            min_validator_stake: data.min_validator_stake ?? c.min_validator_stake,
            enabled: r.enabled ?? c.enabled,
            base_reward_per_job: r.base_reward_per_job ?? c.base_reward_per_job,
            decay_period_days: r.decay_period_days ?? c.decay_period_days,
            decay_percent: r.decay_percent ?? c.decay_percent,
            min_reward_per_job: r.min_reward_per_job ?? c.min_reward_per_job,
            payout_min_accumulated: r.payout_min_accumulated ?? c.payout_min_accumulated,
            payout_schedule: r.payout_schedule ?? c.payout_schedule,
          }))
        }
      })
      .catch(() => {})
  }, [publicKey])

  const handleAddValidatorWallet = async () => {
    const w = validatorAddWallet.trim()
    if (!publicKey || !w || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(w)) {
      setMessage({ type: 'err', text: 'Enter a valid Solana wallet address' })
      return
    }
    setWhitelistBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/validator-whitelist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toString(), add: w }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to add')
      setWhitelist(data.whitelist ?? [...whitelist, w.toLowerCase()])
      setValidatorAddWallet('')
      setMessage({ type: 'ok', text: 'Wallet added to validator whitelist' })
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Failed to add' })
    } finally {
      setWhitelistBusy(false)
    }
  }

  const handleRemoveValidatorWallet = async (wallet: string) => {
    if (!publicKey) return
    setWhitelistBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/validator-whitelist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toString(), remove: wallet }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to remove')
      setWhitelist(data.whitelist ?? whitelist.filter((x) => x !== wallet.toLowerCase()))
      setMessage({ type: 'ok', text: 'Wallet removed from whitelist' })
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Failed to remove' })
    } finally {
      setWhitelistBusy(false)
    }
  }

  const handleSave = async () => {
    if (!publicKey) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          auction_min_tokens: parseInt(String(config.auction_min_tokens), 10),
          tier_bronze: parseInt(String(config.tier_bronze), 10),
          tier_silver: parseInt(String(config.tier_silver), 10),
          tier_gold: parseInt(String(config.tier_gold), 10),
          fsbd_token_mint: String(config.fsbd_token_mint || '').trim(),
          protection_coverage_cap_usd: parseFloat(String(config.protection_coverage_cap_usd)) || 100,
          sol_usd_rate: parseFloat(String(config.sol_usd_rate)) || 200,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      setMessage({ type: 'ok', text: 'Config updated' })
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-purple-readable font-pixel-alt text-sm">Loading config...</p>
  }

  return (
    <div className="space-y-6">
      {/* Validator whitelist - first so admins find it easily */}
      <div className="p-4 bg-black/50 border-2 border-[#660099] rounded">
        <h3 className="font-pixel text-[#00ff00] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
          Validator Whitelist — Add Users for Trial Access
        </h3>
        <p className="text-purple-muted font-pixel-alt text-sm mb-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Add wallet addresses to grant validator pool access. Whitelisted users can register and run validators (browser or endpoint).
        </p>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Solana wallet address"
            value={validatorAddWallet}
            onChange={(e) => setValidatorAddWallet(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddValidatorWallet()}
            className="flex-1 bg-black border-2 border-[#660099] text-[#00ff00] font-mono text-sm"
          />
          <Button
            onClick={handleAddValidatorWallet}
            disabled={whitelistBusy || !validatorAddWallet.trim()}
            className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt"
          >
            {whitelistBusy ? '…' : 'Add to whitelist'}
          </Button>
        </div>
        {whitelist.length === 0 ? (
          <p className="text-purple-muted text-sm">No wallets whitelisted.</p>
        ) : (
          <ul className="space-y-1">
            {whitelist.map((w) => (
              <li key={w} className="flex items-center justify-between gap-2 py-1 border-b border-[#660099]/30">
                <code className="text-cyan-400 font-mono text-xs truncate flex-1">{w}</code>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-500 text-amber-400 hover:bg-amber-500/20 shrink-0"
                  disabled={whitelistBusy}
                  onClick={() => handleRemoveValidatorWallet(w)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-4 bg-black/50 border-2 border-[#660099] rounded">
        <h3 className="font-pixel text-[#ff00ff] mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
          Platform Config
        </h3>
        <p className="text-purple-muted font-pixel-alt text-sm mb-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Adjust thresholds as market cap changes. Lower auction_min_tokens when $FSBD price rises so more users can create auctions. Tier thresholds control fee discounts.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-pixel-alt text-[#00ff00] mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Auction min tokens ($FSBD)
            </label>
            <Input
              type="number"
              value={config.auction_min_tokens}
              onChange={(e) => setConfig((c) => ({ ...c, auction_min_tokens: parseInt(e.target.value, 10) || 0 }))}
              className="bg-black border-2 border-[#660099] text-[#00ff00]"
            />
            <p className="text-xs text-purple-muted mt-1">Min $FSBD to create auctions. Lower when market cap rises.</p>
          </div>

          <div>
            <label className="block text-sm font-pixel-alt text-[#00ff00] mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Tier Bronze ($FSBD)
            </label>
            <Input
              type="number"
              value={config.tier_bronze}
              onChange={(e) => setConfig((c) => ({ ...c, tier_bronze: parseInt(e.target.value, 10) || 0 }))}
              className="bg-black border-2 border-[#660099] text-[#00ff00]"
            />
          </div>

          <div>
            <label className="block text-sm font-pixel-alt text-[#00ff00] mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Tier Silver ($FSBD)
            </label>
            <Input
              type="number"
              value={config.tier_silver}
              onChange={(e) => setConfig((c) => ({ ...c, tier_silver: parseInt(e.target.value, 10) || 0 }))}
              className="bg-black border-2 border-[#660099] text-[#00ff00]"
            />
          </div>

          <div>
            <label className="block text-sm font-pixel-alt text-[#00ff00] mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Tier Gold ($FSBD)
            </label>
            <Input
              type="number"
              value={config.tier_gold}
              onChange={(e) => setConfig((c) => ({ ...c, tier_gold: parseInt(e.target.value, 10) || 0 }))}
              className="bg-black border-2 border-[#660099] text-[#00ff00]"
            />
          </div>

          <div>
            <label className="block text-sm font-pixel-alt text-[#00ff00] mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Tier Platinum ($FSBD)
            </label>
            <Input
              type="number"
              value={config.tier_platinum}
              onChange={(e) => setConfig((c) => ({ ...c, tier_platinum: parseInt(e.target.value, 10) || 0 }))}
              className="bg-black border-2 border-[#660099] text-[#00ff00]"
            />
          </div>

          <div>
            <label className="block text-sm font-pixel-alt text-[#00ff00] mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Protection coverage cap (USD)
            </label>
            <Input
              type="number"
              value={config.protection_coverage_cap_usd}
              onChange={(e) => setConfig((c) => ({ ...c, protection_coverage_cap_usd: parseFloat(e.target.value) || 100 }))}
              className="bg-black border-2 border-[#660099] text-[#00ff00]"
            />
            <p className="text-xs text-purple-muted mt-1">Max reimbursement per claim. Increase as treasury grows.</p>
          </div>

          <div>
            <label className="block text-sm font-pixel-alt text-[#00ff00] mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              SOL/USD rate
            </label>
            <Input
              type="number"
              step="0.01"
              value={config.sol_usd_rate}
              onChange={(e) => setConfig((c) => ({ ...c, sol_usd_rate: parseFloat(e.target.value) || 200 }))}
              className="bg-black border-2 border-[#660099] text-[#00ff00]"
            />
            <p className="text-xs text-purple-muted mt-1">For insurance cost display and claim payouts.</p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-pixel-alt text-[#00ff00] mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              $FSBD Token Mint (lock after launch)
            </label>
            <Input
              type="text"
              placeholder="FSBD_TOKEN_MINT_PLACEHOLDER or base58 mint address"
              value={config.fsbd_token_mint}
              onChange={(e) => setConfig((c) => ({ ...c, fsbd_token_mint: e.target.value }))}
              className="bg-black border-2 border-[#660099] text-[#00ff00] font-mono text-sm"
            />
            <p className="text-xs text-purple-muted mt-1">Set your $FSBD mint address after launch. Tiers use this for balance checks.</p>
          </div>
        </div>

        {message && (
          <p className={`mt-4 text-sm font-pixel-alt ${message.type === 'ok' ? 'text-[#00ff00]' : 'text-red-400'}`}>
            {message.text}
          </p>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt"
        >
          {saving ? 'Saving...' : 'Save Config'}
        </Button>
      </div>

      {/* Telegram bot test */}
      <div className="p-4 bg-black/50 border-2 border-[#660099] rounded">
        <h3 className="font-pixel text-[#ff00ff] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
          Telegram Bot
        </h3>
        <p className="text-purple-muted font-pixel-alt text-sm mb-3" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          New listings are posted to your Telegram channel. Add <code className="text-[#00ff00]">TELEGRAM_BOT_TOKEN</code> and <code className="text-[#00ff00]">TELEGRAM_CHANNEL_ID</code> in Vercel env vars, add the bot as channel admin, then test:
        </p>
        <Button
          onClick={async () => {
            if (!publicKey) return
            try {
              const res = await fetch('/api/admin/telegram-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet: publicKey.toString() }),
              })
              const data = await res.json().catch(() => ({}))
              if (data.ok) setMessage({ type: 'ok', text: 'Test message sent! Check your Telegram channel.' })
              else setMessage({ type: 'err', text: data.error + (data.details?.hint ? ` ${data.details.hint}` : '') })
            } catch (e) {
              setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Test failed' })
            }
          }}
          className="border-2 border-[#660099] text-purple-readable hover:border-[#00ff00] hover:text-[#00ff00] font-pixel-alt"
        >
          Send test message to channel
        </Button>
      </div>
    </div>
  )
}
