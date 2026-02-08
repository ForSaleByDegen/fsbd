'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { usePathname } from 'next/navigation'

/**
 * Shows an "Open in Phantom" link when on mobile and wallet isn't connected.
 * Phantom's in-app browser has the wallet injected; external mobile browsers don't.
 * Using the Browse deep link opens fsbd.fun inside Phantom so connect works.
 */
export default function MobilePhantomHint() {
  const { connected } = useWallet()
  const pathname = usePathname()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (connected) {
      setShow(false)
      return
    }
    const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    setShow(!!isMobile)
  }, [connected])

  if (!show) return null

  const base = typeof window !== 'undefined' ? window.location.origin : 'https://fsbd.fun'
  const fullUrl = `${base}${pathname || ''}`
  const phantomBrowseUrl = `https://phantom.app/ul/browse/${encodeURIComponent(fullUrl)}?ref=${encodeURIComponent(base)}`

  return (
    <a
      href={phantomBrowseUrl}
      className="block mt-2 px-3 py-2 rounded border border-[#9945FF] bg-[#9945FF]/10 text-[#9945FF] hover:bg-[#9945FF]/20 text-xs font-medium transition-colors text-center"
    >
      📱 Phantom user? Tap to open in Phantom — wallet connect works there
    </a>
  )
}
