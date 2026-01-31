'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, createTransferInstruction, getAccount, createAssociatedTokenAccountIdempotentInstruction, getMint } from '@solana/spl-token'
import { supabase, hashWalletAddress } from '@/lib/supabase'
import { getIPFSGatewayURL } from '@/lib/pinata'
import { getUserTier, calculatePlatformFeeRate, type Tier } from '@/lib/tier-check'
import { transferToUserEscrowTx } from '@/lib/user-pda-wallet'
import { Button } from './ui/button'
import BiddingSection from './BiddingSection'
import EscrowActions from './EscrowActions'
import EmailSignupModal from './EmailSignupModal'

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
  const [showEmailModal, setShowEmailModal] = useState(false)

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
        
        // Normalize images array - handle both array and JSON string formats
        const normalizedListing = {
          ...data,
          images: Array.isArray(data.images) ? data.images : 
                  typeof data.images === 'string' ? JSON.parse(data.images || '[]') : 
                  []
        }
        
        console.log('Fetched listing:', normalizedListing)
        console.log('Listing images:', normalizedListing.images)
        setListing(normalizedListing)
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
      const sellerTierForFee = await getUserTier(listing.wallet_address, connection)
      const feeRate = calculatePlatformFeeRate(sellerTierForFee)
      const platformFee = listing.price * feeRate
      const totalAmount = listing.price // Total amount buyer pays (includes platform fee)
      
      // Get app wallet for platform fees (collected immediately)
      const appWallet = new PublicKey(
        process.env.NEXT_PUBLIC_APP_WALLET || '11111111111111111111111111111111'
      )
      const sellerWallet = new PublicKey(listing.wallet_address)
      
      // Check buyer balance before proceeding
      if (listing.price_token === 'SOL') {
        const buyerBalance = await connection.getBalance(publicKey)
        const totalNeeded = (totalAmount + 0.001) * LAMPORTS_PER_SOL // Add buffer for fees
        
        if (buyerBalance < totalNeeded) {
          alert(`Insufficient balance. You need ${totalAmount + 0.001} SOL but only have ${(buyerBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`)
          setProcessing(false)
          return
        }
      } else {
        // Check SPL token balance
        const mintPublicKey = new PublicKey(listing.price_token)
        const buyerTokenAccount = await getAssociatedTokenAddress(mintPublicKey, publicKey)
        
        try {
          const tokenAccount = await getAccount(connection, buyerTokenAccount)
          const mintInfo = await getMint(connection, mintPublicKey)
          const buyerBalance = Number(tokenAccount.amount) / (10 ** mintInfo.decimals)
          
          if (buyerBalance < totalAmount) {
            alert(`Insufficient token balance. You need ${totalAmount} ${listing.price_token} but only have ${buyerBalance.toFixed(4)}`)
            setProcessing(false)
            return
          }
        } catch (error) {
          alert(`Token account not found. Please ensure you have ${listing.price_token} tokens in your wallet.`)
          setProcessing(false)
          return
        }
      }
      
      // Check if seller has email and escrow PDA (required)
      if (supabase) {
        const sellerHash = hashWalletAddress(listing.wallet_address)
        const { data: sellerProfile } = await supabase
          .from('profiles')
          .select('email, escrow_pda')
          .eq('wallet_address_hash', sellerHash)
          .single()

        if (!sellerProfile || !sellerProfile.email) {
          alert('Seller has not completed email signup. Please contact the seller or try again later.')
          setProcessing(false)
          return
        }

        if (!sellerProfile.escrow_pda) {
          // Create escrow PDA for seller if it doesn't exist
          const { createUserEscrowPDA } = await import('@/lib/user-pda-wallet')
          const sellerEscrowPda = await createUserEscrowPDA(listing.wallet_address)
          
          // Update seller profile with PDA
          await supabase
            .from('profiles')
            .update({ escrow_pda: sellerEscrowPda.toString() })
            .eq('wallet_address_hash', sellerHash)
        }
      }

      // Transfer funds to seller's user escrow PDA (not per-listing PDA)
      const { transaction: escrowTx, escrowPda } = await transferToUserEscrowTx(
        publicKey,
        listing.wallet_address, // Seller's wallet
        totalAmount - platformFee, // Amount after platform fee
        listing.price_token,
        connection
      )
      
      // Create separate transaction for platform fee (collected immediately)
      const platformFeeTx = new Transaction()
      
      if (listing.price_token === 'SOL') {
        // Transfer platform fee to app wallet immediately
        platformFeeTx.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: appWallet,
            lamports: Math.floor(platformFee * LAMPORTS_PER_SOL),
          })
        )
      } else {
        // SPL token platform fee
        const mintPublicKey = new PublicKey(listing.price_token)
        const buyerTokenAccount = await getAssociatedTokenAddress(mintPublicKey, publicKey)
        const appTokenAccount = await getAssociatedTokenAddress(mintPublicKey, appWallet)
        const mintInfo = await getMint(connection, mintPublicKey)
        const decimals = mintInfo.decimals
        
        // Ensure app token account exists
        try {
          await getAccount(connection, appTokenAccount)
        } catch {
          platformFeeTx.add(
            createAssociatedTokenAccountIdempotentInstruction(
              publicKey,
              appTokenAccount,
              appWallet,
              mintPublicKey
            )
          )
        }
        
        const platformFeeAmount = BigInt(Math.floor(platformFee * (10 ** decimals)))
        platformFeeTx.add(
          createTransferInstruction(
            buyerTokenAccount,
            appTokenAccount,
            publicKey,
            platformFeeAmount,
          )
        )
      }
      
      // Combine transactions
      const transaction = new Transaction()
      transaction.add(...platformFeeTx.instructions)
      transaction.add(...escrowTx.instructions)

      // Get recent blockhash and set fee payer (required for transaction)
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      // Simulate transaction first to catch errors early
      try {
        const simulation = await connection.simulateTransaction(transaction)
        if (simulation.value.err) {
          const errorMsg = typeof simulation.value.err === 'object' 
            ? JSON.stringify(simulation.value.err)
            : String(simulation.value.err)
          throw new Error(`Transaction simulation failed: ${errorMsg}`)
        }
        
        // Check if balance would be sufficient
        if (simulation.value.logs) {
          console.log('Transaction simulation logs:', simulation.value.logs)
        }
      } catch (simError: any) {
        console.error('Transaction simulation error:', simError)
        throw new Error(`Transaction simulation failed: ${simError.message || 'Unknown error'}`)
      }

      // Sign and send
      const signed = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3
      })
      
      // Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed')

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

      alert(
        `Purchase successful! Funds are now held in seller's escrow wallet.\n\n` +
        `Platform fee: ${platformFee.toFixed(4)} ${listing.price_token || 'SOL'}\n` +
        `Escrow PDA: ${escrowPda.toString()}\n` +
        `Transaction: ${signature}\n\n` +
        `The seller will receive 50% when they mark the item as shipped, ` +
        `and the remaining 50% when you confirm receipt.`
      )
      router.push('/')
      router.refresh()
    } catch (error: any) {
      console.error('Error purchasing:', error)
      
      // Provide more helpful error messages
      let errorMessage = 'Unknown error'
      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error.logs && Array.isArray(error.logs)) {
        errorMessage = `Transaction failed. Logs: ${error.logs.join(', ')}`
      }
      
      // Check for common errors
      if (errorMessage.includes('insufficient funds') || errorMessage.includes('Insufficient')) {
        errorMessage = 'Insufficient funds. Please ensure you have enough balance to cover the purchase and transaction fees.'
      } else if (errorMessage.includes('ReadonlyLamportChange')) {
        errorMessage = 'Transaction error: Account permissions issue. Please try again or contact support.'
      } else if (errorMessage.includes('simulation')) {
        errorMessage = `Transaction simulation failed: ${errorMessage}. Please check your balance and try again.`
      }
      
      alert('Purchase failed: ' + errorMessage)
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
  const getImageUrl = (image: string | null | undefined): string | null => {
    if (!image) return null
    
    // If it's already a full URL, return as-is
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image
    }
    
    // If it's a CID (Qm... or bafy...), convert to IPFS gateway URL
    if (image.startsWith('Qm') || image.startsWith('baf')) {
      return getIPFSGatewayURL(image)
    }
    
    // Try to convert to gateway URL anyway (backward compatibility)
    return getIPFSGatewayURL(image)
  }

  const imageUrls = listing.images && Array.isArray(listing.images) && listing.images.length > 0
    ? listing.images.map(getImageUrl).filter((url: string | null): url is string => url !== null)
    : []
  
  console.log('Listing images:', listing.images)
  console.log('Processed image URLs:', imageUrls)

  return (
    <div className="pixel-box bg-black border-2 sm:border-4 border-[#660099] p-4 sm:p-6 md:p-8 relative z-10">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-[#00ff00] mb-4 sm:mb-6 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
        {listing.title}
      </h1>
      
      {imageUrls.length > 0 ? (
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          {imageUrls.map((imageUrl: string, index: number) => (
            <div key={index} className="w-full bg-black/50 border-2 border-[#660099] rounded overflow-hidden relative">
              <img 
                src={imageUrl} 
                alt={`${listing.title} - Image ${index + 1}`}
                className="w-full h-auto max-h-[400px] sm:max-h-[500px] md:max-h-[600px] object-contain mx-auto"
                loading="lazy"
                onError={(e) => {
                  console.error('Image load error in ListingDetail:', {
                    url: imageUrl,
                    index,
                    listingId: listing.id,
                    title: listing.title
                  })
                  const target = e.currentTarget
                  target.style.display = 'none'
                  // Show error placeholder
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = `<div class="w-full h-64 flex items-center justify-center border-2 border-[#660099] rounded"><span class="text-[#660099] text-sm">Image ${index + 1} failed to load</span></div>`
                  }
                }}
                onLoad={() => {
                  console.log('Image loaded successfully in ListingDetail:', imageUrl)
                }}
              />
            </div>
          ))}
        </div>
      ) : listing.images && listing.images.length > 0 ? (
        <div className="mb-4 sm:mb-6 p-4 bg-black/50 border-2 border-[#660099] rounded">
          <p className="text-[#660099] text-sm font-pixel-alt mb-2">⚠️ Images found but failed to process</p>
          <p className="text-[#660099] text-xs font-pixel-alt">Raw images data: {JSON.stringify(listing.images)}</p>
          <p className="text-[#660099] text-xs font-pixel-alt mt-2">Check browser console for details.</p>
        </div>
      ) : null}

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

      {/* Show escrow info if in escrow */}
      {listing.escrow_pda && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-[#660099]/20 border-2 border-[#660099] rounded">
          <h3 className="font-pixel text-[#ff00ff] mb-2 text-base sm:text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>
            🔒 Escrow Information
          </h3>
          <p className="text-sm sm:text-base text-[#00ff00] font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Status: <span className="capitalize">{listing.escrow_status || 'pending'}</span>
          </p>
          {listing.escrow_amount && (
            <p className="text-sm sm:text-base text-[#00ff00] font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Amount in escrow: {listing.escrow_amount} {listing.price_token || 'SOL'}
            </p>
          )}
          <p className="text-xs text-[#660099] font-pixel-alt break-all" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Escrow PDA: {listing.escrow_pda}
          </p>
          {listing.tracking_number && (
            <div className="mt-3 p-2 bg-black/50 rounded">
              <p className="text-xs text-[#00ff00] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                📦 Tracking: {listing.tracking_number}
              </p>
              <p className="text-xs text-[#660099] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Carrier: {listing.shipping_carrier || 'Unknown'}
              </p>
              {listing.shipping_carrier && (
                <a
                  href={`https://www.google.com/search?q=${listing.shipping_carrier}+tracking+${listing.tracking_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#00ff00] underline font-pixel-alt mt-1 block"
                  style={{ fontFamily: 'var(--font-pixel-alt)' }}
                >
                  Track Package →
                </a>
              )}
            </div>
          )}
          {listing.shipped_at && (
            <p className="text-xs text-[#00ff00] font-pixel-alt mt-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Shipped: {new Date(listing.shipped_at).toLocaleString()}
            </p>
          )}
          {listing.received_at && (
            <p className="text-xs text-[#00ff00] font-pixel-alt mt-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Received: {new Date(listing.received_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Show escrow actions for seller or buyer */}
      {listing.escrow_pda && publicKey && (
        <EscrowActions
          listing={listing}
          userRole={
            publicKey.toString() === listing.wallet_address
              ? 'seller'
              : publicKey.toString() === listing.buyer_wallet_address
              ? 'buyer'
              : 'seller' // Default, but won't show actions
          }
        />
      )}

      {/* Legal disclaimer for escrow */}
      {listing.escrow_pda && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-900/20 border-2 border-yellow-600 rounded">
          <h4 className="font-pixel text-yellow-400 mb-2 text-sm" style={{ fontFamily: 'var(--font-pixel)' }}>
            ⚠️ Legal Disclaimer
          </h4>
          <p className="text-xs text-yellow-300 font-pixel-alt leading-relaxed" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            <strong>ESCROW SERVICE DISCLAIMER:</strong> This platform provides technical infrastructure for peer-to-peer transactions only. 
            The platform does NOT act as a money transmitter, custodian, or escrow agent. Funds are held in Program Derived Addresses (PDAs) 
            on the Solana blockchain. The platform cannot access or control these funds. Users transact directly with each other and are 
            responsible for compliance with all applicable laws including money transmitter regulations, escrow service regulations, consumer 
            protection laws, and tax obligations. Consult legal counsel before using this service. By using this service, you acknowledge 
            that you understand these risks and that the platform assumes no liability for transactions.
          </p>
        </div>
      )}

      {/* Show bidding section for auctions */}
      {listing.is_auction ? (
        <BiddingSection listing={listing} />
      ) : (
        <>
          {publicKey && publicKey.toString() !== listing.wallet_address && listing.status === 'active' && !listing.escrow_pda && (
            <Button
              onClick={handlePurchase}
              disabled={processing}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 sm:border-4 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt transition-colors min-h-[44px] text-base sm:text-lg touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              {processing ? 'Processing...' : 'Purchase'}
            </Button>
          )}

          {publicKey && publicKey.toString() === listing.wallet_address && !listing.escrow_pda && (
            <p className="text-[#660099] font-pixel-alt text-sm sm:text-base" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              This is your listing
            </p>
          )}

          {!publicKey && listing.status === 'active' && !listing.escrow_pda && (
            <p className="text-[#660099] font-pixel-alt text-sm sm:text-base" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Connect your wallet to purchase
            </p>
          )}

          {listing.status !== 'active' && !listing.escrow_pda && (
            <p className="text-[#ff0000] font-pixel-alt text-sm sm:text-base" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              This listing is {listing.status}
            </p>
          )}
        </>
      )}

      {/* Email Signup Modal */}
      <EmailSignupModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onComplete={() => {
          setShowEmailModal(false)
          // Retry purchase after email signup
          if (publicKey) {
            handlePurchase()
          }
        }}
      />
    </div>
  )
}
