'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token'
import { supabase } from '@/lib/supabase'
import { getIPFSGatewayURL } from '@/lib/pinata'
import { getUserTier, calculatePlatformFeeRate, type Tier } from '@/lib/tier-check'
import { Button } from './ui/button'
import BiddingSection from './BiddingSection'

interface ListingDetailProps {
  listingId: string
}

export default function ListingDetail({ listingId }: ListingDetailProps) {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const router = useRouter()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [sellerTier, setSellerTier] = useState<Tier>('free')
  const [platformFeeRate, setPlatformFeeRate] = useState<number>(0.0042) // Default 0.42%

  useEffect(() => {
    fetchListing()
  }, [listingId])

  useEffect(() => {
    // Fetch seller's tier to calculate platform fee rate
    if (listing?.wallet_address && connection) {
      loadSellerTier()
    }
  }, [listing?.wallet_address, connection])

  const fetchListing = async () => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .single()

        if (error) throw error
        setListing(data)
      } else {
        const response = await fetch(`/api/listings/${listingId}`)
        const data = await response.json()
        setListing(data)
      }
    } catch (error) {
      console.error('Error fetching listing:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSellerTier = async () => {
    if (!listing?.wallet_address || !connection) return
    
    try {
      const tier = await getUserTier(listing.wallet_address, connection)
      setSellerTier(tier)
      const feeRate = calculatePlatformFeeRate(tier)
      setPlatformFeeRate(feeRate)
    } catch (error) {
      console.error('Error loading seller tier:', error)
      // Default to free tier rate if error
      setPlatformFeeRate(0.0042)
    }
  }

  const handlePurchase = async () => {
    if (!publicKey || !connection || !signTransaction) {
      alert('Please connect your wallet')
      return
    }

    if (!confirm('Are you sure you want to purchase this item?')) {
      return
    }

    try {
      setProcessing(true)
      
      // Calculate platform fee based on seller's tier
      // Get seller's tier to determine fee rate
      const sellerTierForFee = await getUserTier(listing.wallet_address, connection)
      const feeRate = calculatePlatformFeeRate(sellerTierForFee)
      const platformFee = listing.price * feeRate
      const sellerAmount = listing.price - platformFee
      
      // Get app wallet for platform fees
      const appWallet = new PublicKey(
        process.env.NEXT_PUBLIC_APP_WALLET || '11111111111111111111111111111111'
      )
      const sellerWallet = new PublicKey(listing.wallet_address)
      const transaction = new Transaction()

      if (listing.price_token === 'SOL') {
        // Transfer platform fee to app wallet
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: appWallet,
            lamports: platformFee * LAMPORTS_PER_SOL,
          })
        )
        
        // Transfer remaining amount to seller
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: sellerWallet,
            lamports: sellerAmount * LAMPORTS_PER_SOL,
          })
        )
      } else {
        // USDC or other SPL tokens - split payment
        const mintPublicKey = new PublicKey(listing.price_token)
        const buyerTokenAccount = await getAssociatedTokenAddress(mintPublicKey, publicKey)
        const sellerTokenAccount = await getAssociatedTokenAddress(mintPublicKey, sellerWallet)
        const appTokenAccount = await getAssociatedTokenAddress(mintPublicKey, appWallet)
        
        // Get token decimals (assuming 9 for most, but USDC uses 6)
        const decimals = listing.price_token === 'USDC' ? 6 : 9
        
        // Transfer platform fee to app wallet
        transaction.add(
          createTransferInstruction(
            buyerTokenAccount,
            appTokenAccount,
            publicKey,
            BigInt(Math.floor(platformFee * (10 ** decimals))),
          )
        )
        
        // Transfer remaining to seller
        transaction.add(
          createTransferInstruction(
            buyerTokenAccount,
            sellerTokenAccount,
            publicKey,
            BigInt(Math.floor(sellerAmount * (10 ** decimals))),
          )
        )
      }

      // Get recent blockhash and set fee payer (required for transaction)
      const { blockhash } = await connection.getLatestBlockhash('finalized')
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      // Sign and send
      const signed = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(signature)

      // Update listing status and track platform fee
      if (supabase) {
        await supabase
          .from('listings')
          .update({ 
            status: 'sold',
            buyer_wallet_hash: publicKey.toString(), // Would hash in production
            platform_fee: platformFee
          })
          .eq('id', listingId)
        
        // Update seller's total listings sold count
        try {
          const { hashWalletAddress } = await import('@/lib/supabase')
          const sellerHash = hashWalletAddress(listing.wallet_address)
          const { data: sellerProfile } = await supabase
            .from('profiles')
            .select('total_listings_sold')
            .eq('wallet_address_hash', sellerHash)
            .single()
          
          if (sellerProfile) {
            await supabase
              .from('profiles')
              .update({ 
                total_listings_sold: (sellerProfile.total_listings_sold || 0) + 1 
              })
              .eq('wallet_address_hash', sellerHash)
          }
        } catch (error) {
          console.error('Error updating seller stats:', error)
          // Don't fail purchase if stats update fails
        }
      }

      alert(`Purchase successful! Platform fee: ${platformFee.toFixed(4)} ${listing.price_token || 'SOL'}. Contact the seller to complete the transaction.`)
      router.push('/')
    } catch (error: any) {
      console.error('Error purchasing:', error)
      alert('Purchase failed: ' + (error.message || 'Unknown error'))
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!listing) {
    return <div className="text-center py-12">Listing not found</div>
  }

  // Process images - handle both CIDs and full URLs
  const getImageUrl = (image: string): string => {
    if (!image) return ''
    
    // If it's already a full URL, return as-is
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image
    }
    
    // If it's a CID (Qm... or bafy...), convert to IPFS gateway URL
    if (image.startsWith('Qm') || image.startsWith('baf')) {
      return getIPFSGatewayURL(image)
    }
    
    // Try to convert to gateway URL anyway
    return getIPFSGatewayURL(image)
  }

  const imageUrls = listing.images && listing.images.length > 0
    ? listing.images.map(getImageUrl).filter((url: string) => url)
    : []

  return (
    <div className="pixel-box bg-black border-2 sm:border-4 border-[#660099] p-4 sm:p-6 md:p-8 relative z-10">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-[#00ff00] mb-4 sm:mb-6 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
        {listing.title}
      </h1>
      
      {imageUrls.length > 0 && (
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          {imageUrls.map((imageUrl: string, index: number) => (
            <div key={index} className="w-full bg-black/50 border-2 border-[#660099] rounded overflow-hidden">
              <img 
                src={imageUrl} 
                alt={`${listing.title} - Image ${index + 1}`}
                className="w-full h-auto max-h-[400px] sm:max-h-[500px] md:max-h-[600px] object-contain mx-auto"
                loading="lazy"
                onError={(e) => {
                  console.error('Image load error:', imageUrl)
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <span className="text-xl sm:text-2xl md:text-3xl font-pixel text-[#00ff00] font-bold" style={{ fontFamily: 'var(--font-pixel)' }}>
            {listing.price} {listing.price_token || 'SOL'}
          </span>
          <span className="text-sm sm:text-base text-[#660099] font-pixel-alt capitalize" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            {listing.category?.replace('-', ' ')}
          </span>
        </div>
        {publicKey && publicKey.toString() !== listing.wallet_address && (
          <p className="text-xs sm:text-sm text-[#660099] font-pixel-alt mt-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Platform fee: {(listing.price * platformFeeRate).toFixed(4)} {listing.price_token || 'SOL'} ({(platformFeeRate * 100).toFixed(3)}% - {sellerTier} tier)
          </p>
        )}
      </div>

      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl md:text-2xl font-pixel text-[#ff00ff] mb-2 sm:mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
          Description
        </h2>
        <p className="text-[#00ff00] font-pixel-alt text-sm sm:text-base whitespace-pre-wrap break-words" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {listing.description}
        </p>
      </div>

      {listing.has_token && listing.token_mint && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-[#660099]/20 border-2 border-[#660099] rounded">
          <h3 className="font-pixel text-[#ff00ff] mb-2 text-base sm:text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>
            🪙 Listing Token
          </h3>
          <p className="text-sm sm:text-base text-[#00ff00] font-pixel-alt break-all" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            This listing has its own token! Mint: {listing.token_mint}
          </p>
        </div>
      )}

      {/* Show bidding section for auctions */}
      {listing.is_auction ? (
        <BiddingSection listing={listing} />
      ) : (
        <>
          {publicKey && publicKey.toString() !== listing.wallet_address && (
            <Button
              onClick={handlePurchase}
              disabled={processing || listing.status !== 'active'}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 sm:border-4 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt transition-colors min-h-[44px] text-base sm:text-lg touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              {processing ? 'Processing...' : 'Purchase'}
            </Button>
          )}

          {publicKey && publicKey.toString() === listing.wallet_address && (
            <p className="text-[#660099] font-pixel-alt text-sm sm:text-base" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              This is your listing
            </p>
          )}

          {!publicKey && (
            <p className="text-[#660099] font-pixel-alt text-sm sm:text-base" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Connect your wallet to purchase
            </p>
          )}

          {listing.status !== 'active' && (
            <p className="text-[#ff0000] font-pixel-alt text-sm sm:text-base" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              This listing is {listing.status}
            </p>
          )}
        </>
      )}
    </div>
  )
}
