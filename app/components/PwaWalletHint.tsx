'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://fsbd.fun'

/**
 * Shows a hint when no wallet is detected (common in PWA or mobile).
 * Helps users open in browser or install a wallet.
 */
export default function PwaWalletHint() {
  const { connected, wallet } = useWallet()
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    if (connected || wallet) return
    // Show hint after wallet adapter has had time to detect (e.g. PWA standalone, mobile without extension)
    const t = setTimeout(() => {
      const isStandalone = typeof window !== 'undefined' && (
        (window as unknown as { standalone?: boolean }).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches
      )
      setShowHint(isStandalone)
    }, 2000)
    return () => clearTimeout(t)
  }, [connected, wallet])

  if (!showHint || connected) return null

  return (
    <p className="text-xs text-purple-muted font-pixel-alt mt-2 max-w-xs text-center" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
      Wallet not detected?{' '}
      <a
        href={SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#00ff00] hover:underline"
      >
        Open in browser
      </a>
      {' '}or install Phantom / Solflare.
    </p>
  )
}
