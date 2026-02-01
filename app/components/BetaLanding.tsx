'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from './ui/button'
import BuyFsbdSection from './BuyFsbdSection'
import PwaWalletHint from './PwaWalletHint'

export default function BetaLanding() {
  const searchParams = useSearchParams()
  const [showLockedBanner, setShowLockedBanner] = useState(false)
  useEffect(() => {
    setShowLockedBanner(searchParams.get('locked') === '1')
  }, [searchParams])
  const { connected, publicKey } = useWallet()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleSignup = async () => {
    if (!publicKey) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toString() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage({ type: 'ok', text: data.message || "You're on the list!" })
      } else {
        setMessage({ type: 'err', text: data.error || 'Failed to sign up' })
      }
    } catch (e) {
      setMessage({ type: 'err', text: 'Something went wrong' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-pixel text-[#00ff00] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
            $FSBD
          </h1>
          <p className="text-xl sm:text-2xl text-[#660099] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            For Sale By Degen
          </p>
        </div>

        <div className="p-6 sm:p-8 border-2 sm:border-4 border-[#660099] bg-black/50 rounded">
          {showLockedBanner && (
            <p className="text-[#00ff00] font-pixel-alt text-sm mb-4 px-3 py-2 border border-[#660099] rounded bg-black/30" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Platform is locked for beta. Sign up below to get notified when we launch with tier-based access.
            </p>
          )}
          <p className="text-[#aa77ee] font-pixel-alt text-base sm:text-lg mb-6" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Degen Craigslist on Solana — crypto payments, token-gated tiers, auctions. Launching soon.
          </p>

          <div className="space-y-4">
            {!connected ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-[#00ff00] font-pixel-alt">Connect your wallet to request beta access</p>
                <WalletMultiButton className="!inline-flex !items-center !justify-center !px-6 !py-3 !border-2 !border-[#660099] !text-[#00ff00] hover:!bg-[#660099] hover:!text-black !font-pixel-alt !text-base !rounded !transition-colors" style={{ fontFamily: 'var(--font-pixel-alt)' }} />
                <PwaWalletHint />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-[#00ff00] font-pixel-alt break-all">
                  {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
                </p>
                <Button
                  onClick={handleSignup}
                  disabled={loading}
                  className="px-8 py-3 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt text-base"
                  style={{ fontFamily: 'var(--font-pixel-alt)' }}
                >
                  {loading ? 'Submitting...' : 'Request Beta Access'}
                </Button>
              </div>
            )}

            {message && (
              <p className={`text-sm font-pixel-alt ${message.type === 'ok' ? 'text-[#00ff00]' : 'text-red-400'}`} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                {message.text}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <BuyFsbdSection variant="card" />
        </div>

        <div className="flex flex-wrap justify-center gap-4 text-sm mt-8">
          <Link href="/why" className="text-[#660099] hover:text-[#00ff00] font-pixel-alt transition-colors" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Why $FSBD
          </Link>
          <Link href="/terms" className="text-[#660099] hover:text-[#00ff00] font-pixel-alt transition-colors" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Terms
          </Link>
          <Link href="/privacy" className="text-[#660099] hover:text-[#00ff00] font-pixel-alt transition-colors" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Privacy
          </Link>
        </div>
      </div>
    </div>
  )
}
