'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://fsbd.fun'

/**
 * Shows a hint when no wallet is detected (PWA standalone, mobile, or in-app browser).
 * Wallet extensions don't work in PWA standalone—users must open in a real browser.
 */
export default function PwaWalletHint() {
  const { connected, wallet } = useWallet()
  const [showHint, setShowHint] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    if (connected || wallet) {
      setShowHint(false)
      return
    }
    const t = setTimeout(() => {
      if (typeof window === 'undefined') return
      const standalone =
        (window as unknown as { standalone?: boolean }).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      setIsStandalone(standalone)
      // Show for PWA standalone always; for mobile after a short delay
      setShowHint(standalone || isMobile)
    }, 800)
    return () => clearTimeout(t)
  }, [connected, wallet])

  if (!showHint || connected) return null

  return (
    <div className="rounded-lg border-2 border-cyan-500/50 bg-cyan-500/10 p-3 mt-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
      <p className="text-xs text-cyan-300 font-medium">
        {isStandalone
          ? 'Wallet extensions don\'t work in installed app mode.'
          : 'Having trouble connecting?'}
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        <a
          href={SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1.5 rounded border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold"
        >
          Open in browser →
        </a>
        <a
          href="https://phantom.app/ul/browse/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1.5 rounded border-2 border-[#9945FF] text-[#9945FF] hover:bg-[#9945FF]/20 text-xs font-bold"
        >
          Phantom
        </a>
        <a
          href="https://backpack.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1.5 rounded border-2 border-[#9945FF] text-[#9945FF] hover:bg-[#9945FF]/20 text-xs font-bold"
        >
          Backpack
        </a>
      </div>
    </div>
  )
}
