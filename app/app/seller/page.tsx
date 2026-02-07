'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SellerStatsCard from '@/components/SellerStatsCard'
import ListingCard from '@/components/ListingCard'
import Link from 'next/link'

type SellerStats = {
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

export default function SellerPage() {
  const searchParams = useSearchParams()
  const wallet = searchParams.get('wallet') || ''
  const [stats, setStats] = useState<SellerStats | null>(null)
  const [listings, setListings] = useState<Array<{ id: string; title: string; price: number; price_token: string; token_symbol?: string | null; status: string; images?: string[]; category: string; created_at?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [listingsLoading, setListingsLoading] = useState(true)

  useEffect(() => {
    if (!wallet) {
      setLoading(false)
      setListingsLoading(false)
      return
    }
    fetch(`/api/seller/stats?wallet=${encodeURIComponent(wallet)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [wallet])

  useEffect(() => {
    if (!wallet) {
      setListingsLoading(false)
      return
    }
    setListingsLoading(true)
    fetch(`/api/seller/listings?wallet=${encodeURIComponent(wallet)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setListingsLoading(false))
  }, [wallet])

  const truncate = (s: string, n: number) =>
    s.length > n ? `${s.slice(0, n)}…${s.slice(-4)}` : s

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full relative z-10">
        <h1 className="text-2xl sm:text-3xl font-pixel text-purple-readable mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
          Seller profile
        </h1>

        {!wallet ? (
          <p className="text-purple-readable font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Add ?wallet=ADDRESS to view a seller&apos;s stats. Example: /seller?wallet=...
          </p>
        ) : loading ? (
          <p className="text-[#00ff00] font-pixel-alt text-sm">Loading...</p>
        ) : !stats ? (
          <p className="text-purple-readable font-pixel-alt text-sm">Could not load seller stats.</p>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-black/50 border-2 border-[#660099] rounded">
              <p className="text-purple-readable font-pixel-alt text-xs mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Wallet
              </p>
              <p className="text-[#00ff00] font-pixel-alt text-sm break-all" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                {truncate(wallet, 20)}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-black/50 border-2 border-[#660099] rounded">
                <p className="text-purple-readable font-pixel-alt text-xs mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Reviews
                </p>
                <p className="text-[#00ff00] font-pixel text-2xl" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {stats.averageRating != null ? `★ ${stats.averageRating}` : '—'} ({stats.feedbackCount})
                </p>
              </div>
              <div className="p-4 bg-black/50 border-2 border-[#660099] rounded">
                <p className="text-purple-readable font-pixel-alt text-xs mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Listings
                </p>
                <p className="text-[#00ff00] font-pixel text-2xl" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {stats.listingCount ?? 0}
                </p>
              </div>
              <div className="p-4 bg-black/50 border-2 border-[#660099] rounded">
                <p className="text-purple-readable font-pixel-alt text-xs mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Items sold
                </p>
                <p className="text-[#00ff00] font-pixel text-2xl" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {stats.totalListingsSold}
                </p>
              </div>
              <div className="p-4 bg-black/50 border-2 border-[#660099] rounded">
                <p className="text-purple-readable font-pixel-alt text-xs mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Items bought
                </p>
                <p className="text-[#00ff00] font-pixel text-2xl" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {stats.itemsBought ?? 0}
                </p>
              </div>
              <div className="p-4 bg-black/50 border-2 border-[#660099] rounded">
                <p className="text-purple-readable font-pixel-alt text-xs mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Shipped
                </p>
                <p className="text-[#00ff00] font-pixel text-2xl" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {stats.itemsShipped ?? 0}
                </p>
              </div>
              <div className="p-4 bg-black/50 border-2 border-[#660099] rounded">
                <p className="text-purple-readable font-pixel-alt text-xs mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Received
                </p>
                <p className="text-[#00ff00] font-pixel text-2xl" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {stats.totalConfirmedReceived}
                </p>
              </div>
            </div>

            {stats.feedback.length > 0 && (
              <div className="p-4 bg-black/50 border-2 border-[#660099] rounded">
                <h2 className="font-pixel text-[#00ff00] mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
                  Buyer feedback
                </h2>
                <div className="space-y-4">
                  {stats.feedback.map((f) => (
                    <div key={f.id} className="border-b border-[#660099]/30 pb-3 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#00ff00] text-sm">
                          {'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}
                        </span>
                        <span className="text-purple-readable font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                          {new Date(f.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {f.comment && (
                        <p className="text-[#00ff00] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                          {f.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.feedback.length === 0 && (
              <p className="text-purple-readable font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                No feedback yet. Buyers can leave feedback after confirming receipt.
              </p>
            )}

            {/* Listings (hidden when profile is private) */}
            <div>
              <h2 className="font-pixel text-[#00ff00] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
                Active listings
              </h2>
              {listingsLoading ? (
                <p className="text-purple-readable font-pixel-alt text-sm">Loading...</p>
              ) : listings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listings.map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
                </div>
              ) : (stats.listingCount ?? 0) > 0 ? (
                <p className="text-purple-readable font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  This seller&apos;s listings are hidden.
                </p>
              ) : (
                <p className="text-purple-readable font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  No active listings.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-6">
          <Link href="/">
            <button
              className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt text-sm"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              Back to home
            </button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
