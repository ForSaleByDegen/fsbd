'use client'

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import DisclaimerBanner from '@/components/DisclaimerBanner'
import { getUserTier } from '@/lib/tier-check'
import Link from 'next/link'

// Dynamic import for Privy to avoid build issues
let usePrivy: any = null
let useWallets: any = null

if (typeof window !== 'undefined') {
  try {
    const privyModule = require('@privy-io/react-auth')
    usePrivy = privyModule.usePrivy
    useWallets = privyModule.useWallets
  } catch {
    // Privy not available
  }
}

export default function ProfilePage() {
  const privyHooks = usePrivy ? usePrivy() : { user: null, authenticated: false, ready: true }
  const walletsHook = useWallets ? useWallets() : { wallets: [] }
  const { user, authenticated, ready } = privyHooks
  const { wallets } = walletsHook
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const [tier, setTier] = useState<'free' | 'bronze' | 'silver' | 'gold'>('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if ((authenticated || connected) && (publicKey || wallets?.length > 0)) {
      loadProfile()
    } else {
      setLoading(false)
    }
  }, [authenticated, connected, publicKey, wallets, connection])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const walletAddress = publicKey?.toString() || (wallets && Array.isArray(wallets) ? wallets.find((w: { chainId?: string; address?: string }) => w.chainId === 'solana-devnet')?.address : null)
      if (walletAddress && connection) {
        const userTier = await getUserTier(walletAddress, connection)
        setTier(userTier)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center text-[#00ff00] font-pixel-alt">Loading...</div>
        </main>
      </div>
    )
  }

  const isAuthenticated = authenticated || connected
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <DisclaimerBanner />
          <div className="text-center py-16">
            <h1 className="text-4xl font-pixel text-[#660099] mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
              Profile
            </h1>
            <p className="text-[#00ff00] font-pixel-alt mb-6" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Connect your wallet or sign in to view your profile
            </p>
            <Link href="/">
              <button className="px-6 py-3 border-4 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt transition-colors" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Go Home
              </button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const walletAddress = publicKey?.toString() || (wallets && Array.isArray(wallets) ? wallets.find((w: { chainId?: string; address?: string }) => w.chainId === 'solana-devnet')?.address : null) || 'Not connected'
  const email = user?.email?.address || 'No email'
  const linkedAccounts = user?.linkedAccounts || []

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <DisclaimerBanner />
        
        <h1 className="text-4xl font-pixel text-[#660099] mb-6" style={{ fontFamily: 'var(--font-pixel)' }}>
          Profile
        </h1>

        <div className="pixel-box bg-black border-4 border-[#660099] p-6 md:p-8 mb-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-pixel text-[#00ff00] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                Wallet Address
              </h2>
              <p className="text-[#660099] font-pixel-alt break-all" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                {walletAddress}
              </p>
            </div>

            {email !== 'No email' && (
              <div>
                <h2 className="text-xl font-pixel text-[#00ff00] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                  Email
                </h2>
                <p className="text-[#660099] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  {email}
                </p>
              </div>
            )}

            <div>
              <h2 className="text-xl font-pixel text-[#00ff00] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                Current Tier
              </h2>
              <p className="text-2xl font-pixel text-[#660099] capitalize" style={{ fontFamily: 'var(--font-pixel)' }}>
                {loading ? 'Loading...' : tier}
              </p>
            </div>

            {linkedAccounts.length > 0 && (
              <div>
                <h2 className="text-xl font-pixel text-[#00ff00] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                  Linked Accounts
                </h2>
                <div className="space-y-2">
                  {linkedAccounts.map((account: { type?: string; address?: string; email?: string }, idx: number) => (
                    <div key={idx} className="text-[#660099] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                      {account.type}: {account.address || account.email || 'N/A'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <Link href="/listings/my">
            <button className="px-6 py-3 border-4 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt transition-colors" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              My Listings
            </button>
          </Link>
          <Link href="/tiers">
            <button className="px-6 py-3 border-4 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt transition-colors" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              View Tiers
            </button>
          </Link>
        </div>
      </main>
    </div>
  )
}
