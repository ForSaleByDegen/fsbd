'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'

const STORAGE_KEY = 'fsbd_dismissed_notifications'

function loadDismissed(wallet: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${wallet}`)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function getItemKey(item: { type: string; listingId: string; createdAt: string }): string {
  return `${item.type}:${item.listingId}:${item.createdAt}`
}

export default function NotificationBadge() {
  const { publicKey } = useWallet()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!publicKey) {
      setCount(0)
      return
    }
    const doFetch = () => {
      fetch(`/api/notifications?wallet=${encodeURIComponent(publicKey.toString())}`)
        .then((r) => r.json())
        .then((d) => {
          const items = Array.isArray(d.items) ? d.items : []
          const dismissed = loadDismissed(publicKey.toString())
          const visible = items.filter((i: { type: string; listingId: string; createdAt: string }) => !dismissed.has(getItemKey(i)))
          setCount(visible.length)
        })
        .catch(() => setCount(0))
    }
    doFetch()
    const onDismissed = () => doFetch()
    window.addEventListener('fsbd-notifications-dismissed', onDismissed)
    return () => window.removeEventListener('fsbd-notifications-dismissed', onDismissed)
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
