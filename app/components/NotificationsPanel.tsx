'use client'

import { useState, useEffect } from 'react'
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

export default function NotificationsPanel() {
  const { publicKey } = useWallet()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!publicKey) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/notifications?wallet=${encodeURIComponent(publicKey.toString())}`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.items) ? d.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [publicKey?.toString()])

  if (!publicKey) return null

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
      <div className="bg-[#660099]/30 px-4 py-2 border-b border-[#660099]">
        <h2
          className="text-sm font-pixel-alt text-[#00ff00]"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          🔔 Notifications
        </h2>
      </div>
      <div className="p-4 max-h-64 overflow-y-auto">
        {loading ? (
          <p className="text-[#660099]/80 text-sm font-pixel-alt">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-[#660099]/80 text-sm font-pixel-alt">
            No new chats, bids, or activity in the last 7 days.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item, i) => (
              <li key={`${item.type}-${item.listingId}-${i}`}>
                <Link
                  href={`/listings/${item.listingId}`}
                  className="block p-3 rounded border border-[#660099]/50 hover:bg-[#660099]/20 transition-colors"
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
