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
    tier_silver: 1000000,
    tier_gold: 10000000,
    fsbd_token_mint: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
    return <p className="text-[#660099] font-pixel-alt text-sm">Loading config...</p>
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-black/50 border-2 border-[#660099] rounded">
        <h3 className="font-pixel text-[#ff00ff] mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
          Platform Config
        </h3>
        <p className="text-[#aa77ee] font-pixel-alt text-sm mb-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
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
            <p className="text-xs text-[#aa77ee] mt-1">Min $FSBD to create auctions. Lower when market cap rises.</p>
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
            <p className="text-xs text-[#aa77ee] mt-1">Set your $FSBD mint address after launch. Tiers use this for balance checks.</p>
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
    </div>
  )
}
