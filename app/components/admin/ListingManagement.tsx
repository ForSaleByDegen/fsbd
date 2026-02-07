'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Listing {
  id: string
  title: string
  category: string
  status: string
  price: number
  price_token: string
  created_at: string
  wallet_address_hash: string
}

export default function ListingManagement() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'sold' | 'removed'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadListings()
  }, [filter])

  const loadListings = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      let query = supabase
        .from('listings')
        .select('id, title, category, status, price, price_token, created_at, wallet_address_hash')
        .order('created_at', { ascending: false })
        .limit(100)

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setListings(data || [])
    } catch (error) {
      console.error('Error loading listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateListingStatus = async (id: string, newStatus: string) => {
    if (!supabase) return

    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      loadListings() // Reload
    } catch (error) {
      console.error('Error updating listing:', error)
      alert('Failed to update listing status')
    }
  }

  const deleteListing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return
    if (!supabase) return

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadListings() // Reload
    } catch (error) {
      console.error('Error deleting listing:', error)
      alert('Failed to delete listing')
    }
  }

  const filteredListings = listings.filter(listing =>
    searchQuery === '' || 
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00ff00]"></div>
        <p className="text-purple-readable font-pixel-alt mt-2 text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Loading listings...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'sold', 'removed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 border-2 font-pixel-alt text-xs sm:text-sm min-h-[36px] touch-manipulation ${
                filter === status
                  ? 'border-[#00ff00] text-[#00ff00] bg-black/50'
                  : 'border-[#660099] text-purple-readable hover:border-[#00ff00]'
              }`}
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search listings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 bg-black/30 border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm placeholder:text-purple-readable focus:border-[#00ff00] focus:outline-none"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        />
      </div>

      {/* Listings Table */}
      <div className="pixel-box bg-black border-2 border-[#660099] p-4 overflow-x-auto">
        <div className="min-w-full">
          <div className="space-y-2">
            {filteredListings.length === 0 ? (
              <p className="text-center text-purple-readable font-pixel-alt py-8" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                No listings found
              </p>
            ) : (
              filteredListings.map((listing) => (
                <div
                  key={listing.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border-b border-[#660099]/30 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/listings/${listing.id}`}
                      className="text-[#00ff00] font-pixel-alt text-sm sm:text-base hover:text-purple-readable break-words"
                      style={{ fontFamily: 'var(--font-pixel-alt)' }}
                    >
                      {listing.title}
                    </Link>
                    <p className="text-purple-readable font-pixel-alt text-xs mt-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                      {listing.category} • {listing.price} {listing.price_token} • {new Date(listing.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={listing.status}
                      onChange={(e) => updateListingStatus(listing.id, e.target.value)}
                      className="px-2 py-1 bg-black/30 border border-[#660099] text-[#00ff00] font-pixel-alt text-xs focus:border-[#00ff00] focus:outline-none"
                      style={{ fontFamily: 'var(--font-pixel-alt)' }}
                    >
                      <option value="active">Active</option>
                      <option value="sold">Sold</option>
                      <option value="expired">Expired</option>
                      <option value="removed">Removed</option>
                      <option value="pending_review">Pending Review</option>
                    </select>

                    <button
                      onClick={() => deleteListing(listing.id)}
                      className="px-3 py-1 border border-red-500 text-red-500 font-pixel-alt text-xs hover:bg-red-500 hover:text-black min-h-[36px] touch-manipulation"
                      style={{ fontFamily: 'var(--font-pixel-alt)' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="text-purple-readable font-pixel-alt text-xs text-center" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Showing {filteredListings.length} of {listings.length} listings
      </p>
    </div>
  )
}
