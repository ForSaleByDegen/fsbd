'use client'

import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/categories'
import ListingCard from './ListingCard'
import SearchBar from './SearchBar'
import type { ListedTimeFilter, ListedSort } from './SearchBar'
import { Button } from './ui/button'

const FETCH_TIMEOUT_MS = 15000
const TOKEN_STATS_POLL_MS = 30000

type TabType = 'browse' | 'activity'
type TokenStats = Record<string, { priceChange24h: number | null; recentBuys5m: number }>

export default function ListingFeed() {
  const { publicKey, connected } = useWallet()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const categoryParam = searchParams.get('category')
  const [tab, setTab] = useState<TabType>(tabParam === 'activity' ? 'activity' : 'browse')
  const tabRef = useRef(tab)
  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  useEffect(() => {
    if (tabParam === 'activity') setTab('activity')
  }, [tabParam])
  useEffect(() => {
    if (categoryParam && CATEGORIES.some((c) => c.value === categoryParam)) {
      setCategory(categoryParam)
    }
  }, [categoryParam])
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tokenStats, setTokenStats] = useState<TokenStats>({})
  const [flashingListingId, setFlashingListingId] = useState<string | null>(null)
  const prevBuysRef = useRef<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState(categoryParam && CATEGORIES.some((c) => c.value === categoryParam) ? categoryParam : 'all')
  const [subcategory, setSubcategory] = useState('')
  const [delivery, setDelivery] = useState('all')
  const [locationCity, setLocationCity] = useState('')
  const [locationRegion, setLocationRegion] = useState('')
  const [listedTime, setListedTime] = useState<ListedTimeFilter>('any')
  const [listedSort, setListedSort] = useState<ListedSort>('newest')

  useEffect(() => {
    if (tab === 'activity') {
      fetchActivity()
    } else {
      fetchListings()
    }
  }, [tab, category, subcategory, searchQuery, delivery, locationCity, locationRegion, listedTime, listedSort])

  // Refresh listings when component becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (tabRef.current === 'activity') {
          fetchActivity()
        } else {
          fetchListings()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const fetchTokenStats = async (mints: string[]) => {
    if (mints.length === 0) return {}
    try {
      const res = await fetch(`/api/token-stats?mints=${mints.join(',')}`, { cache: 'no-store' })
      const data = (await res.json()) as TokenStats
      return data || {}
    } catch {
      return {}
    }
  }

  // Fetch token stats when listings load (for 24h % and initial buy counts)
  useEffect(() => {
    const tokenMints = listings
      .filter((l) => l.token_mint && l.token_mint.length > 32)
      .map((l) => l.token_mint)
      .filter(Boolean) as string[]
    if (tokenMints.length === 0) {
      setTokenStats({})
      return
    }
    fetchTokenStats(tokenMints).then(setTokenStats)
  }, [listings.map((l) => l.id).join(',')])

  // Poll token stats on browse tab - detect buys and pop + flash
  useEffect(() => {
    if (tab !== 'browse') return
    const tokenMints = listings
      .filter((l) => l.token_mint && l.token_mint.length > 32)
      .map((l) => l.token_mint)
      .filter(Boolean) as string[]
    if (tokenMints.length === 0) return
    const interval = setInterval(async () => {
      const stats = await fetchTokenStats(tokenMints)
      setTokenStats((prev) => ({ ...prev, ...stats }))
      let listingToPop: string | null = null
      for (const listing of listings) {
        const mint = listing.token_mint
        if (!mint || !stats[mint]) continue
        const buys = stats[mint].recentBuys5m ?? 0
        const prev = prevBuysRef.current[mint] ?? 0
        if (buys > prev && buys > 0) {
          listingToPop = listing.id
          break
        }
        prevBuysRef.current[mint] = buys
      }
      if (listingToPop) {
        setFlashingListingId(listingToPop)
        setListings((prev) => {
          const idx = prev.findIndex((l) => l.id === listingToPop)
          if (idx <= 0) return prev
          const copy = [...prev]
          const [item] = copy.splice(idx, 1)
          copy.unshift(item)
          return copy
        })
        setTimeout(() => setFlashingListingId(null), 3000)
      }
    }, TOKEN_STATS_POLL_MS)
    return () => clearInterval(interval)
  }, [tab, listings.map((l) => l.id).join(',')])

  const fetchActivity = async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      setLoading(true)
      const response = await fetch('/api/listings/activity', { cache: 'no-store', signal: controller.signal })
      clearTimeout(timeoutId)
      const data = await response.json()
      const arr = Array.isArray(data) ? data : (data?.error ? [] : [])
      const normalized = arr.map((listing: any) => {
        let images: string[] = []
        if (Array.isArray(listing.images)) images = listing.images
        else if (typeof listing.images === 'string') {
          try { images = JSON.parse(listing.images || '[]') } catch { images = [] }
        }
        return { ...listing, images }
      })
      setListings(normalized)
    } catch (err) {
      clearTimeout(timeoutId)
      if ((err as Error).name === 'AbortError') {
        console.error('Activity fetch timed out')
      } else {
        console.error('Error fetching activity:', err)
      }
      setListings([])
    } finally {
      setLoading(false)
    }
  }

  const fetchListings = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      if (category !== 'all') params.set('category', category)
      if (delivery !== 'all') params.set('delivery', delivery)
      if (locationCity.trim()) params.set('location_city', locationCity.trim())
      if (locationRegion.trim()) params.set('location_region', locationRegion.trim())
      if (listedTime !== 'any') params.set('listed', listedTime)
      if (listedSort !== 'newest') params.set('sort', listedSort)

      if (!supabase) {
        console.warn('Supabase not configured, using API fallback')
        const response = await fetch(`/api/listings?${params}`)
        const data = await response.json()
        setListings(Array.isArray(data) ? data : [])
        return
      }

      const now = new Date()
      const toIso = (d: Date) => d.toISOString()

      let query = supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .limit(100)

      if (listedTime !== 'any') {
        if (listedTime === '24h') {
          const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          query = query.gte('created_at', toIso(since))
        } else if (listedTime === '7d') {
          const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          query = query.gte('created_at', toIso(since))
        } else if (listedTime === '30d') {
          const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          query = query.gte('created_at', toIso(since))
        } else if (listedTime === 'older') {
          const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          query = query.lt('created_at', toIso(since))
        }
      }

      query = query.order('created_at', { ascending: listedSort === 'oldest' })

      if (category !== 'all') {
        query = query.eq('category', category)
      }
      if (subcategory.trim()) {
        query = query.eq('subcategory', subcategory.trim())
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      if (delivery === 'local_pickup') {
        query = query.in('delivery_method', ['local_pickup', 'both'])
      } else if (delivery === 'ship') {
        query = query.in('delivery_method', ['ship', 'both'])
      }

      if (locationCity.trim()) {
        query = query.ilike('location_city', `%${locationCity.trim()}%`)
      }
      if (locationRegion.trim()) {
        query = query.ilike('location_region', `%${locationRegion.trim()}%`)
      }

      const { data, error } = await query

      if (error) throw error
      
      // Normalize listings data - ensure images arrays are properly formatted
      const normalizedListings = (data || []).map((listing: any) => ({
        ...listing,
        images: Array.isArray(listing.images) ? listing.images : 
                typeof listing.images === 'string' ? JSON.parse(listing.images || '[]') : 
                []
      }))
      
      setListings(normalizedListings)
    } catch (error) {
      console.error('Error fetching listings:', error)
      setListings([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <SearchBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        category={category}
        setCategory={(c) => { setCategory(c); setSubcategory('') }}
        categories={['all', ...CATEGORIES.map((c) => c.value)]}
        subcategory={subcategory}
        setSubcategory={setSubcategory}
        delivery={delivery}
        setDelivery={setDelivery}
        locationCity={locationCity}
        setLocationCity={setLocationCity}
        locationRegion={locationRegion}
        setLocationRegion={setLocationRegion}
        listedTime={listedTime}
        setListedTime={setListedTime}
        listedSort={listedSort}
        setListedSort={setListedSort}
      />

      {tab === 'activity' && (
        <p className="text-sm text-[#aa77ee] font-pixel-alt mb-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Recently sold items
        </p>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading listings...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2">No listings yet</h3>
            <p className="text-muted-foreground mb-6">
              Be the first to create a listing on For Sale By Degen!
            </p>
            {tab === 'browse' && connected ? (
              <Link href="/listings/create">
                <Button size="lg" className="gap-2">
                  <span>+</span> Create First Listing
                </Button>
              </Link>
            ) : tab === 'browse' ? (
              <p className="text-sm text-muted-foreground">
                Connect your wallet to create a listing
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Check back soon for activity.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 w-full">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              priceChange24h={listing.token_mint ? tokenStats[listing.token_mint]?.priceChange24h ?? null : null}
              shouldFlash={flashingListingId === listing.id}
            />
          ))}
        </div>
      )}
    </>
  )
}
