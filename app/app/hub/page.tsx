'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getIPFSGatewayURL } from '@/lib/pinata'
import { formatRelativeTime } from '@/lib/format-time'

type HubItem = {
  id: string
  source: 'fsbd' | 'ebay' | 'etsy' | 'woocommerce'
  title: string
  description: string | null
  price: number | null
  price_token: string | null
  images: string[]
  category: string | null
  external_url: string | null
  wallet_address: string | null
  created_at: string
}

const SOURCE_LABELS: Record<string, string> = {
  fsbd: 'FSBD',
  ebay: 'eBay',
  etsy: 'Etsy',
  woocommerce: 'WooCommerce',
}

function HubListingCard({ item }: { item: HubItem }) {
  const getImageUrl = (image: string | null | undefined): string | null => {
    if (!image || typeof image !== 'string') return null
    if (image.startsWith('http://') || image.startsWith('https://')) return image
    if (image.startsWith('Qm') || image.startsWith('baf')) return getIPFSGatewayURL(image)
    return getIPFSGatewayURL(image)
  }
  const imageUrl = item.images?.length ? getImageUrl(item.images[0]) : null
  const priceDisplay = item.price != null
    ? `${item.price_token || 'USD'} ${item.price.toFixed(2)}`
    : 'Price on request'
  const href = item.source === 'fsbd' ? `/listings/${item.id}` : (item.external_url || '#')
  const isExternal = item.source !== 'fsbd'

  return (
    <Link
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="block w-full"
    >
      <div className="bg-black/80 border-2 sm:border-4 p-3 sm:p-4 hover:border-[#00ff00] hover:shadow-[0_0_20px_rgba(0,255,0,0.5)] transition-all duration-300 cursor-pointer h-full flex flex-col pixel-art min-h-[200px] relative overflow-hidden border-[#660099]">
        <span className="absolute top-2 right-2 z-10 px-2 py-0.5 text-xs font-pixel-alt bg-black/80 border border-[#660099] text-cyan-400">
          {SOURCE_LABELS[item.source] || item.source}
        </span>
        {imageUrl ? (
          <div className="w-full h-32 sm:h-40 md:h-48 bg-black/50 border border-[#660099] rounded mb-2 sm:mb-3 overflow-hidden relative">
            <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="w-full h-32 sm:h-40 md:h-48 bg-black/50 border border-[#660099] rounded mb-2 sm:mb-3 flex items-center justify-center">
            <span className="text-purple-readable text-xs">No image</span>
          </div>
        )}
        <h3 className="text-base sm:text-lg font-semibold mb-2 line-clamp-2 break-words">{item.title}</h3>
        <p className="text-muted-foreground text-sm sm:text-base mb-2 line-clamp-2 flex-grow break-words">
          {item.description || ''}
        </p>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0 mt-auto">
          <span className="text-primary font-bold text-sm sm:text-base">{priceDisplay}</span>
          <span className="text-xs text-muted-foreground capitalize">
            {item.category?.replace('-', ' ') || '—'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <span className="inline-block text-xs text-muted-foreground">
            {formatRelativeTime(item.created_at)}
          </span>
          {isExternal && (
            <span className="inline-block text-xs text-cyan-400">View on {SOURCE_LABELS[item.source]}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

type Reputation = {
  combined_score?: number | null
  platforms_count?: number
  fsbd_rating_avg?: number | null
  fsbd_review_count?: number
  ebay_rating_avg?: number | null
  ebay_feedback_count?: number
  etsy_rating_avg?: number | null
  etsy_review_count?: number
}

export default function HubPage() {
  const searchParams = useSearchParams()
  const walletParam = searchParams.get('wallet') || ''
  const [items, setItems] = useState<HubItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [reputation, setReputation] = useState<Reputation | null>(null)

  useEffect(() => {
    if (walletParam) {
      fetch(`/api/seller/reputation?wallet=${encodeURIComponent(walletParam)}`)
        .then((r) => r.json())
        .then((d) => setReputation(d))
        .catch(() => setReputation(null))
    } else {
      setReputation(null)
    }
  }, [walletParam])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (walletParam) params.set('wallet', walletParam)
    if (sourceFilter !== 'all') params.set('source', sourceFilter)
    params.set('limit', '50')
    fetch(`/api/marketplace/hub?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [walletParam, sourceFilter])

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full relative z-10">
        <h1 className="text-2xl sm:text-3xl font-pixel text-purple-readable mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
          Marketplace Hub
        </h1>
        <p className="text-purple-muted font-pixel-alt text-sm mb-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {walletParam ? 'Listings from this seller' : 'All listings from FSBD + connected marketplaces (eBay, Etsy, WooCommerce)'}
        </p>

        {walletParam && reputation && (reputation.combined_score != null || (reputation.platforms_count ?? 0) > 0) && (
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-2 border-2 border-amber-500/60 bg-amber-500/10 rounded">
            <span className="text-amber-400 font-pixel-alt text-sm">
              {reputation.combined_score != null
                ? `${reputation.combined_score.toFixed(1)}★ across ${reputation.platforms_count ?? 0} platform${(reputation.platforms_count ?? 0) !== 1 ? 's' : ''}`
                : `${reputation.platforms_count ?? 0} platform${(reputation.platforms_count ?? 0) !== 1 ? 's' : ''} connected`}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {['all', 'fsbd', 'ebay', 'etsy', 'woocommerce'].map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`px-3 py-1.5 text-sm font-pixel-alt border-2 rounded transition-colors ${
                sourceFilter === s
                  ? 'border-[#00ff00] bg-[#00ff00]/20 text-[#00ff00]'
                  : 'border-[#660099] text-purple-readable hover:border-[#00ff00]/60'
              }`}
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              {s === 'all' ? 'All' : SOURCE_LABELS[s] || s}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-purple-muted font-pixel-alt text-sm">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-purple-muted font-pixel-alt text-sm">No listings found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <HubListingCard key={`${item.source}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
