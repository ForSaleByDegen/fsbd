'use client'

import { createContext, useContext, useEffect, useCallback, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

export type Tier = 'free' | 'bronze' | 'silver' | 'gold'

export interface TierState {
  balance: number
  tier: Tier
  chatMinTokens: number
  loading: boolean
  error: string | null
}

const initialState: TierState = {
  balance: 0,
  tier: 'free',
  chatMinTokens: 10000,
  loading: false,
  error: null,
}

const TierContext = createContext<{
  tier: TierState
  refresh: () => Promise<TierState>
}>({
  tier: initialState,
  refresh: async () => initialState,
})

export function useTier() {
  const ctx = useContext(TierContext)
  if (!ctx) throw new Error('useTier must be used within TierProvider')
  return ctx
}

async function fetchBalanceCheck(wallet: string): Promise<Partial<TierState>> {
  const res = await fetch(`/api/config/balance-check?wallet=${encodeURIComponent(wallet)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { error: data.error || 'Balance check failed' }
  }
  return {
    balance: typeof data.balance === 'number' ? data.balance : 0,
    tier: typeof data.tier === 'string' ? data.tier : 'free',
    chatMinTokens: typeof data.chatMinTokens === 'number' ? data.chatMinTokens : 10000,
    error: null,
  }
}

export default function TierProvider({ children }: { children: React.ReactNode }) {
  const { publicKey } = useWallet()
  const [tier, setTier] = useState<TierState>(initialState)

  const refresh = useCallback(async (): Promise<TierState> => {
    const wallet = publicKey?.toString()
    if (!wallet) {
      setTier(initialState)
      return initialState
    }
    setTier((prev) => ({ ...prev, loading: true, error: null }))
    const result = await fetchBalanceCheck(wallet)
    const next = {
      ...initialState,
      ...result,
      loading: false,
    }
    setTier(next)
    return next
  }, [publicKey])

  useEffect(() => {
    if (!publicKey) {
      setTier(initialState)
      return
    }
    void refresh()
  }, [publicKey?.toString(), refresh])

  return (
    <TierContext.Provider value={{ tier, refresh }}>
      {children}
    </TierContext.Provider>
  )
}
