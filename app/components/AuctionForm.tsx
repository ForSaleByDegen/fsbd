'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { getUserTier, calculateListingFee, TIER_THRESHOLDS } from '@/lib/tier-check'
import { supabase, hashWalletAddress } from '@/lib/supabase'
import { uploadImageToIPFS } from '@/lib/nft-storage'
import { createAuctionToken, simulateDevBuy } from '@/lib/auction-utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

export default function AuctionForm() {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tier, setTier] = useState<'free' | 'bronze' | 'silver' | 'gold'>('free')
  const [tierLoading, setTierLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'for-sale',
    reservePrice: '',
    priceToken: 'SOL',
    image: null as File | null,
    auctionDuration: '7', // days
    offersOpen: true,
    launchToken: true, // Always true for auctions
    tokenName: '',
    tokenSymbol: ''
  })

  // Check tier on mount
  useEffect(() => {
    if (publicKey && connection) {
      checkTier()
    } else {
      setTierLoading(false)
    }
  }, [publicKey, connection])

  const checkTier = async () => {
    if (!publicKey || !connection) return
    
    try {
      setTierLoading(true)
      const userTier = await getUserTier(publicKey.toString(), connection)
      setTier(userTier)
    } catch (error) {
      console.error('Error checking tier:', error)
    } finally {
      setTierLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!publicKey || !connection || !signTransaction) {
      alert('Please connect your wallet')
      return
    }

    // Check tier gate (Bronze+ required)
    if (tier === 'free') {
      alert(`Auction creation requires Bronze tier or higher. You need ${TIER_THRESHOLDS.bronze.toLocaleString()} $FBSD tokens.`)
      return
    }

    try {
      setLoading(true)
      
      // Calculate auction end time
      const durationDays = parseInt(formData.auctionDuration)
      const endTime = Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60)
      
      // Upload image to IPFS
      let imageUrl: string | null = null
      if (formData.image) {
        imageUrl = await uploadImageToIPFS(formData.image)
      }

      // Create auction token
      const { mint: tokenMint } = await createAuctionToken(
        connection,
        publicKey,
        signTransaction,
        formData.tokenName || formData.title,
        formData.tokenSymbol || 'ITEM',
        Date.now().toString() // Temporary listing ID
      )

      // Calculate fee
      const fee = calculateListingFee(tier)
      
      // Create payment transaction
      const appWallet = new PublicKey(
        process.env.NEXT_PUBLIC_APP_WALLET || '11111111111111111111111111111111'
      )
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: appWallet,
          lamports: fee * LAMPORTS_PER_SOL,
        })
      )

      // Sign and send payment
      const signed = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(signature)

      // Simulate dev buy if reserve price > 0
      const reservePrice = parseFloat(formData.reservePrice)
      if (reservePrice > 0) {
        await simulateDevBuy(connection, tokenMint, publicKey, reservePrice)
      }

      // Create listing in database
      const listingData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: reservePrice,
        price_token: formData.priceToken,
        images: imageUrl ? [imageUrl] : [],
        wallet_address_hash: hashWalletAddress(publicKey.toString()),
        wallet_address: publicKey.toString(),
        has_token: true,
        token_mint: tokenMint.toString(),
        token_name: formData.tokenName || formData.title,
        token_symbol: formData.tokenSymbol || 'ITEM',
        fee_paid: fee,
        status: 'active',
        // Auction-specific fields
        is_auction: true,
        auction_end_time: endTime,
        reserve_price: reservePrice,
        offers_open: formData.offersOpen,
        highest_bid: null,
        highest_bidder: null
      }

      if (supabase) {
        const { data, error } = await supabase
          .from('listings')
          .insert([listingData])
          .select()
          .single()

        if (error) throw error
        router.push(`/listings/${data.id}`)
      } else {
        // Fallback to API route
        const response = await fetch('/api/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(listingData)
        })
        const data = await response.json()
        router.push(`/listings/${data.id}`)
      }
    } catch (error: any) {
      console.error('Error creating auction:', error)
      alert('Failed to create auction: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const canCreateAuction = tier !== 'free'

  if (tierLoading) {
    return <div className="text-center py-12">Checking tier...</div>
  }

  return (
    <div>
      {!canCreateAuction && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 rounded">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Auction Creation Gated:</strong> You need Bronze tier ({TIER_THRESHOLDS.bronze.toLocaleString()} $FBSD) 
            or higher to create auctions. Your current tier: <strong>{tier}</strong>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
            maxLength={200}
            disabled={!canCreateAuction}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description *</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            required
            rows={6}
            maxLength={5000}
            disabled={!canCreateAuction}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category *</label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              disabled={!canCreateAuction}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="for-sale">For Sale</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="gigs">Gigs</SelectItem>
                <SelectItem value="housing">Housing</SelectItem>
                <SelectItem value="community">Community</SelectItem>
                <SelectItem value="jobs">Jobs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Reserve Price *</label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                value={formData.reservePrice}
                onChange={(e) => setFormData(prev => ({ ...prev, reservePrice: e.target.value }))}
                required
                disabled={!canCreateAuction}
              />
              <Select
                value={formData.priceToken}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priceToken: value as 'SOL' | 'USDC' }))}
                disabled={!canCreateAuction}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOL">SOL</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Auction Duration (days) *</label>
          <Select
            value={formData.auctionDuration}
            onValueChange={(value) => setFormData(prev => ({ ...prev, auctionDuration: value }))}
            disabled={!canCreateAuction}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 day</SelectItem>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Item Image (IPFS) *</label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setFormData(prev => ({ ...prev, image: file }))
            }}
            required
            disabled={!canCreateAuction}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Image will be uploaded to IPFS via NFT.Storage
          </p>
        </div>

        <div className="border-t pt-4">
          <label className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={formData.offersOpen}
              onChange={(e) => setFormData(prev => ({ ...prev, offersOpen: e.target.checked }))}
              className="w-4 h-4"
              disabled={!canCreateAuction}
            />
            <span className="text-sm font-medium">Allow offers during auction</span>
          </label>

          <div className="ml-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              A token will be automatically created for this auction listing.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Token Name</label>
                <Input
                  type="text"
                  value={formData.tokenName}
                  onChange={(e) => setFormData(prev => ({ ...prev, tokenName: e.target.value }))}
                  placeholder={formData.title || 'Item Token'}
                  disabled={!canCreateAuction}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Token Symbol</label>
                <Input
                  type="text"
                  value={formData.tokenSymbol}
                  onChange={(e) => setFormData(prev => ({ ...prev, tokenSymbol: e.target.value }))}
                  placeholder="ITEM"
                  maxLength={10}
                  disabled={!canCreateAuction}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted p-4 rounded">
          <p className="text-xs text-muted-foreground mb-2">
            <strong>⚠️ Tokens for utility only, not investment.</strong> Listing tokens are created 
            for marketing/hype purposes only. They are not financial instruments.
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading || !canCreateAuction}
          className="w-full"
        >
          {loading ? 'Creating Auction...' : canCreateAuction ? 'Create Auction (Pay Fee)' : 'Upgrade Tier to Create Auctions'}
        </Button>
      </form>
    </div>
  )
}
