'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { supabase, hashWalletAddress } from '@/lib/supabase'
import ListingCard from './ListingCard'
import { Button } from './ui/button'

export default function MyListings() {
  const { publicKey, connected } = useWallet()
  const router = useRouter()
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!connected || !publicKey) {
      router.push('/')
      return
    }
    fetchMyListings()
  }, [connected, publicKey])

  const handleUnlist = async (listingId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!publicKey) return
    if (!confirm('Remove this listing from the marketplace? You can relist it anytime.')) return
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toString(), action: 'unlist' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to unlist')
      setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, status: 'removed' } : l)))
      router.refresh()
    } catch (err) {
      alert('Failed to unlist: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleRelist = async (listingId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!publicKey) return
    if (!confirm('Put this listing back on the marketplace?')) return
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toString(), action: 'relist' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to relist')
      setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, status: 'active' } : l)))
      router.refresh()
    } catch (err) {
      alert('Failed to relist: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const fetchMyListings = async () => {
    if (!publicKey) return
    
    try {
      setLoading(true)
      const wallet = publicKey.toString()
      const res = await fetch(`/api/listings/my?wallet=${encodeURIComponent(wallet)}`)
      if (res.ok) {
        const data = await res.json()
        setListings(Array.isArray(data) ? data : [])
      } else if (supabase) {
        const walletHash = hashWalletAddress(wallet)
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('wallet_address_hash', walletHash)
          .order('created_at', { ascending: false })
        if (error) throw error
        setListings(data || [])
      } else {
        const allRes = await fetch('/api/listings')
        const allListings = await allRes.json()
        setListings(Array.isArray(allListings) ? allListings.filter((l: any) => l.wallet_address === wallet) : [])
      }
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return null
  }

  return (
    <>
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          You haven't created any listings yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div key={listing.id} className="flex flex-col gap-2">
              <ListingCard listing={listing} />
              {listing.status === 'active' && (
                <Button
                  onClick={(e) => handleUnlist(listing.id, e)}
                  variant="outline"
                  className="border-[#ff6600] text-[#ff6600] hover:bg-[#ff6600]/20 w-fit text-sm"
                >
                  Unlist / Remove
                </Button>
              )}
              {listing.status === 'removed' && (
                <Button
                  onClick={(e) => handleRelist(listing.id, e)}
                  variant="outline"
                  className="border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20 w-fit text-sm"
                >
                  Relist
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
