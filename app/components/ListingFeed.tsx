'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { supabase, hashWalletAddress } from '@/lib/supabase'
import ListingCard from './ListingCard'
import SearchBar from './SearchBar'
import { Button } from './ui/button'

export default function ListingFeed() {
  const { publicKey, connected } = useWallet()
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')

  useEffect(() => {
    fetchListings()
  }, [category, searchQuery])

  const fetchListings = async () => {
    try {
      setLoading(true)
      
      if (!supabase) {
        // Fallback: use localStorage or API route
        console.warn('Supabase not configured, using API fallback')
        const response = await fetch(`/api/listings?q=${searchQuery}&category=${category}`)
        const data = await response.json()
        setListings(data)
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

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setListings(data || [])
    } catch (error) {
      console.error('Error fetching listings:', error)
      setListings([])
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    'all',
    'for-sale',
    'services',
    'gigs',
    'housing',
    'community',
    'jobs'
  ]

  return (
    <>
      <SearchBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        category={category}
        setCategory={setCategory}
        categories={categories}
      />

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
            {connected ? (
              <Link href="/listings/create">
                <Button size="lg" className="gap-2">
                  <span>+</span> Create First Listing
                </Button>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                Connect your wallet to create a listing
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </>
  )
}
