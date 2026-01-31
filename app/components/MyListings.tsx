'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { supabase, hashWalletAddress } from '@/lib/supabase'
import ListingCard from './ListingCard'

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
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </>
  )
}
