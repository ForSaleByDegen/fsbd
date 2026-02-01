'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/categories'
import ListingCard from './ListingCard'
import SearchBar from './SearchBar'
import { Button } from './ui/button'

type TabType = 'browse' | 'activity'

export default function ListingFeed() {
  const { publicKey, connected } = useWallet()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const categoryParam = searchParams.get('category')
  const [tab, setTab] = useState<TabType>(tabParam === 'activity' ? 'activity' : 'browse')

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
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState(categoryParam && CATEGORIES.some((c) => c.value === categoryParam) ? categoryParam : 'all')
  const [subcategory, setSubcategory] = useState('')
  const [delivery, setDelivery] = useState('all')
  const [locationCity, setLocationCity] = useState('')
  const [locationRegion, setLocationRegion] = useState('')

  useEffect(() => {
    if (tab === 'activity') {
      fetchActivity()
    } else {
      fetchListings()
    }
  }, [tab, category, subcategory, searchQuery, delivery, locationCity, locationRegion])

  // Refresh listings when component becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchListings()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const fetchActivity = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/listings/activity', { cache: 'no-store' })
      const data = await response.json()
      const arr = Array.isArray(data) ? data : []
      const normalized = arr.map((listing: any) => ({
        ...listing,
        images: Array.isArray(listing.images) ? listing.images : typeof listing.images === 'string' ? JSON.parse(listing.images || '[]') : [],
      }))
      setListings(normalized)
    } catch (err) {
      console.error('Error fetching activity:', err)
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

      if (!supabase) {
        console.warn('Supabase not configured, using API fallback')
        const response = await fetch(`/api/listings?${params}`)
        const data = await response.json()
        setListings(Array.isArray(data) ? data : [])
        return
      }

      let query = supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100)

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
      />
      )}

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
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </>
  )
}
