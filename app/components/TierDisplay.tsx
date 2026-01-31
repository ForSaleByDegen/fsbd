'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { getUserTier, TIER_THRESHOLDS, getTierBenefits } from '@/lib/tier-check'

export default function TierDisplay() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const [tier, setTier] = useState<'free' | 'bronze' | 'silver' | 'gold'>('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (publicKey && connection) {
      loadTier()
    } else {
      setLoading(false)
    }
  }, [publicKey, connection])

  const loadTier = async () => {
    if (!publicKey || !connection) return
    try {
      const userTier = await getUserTier(publicKey.toString(), connection)
      setTier(userTier)
    } catch (error) {
      console.error('Error loading tier:', error)
    } finally {
      setLoading(false)
    }
  }

  const tiers = [
    {
      name: 'Free',
      threshold: 0,
      color: 'border-gray-300'
    },
    {
      name: 'Bronze',
      threshold: TIER_THRESHOLDS.bronze,
      color: 'border-orange-400'
    },
    {
      name: 'Silver',
      threshold: TIER_THRESHOLDS.silver,
      color: 'border-gray-400'
    },
    {
      name: 'Gold',
      threshold: TIER_THRESHOLDS.gold,
      color: 'border-yellow-400'
    }
  ]

  return (
    <>
      {publicKey ? (
        <div className="mb-8 p-4 bg-muted rounded-lg">
          <p className="font-semibold">Your Current Tier: <span className="capitalize">{tier}</span></p>
          <p className="text-sm text-muted-foreground mt-2">
            Hold $FSBD tokens to unlock higher tiers and fee reductions. 
            Balance checked on-chain - no data sharing.
          </p>
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
          Purchase $FSBD tokens on the Solana blockchain. Your tier is automatically 
          calculated based on your on-chain token balance. No registration, no data sharing, 
          fully private. TODO: Add token address after $FSBD launch.
        </p>
      </div>
    </>
  )
}
