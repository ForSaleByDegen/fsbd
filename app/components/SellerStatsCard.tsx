'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface SellerStats {
  totalConfirmedReceived: number
  totalListingsSold: number
  listingCount?: number
  itemsBought?: number
  itemsShipped?: number
  feedbackCount: number
  averageRating: number | null
  feedback: Array<{
    id: string
    rating: number
    comment: string | null
    createdAt: string
  }>
}

interface SellerStatsCardProps {
  sellerWallet: string
  compact?: boolean
}

export default function SellerStatsCard({ sellerWallet, compact = false }: SellerStatsCardProps) {
  const [stats, setStats] = useState<SellerStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sellerWallet) {
      setLoading(false)
      return
    }
    fetch(`/api/seller/stats?wallet=${encodeURIComponent(sellerWallet)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setStats(d)
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [sellerWallet])

  if (loading || !stats) return null

  if (compact) {
    return (
      <Link
        href={`/seller?wallet=${encodeURIComponent(sellerWallet)}`}
        className="inline-block p-2 bg-black/50 border border-[#660099] rounded text-[#00ff00] hover:border-[#00ff00] transition-colors"
      >
        <span className="font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          ★ {stats.averageRating ?? '—'} ({stats.feedbackCount}) · {stats.totalListingsSold} sold · {stats.totalConfirmedReceived} delivered
        </span>
      </Link>
    )
  }

  return (
    <div className="p-4 bg-black/50 border-2 border-[#660099] rounded">
      <h3 className="font-pixel text-[#00ff00] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
        Seller stats
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-[#660099] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Reviews
          </p>
          <p className="text-[#00ff00] font-pixel text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>
            {stats.averageRating != null ? `★ ${stats.averageRating}` : '—'} ({stats.feedbackCount})
          </p>
        </div>
        <div>
          <p className="text-[#660099] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Listings
          </p>
          <p className="text-[#00ff00] font-pixel text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>
            {stats.listingCount ?? 0}
          </p>
        </div>
        <div>
          <p className="text-[#660099] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Items sold
          </p>
          <p className="text-[#00ff00] font-pixel text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>
            {stats.totalListingsSold}
          </p>
        </div>
        <div>
          <p className="text-[#660099] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Items bought
          </p>
          <p className="text-[#00ff00] font-pixel text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>
            {stats.itemsBought ?? 0}
          </p>
        </div>
        <div>
          <p className="text-[#660099] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Shipped
          </p>
          <p className="text-[#00ff00] font-pixel text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>
            {stats.itemsShipped ?? 0}
          </p>
        </div>
        <div>
          <p className="text-[#660099] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Received
          </p>
          <p className="text-[#00ff00] font-pixel text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>
            {stats.totalConfirmedReceived}
          </p>
        </div>
      </div>
      {stats.feedback.length > 0 && (
        <div className="space-y-2">
          <p className="text-[#660099] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Recent feedback
          </p>
          {stats.feedback.slice(0, 5).map((f) => (
            <div key={f.id} className="text-sm">
              <span className="text-[#00ff00]">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>
              {f.comment && (
                <p className="text-[#660099] font-pixel-alt text-xs mt-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  {f.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <Link
        href={`/seller?wallet=${encodeURIComponent(sellerWallet)}`}
        className="mt-3 inline-block text-[#ff00ff] font-pixel-alt text-xs underline hover:text-[#00ff00]"
        style={{ fontFamily: 'var(--font-pixel-alt)' }}
      >
        View full seller profile →
      </Link>
    </div>
  )
}
