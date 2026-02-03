'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'

type NotificationItem = {
  type: string
  listingId: string
  listingTitle?: string
  message?: string
  amount?: number
  createdAt: string
}

const STORAGE_KEY = 'fsbd_dismissed_notifications'

function getItemKey(item: NotificationItem): string {
  return `${item.type}:${item.listingId}:${item.createdAt}`
}

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

function saveDismissed(wallet: string, dismissed: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${STORAGE_KEY}_${wallet}`, JSON.stringify([...dismissed]))
  } catch {
    /* ignore */
  }
}

export default function NotificationsPanel() {
  const { publicKey } = useWallet()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!publicKey) {
      setItems([])
      setDismissed(new Set())
      setLoading(false)
      return
    }
    setDismissed(loadDismissed(publicKey.toString()))
    setLoading(true)
    fetch(`/api/notifications?wallet=${encodeURIComponent(publicKey.toString())}`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.items) ? d.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [publicKey?.toString()])

  const dismissOne = useCallback(
    (key: string) => {
      if (!publicKey) return
      const next = new Set(dismissed)
      next.add(key)
      setDismissed(next)
      saveDismissed(publicKey.toString(), next)
      window.dispatchEvent(new CustomEvent('fsbd-notifications-dismissed'))
    },
    [publicKey, dismissed]
  )

  const clearAll = useCallback(() => {
    if (!publicKey) return
    const keys = items.map((item) => getItemKey(item))
    const next = new Set([...Array.from(dismissed), ...keys])
    setDismissed(next)
    saveDismissed(publicKey.toString(), next)
    window.dispatchEvent(new CustomEvent('fsbd-notifications-dismissed'))
  }, [publicKey, items, dismissed])

  if (!publicKey) return null

  const visibleItems = items.filter((item) => !dismissed.has(getItemKey(item)))

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  const typeLabel = (t: string) => {
    if (t === 'dm') return '💬 DM'
    if (t === 'public_chat') return '🌐 Public chat'
    if (t === 'bid') return '💰 Bid'
    return t
  }

  return (
    <div
      id="notifications"
      className="border-2 border-[#660099] rounded-lg overflow-hidden bg-black/50"
    >
      <div className="bg-[#660099]/30 px-4 py-2 border-b border-[#660099] flex items-center justify-between gap-2">
        <h2
          className="text-sm font-pixel-alt text-[#00ff00]"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          🔔 Notifications
        </h2>
        {visibleItems.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-[#660099] hover:text-[#00ff00] font-pixel-alt transition-colors"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            Clear all
          </button>
        )}
      </div>
      <div className="p-4 max-h-64 overflow-y-auto">
        {loading ? (
          <p className="text-[#660099]/80 text-sm font-pixel-alt">Loading...</p>
        ) : visibleItems.length === 0 ? (
          <p className="text-[#660099]/80 text-sm font-pixel-alt">
            {items.length === 0
              ? 'No new chats, bids, or activity in the last 7 days.'
              : 'All notifications cleared.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {visibleItems.map((item) => {
              const itemKey = getItemKey(item)
              return (
                <li key={itemKey} className="relative group">
                  <Link
                    href={`/listings/${item.listingId}`}
                    className="block p-3 pr-10 rounded border border-[#660099]/50 hover:bg-[#660099]/20 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-xs text-[#aa77ee] font-pixel-alt">
                          {typeLabel(item.type)}
                        </span>
                        <p className="text-sm text-[#00ff00] font-pixel-alt mt-1">
                          {item.listingTitle || 'Listing'}
                        </p>
                        {item.message && (
                          <p className="text-xs text-[#660099]/90 mt-0.5">{item.message}</p>
                        )}
                        {item.type === 'bid' && item.amount != null && (
                          <p className="text-xs text-[#00ff00] mt-0.5">
                            Bid: {item.amount} SOL
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-[#660099]/70 shrink-0">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      dismissOne(itemKey)
                    }}
                    className="absolute top-2 right-2 p-1.5 text-[#660099] hover:text-red-400 hover:bg-red-400/20 rounded transition-colors"
                    title="Dismiss"
                    aria-label="Dismiss notification"
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
