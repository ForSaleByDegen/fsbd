'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'

export default function NotificationBadge() {
  const { publicKey } = useWallet()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!publicKey) {
      setCount(0)
      return
    }
    fetch(`/api/notifications?wallet=${encodeURIComponent(publicKey.toString())}`)
      .then((r) => r.json())
      .then((d) => setCount(typeof d.total === 'number' ? d.total : 0))
      .catch(() => setCount(0))
  }, [publicKey?.toString()])

  if (!publicKey || count === 0) return null

  return (
    <Link
      href="/profile#notifications"
      className="relative inline-flex items-center justify-center px-2 py-1 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 transition-colors rounded"
      style={{ fontFamily: 'var(--font-pixel-alt)' }}
      title="Notifications"
    >
      <span className="text-xs">🔔</span>
      <span className="ml-1 text-xs font-bold">{count > 99 ? '99+' : count}</span>
    </Link>
  )
}
