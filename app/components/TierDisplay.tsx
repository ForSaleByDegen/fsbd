'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { TIER_THRESHOLDS, getTierBenefits, type TierThresholds } from '@/lib/tier-check'
import BuyFsbdSection from './BuyFsbdSection'
import { useTier } from './providers/TierProvider'

export default function TierDisplay() {
  const { publicKey } = useWallet()
  const { tier: tierState, refresh } = useTier()
  const [thresholds, setThresholds] = useState<TierThresholds>(TIER_THRESHOLDS)
  const [fsbdMint, setFsbdMint] = useState<string | null>(null)
  const tier = tierState.tier
  const loading = publicKey ? tierState.loading : false

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((c) => {
        if (c.tier_bronze != null && c.tier_silver != null && c.tier_gold != null) {
          setThresholds({
            bronze: c.tier_bronze,
            silver: c.tier_silver,
            gold: c.tier_gold,
            platinum: c.tier_platinum ?? TIER_THRESHOLDS.platinum,
          })
        }
        if (c.fsbd_token_mint && c.fsbd_token_mint !== 'FSBD_TOKEN_MINT_PLACEHOLDER') {
          setFsbdMint(c.fsbd_token_mint)
        }
      })
      .catch(() => {})
  }, [])

  const plat = (thresholds as { platinum?: number }).platinum ?? TIER_THRESHOLDS.platinum
  const tiers = [
    { name: 'Free', threshold: 0, color: 'border-gray-300' },
    { name: 'Bronze', threshold: thresholds.bronze, color: 'border-orange-400' },
    { name: 'Silver', threshold: thresholds.silver, color: 'border-gray-400' },
    { name: 'Gold', threshold: thresholds.gold, color: 'border-yellow-400' },
    { name: 'Platinum', threshold: plat, color: 'border-cyan-400' },
  ]

  return (
    <>
      <div className="mb-6 p-4 rounded-lg border border-[#660099]/30 bg-[#0a0a0a]">
        <h3 className="font-semibold mb-2">$FSBD Token-Gated Perks</h3>
        <p className="text-sm text-muted-foreground">
          Your $FSBD balance unlocks tier benefits: listings limit, images per listing, token launch fee discounts,
          socials in token metadata (Bronze+), and auctions (Gold). Balance checked on-chain — no registration, fully private.
        </p>
      </div>

      {publicKey ? (
        <div className="mb-8 p-4 bg-muted rounded-lg">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">Your Current Tier: <span className="capitalize">{tier}</span></p>
              <p className="text-sm text-muted-foreground mt-2">
                Hold $FSBD tokens to unlock higher tiers. Listings & token launches are limited by your tier.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refresh()}
              disabled={loading}
              className="text-sm underline hover:no-underline text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {loading ? 'Checking…' : 'Refresh balance'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p>Connect your wallet to see your tier</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tiers.map((t) => {
          const isCurrentTier = t.name.toLowerCase() === tier
          const benefits = getTierBenefits(t.name.toLowerCase() as any)
          
          return (
            <div
              key={t.name}
              className={`border-2 rounded-lg p-6 ${
                isCurrentTier ? 'border-primary bg-primary/5' : t.color
              }`}
            >
              <h2 className="text-2xl font-bold mb-2">{t.name}</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Requires {t.threshold.toLocaleString()} $FSBD
              </p>
              <ul className="space-y-2">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start text-sm">
                    <span className="mr-2">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">How to Upgrade</h3>
        <p className="text-sm text-muted-foreground">
          Hold $FSBD to unlock tiers. Your balance is checked on-chain—no registration, fully private.
          More listings, more images per listing, lower fees, socials in token metadata, and auctions at Gold+.
        </p>
        <div className="mt-3">
          <BuyFsbdSection variant="card" mint={fsbdMint ?? undefined} />
        </div>
      </div>
    </>
  )
}
