'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { createBidEscrow, isAuctionEnded } from '@/lib/auction-utils'
import { supabase } from '@/lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface BiddingSectionProps {
  listing: {
    id: string
    is_auction: boolean
    auction_end_time?: number
    reserve_price: number
    price_token: string
    highest_bid?: number
    highest_bidder?: string
    wallet_address: string
  }
}

export default function BiddingSection({ listing }: BiddingSectionProps) {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const [bidAmount, setBidAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [auctionEnded, setAuctionEnded] = useState(false)
  const [highestBid, setHighestBid] = useState(listing.highest_bid || listing.reserve_price || 0)

  useEffect(() => {
    if (listing.is_auction && listing.auction_end_time && connection) {
      checkAuctionStatus()
      // Check every minute
      const interval = setInterval(checkAuctionStatus, 60000)
      return () => clearInterval(interval)
    }
  }, [listing, connection])

  const checkAuctionStatus = async () => {
    if (!listing.auction_end_time || !connection) return
    
    const ended = await isAuctionEnded(connection, listing.auction_end_time)
    setAuctionEnded(ended)
  }

  const handleBid = async () => {
    if (!publicKey || !connection || !signTransaction) {
      alert('Please connect your wallet')
      return
    }

    const bid = parseFloat(bidAmount)
    if (isNaN(bid) || bid <= 0) {
      alert('Please enter a valid bid amount')
      return
    }

    if (bid <= highestBid) {
      alert(`Bid must be higher than current highest bid: ${highestBid} ${listing.price_token}`)
      return
    }

    if (bid < listing.reserve_price) {
      alert(`Bid must meet or exceed reserve price: ${listing.reserve_price} ${listing.price_token}`)
      return
    }

    try {
      setLoading(true)

      // Create escrow PDA and transfer funds
      // createBidEscrow handles unit conversion internally
      const { pda, signature } = await createBidEscrow(
        connection,
        publicKey,
        signTransaction,
        listing.id,
        bid, // Pass in human-readable amount (SOL or USDC)
        listing.price_token as 'SOL' | 'USDC'
      )

      // Update listing with new highest bid
      if (supabase) {
        const { error } = await supabase
          .from('listings')
          .update({
            highest_bid: bid,
            highest_bidder: publicKey.toString(),
            highest_bid_escrow: pda.toString()
          })
          .eq('id', listing.id)

        if (error) throw error
      } else {
        // Fallback API call
        await fetch(`/api/listings/${listing.id}/bid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bidAmount: bid,
            bidder: publicKey.toString(),
            escrowPDA: pda.toString()
          })
        })
      }

      setHighestBid(bid)
      setBidAmount('')
      alert(`Bid placed successfully! Transaction: ${signature}`)
    } catch (error: any) {
      console.error('Error placing bid:', error)
      alert('Failed to place bid: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  if (!listing.is_auction) {
    return null
  }

  const isOwner = publicKey?.toString() === listing.wallet_address
  const canBid = !isOwner && !auctionEnded && publicKey

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!listing.auction_end_time) return 'Unknown'
    const now = Math.floor(Date.now() / 1000)
    const remaining = listing.auction_end_time - now
    
    if (remaining <= 0) return 'Ended'
    
    const days = Math.floor(remaining / 86400)
    const hours = Math.floor((remaining % 86400) / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <div className="border-t pt-6 mt-6">
      <h3 className="text-xl font-semibold mb-4">Auction Details</h3>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Reserve Price:</span>
          <span className="font-semibold">{listing.reserve_price} {listing.price_token}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Current Highest Bid:</span>
          <span className="font-semibold text-primary">
            {highestBid} {listing.price_token}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Time Remaining:</span>
          <span className={auctionEnded ? 'text-red-500' : 'text-green-500'}>
            {auctionEnded ? 'Auction Ended' : getTimeRemaining()}
          </span>
        </div>
      </div>

      {auctionEnded ? (
        <div className="p-4 bg-muted rounded">
          <p className="text-sm">
            {highestBid >= listing.reserve_price 
              ? 'Auction ended successfully. Winner will be contacted.'
              : 'Auction ended without meeting reserve price.'}
          </p>
        </div>
      ) : canBid ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Place Bid (min: {Math.max(highestBid + 0.01, listing.reserve_price).toFixed(2)} {listing.price_token})
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`${Math.max(highestBid + 0.01, listing.reserve_price).toFixed(2)}`}
                className="flex-1"
              />
              <Button
                onClick={handleBid}
                disabled={loading}
              >
                {loading ? 'Placing Bid...' : 'Place Bid'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Funds will be held in escrow until auction ends
            </p>
          </div>
        </div>
      ) : isOwner ? (
        <p className="text-muted-foreground">You cannot bid on your own auction</p>
      ) : (
        <p className="text-muted-foreground">Connect wallet to place a bid</p>
      )}
    </div>
  )
}
