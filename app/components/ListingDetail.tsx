'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, createTransferInstruction, getAccount, createAssociatedTokenAccountIdempotentInstruction, getMint } from '@solana/spl-token'
import { supabase } from '@/lib/supabase'
import { getIPFSGatewayURL } from '@/lib/pinata'
import { Button } from './ui/button'
import BiddingSection from './BiddingSection'
import ListingChat from './ListingChat'
import OptionalEscrowSection from './OptionalEscrowSection'
import TermsAgreementModal from './TermsAgreementModal'
import { hasAcceptedTerms, acceptTerms } from '@/lib/chat'

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
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [escrowThread, setEscrowThread] = useState<{ threadId: string; escrowAgreed: boolean; escrowStatus: string | null } | null>(null)

  useEffect(() => {
    fetchListing()
  }, [listingId])

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

  const handlePurchase = async () => {
    if (!publicKey || !connection || !signTransaction) {
      alert('Please connect your wallet')
      return
    }
    const termsAccepted = await hasAcceptedTerms(publicKey.toString())
    if (!termsAccepted) {
      setShowTermsModal(true)
      return
    }
    if (!confirm('Are you sure you want to purchase this item?')) {
      return
    }

    try {
      setProcessing(true)
      
      const totalAmount = listing.price
      const sellerWallet = new PublicKey(listing.wallet_address)
      
      // Check buyer balance before proceeding
      if (listing.price_token === 'SOL') {
        const buyerBalance = await connection.getBalance(publicKey)
        const totalNeeded = (totalAmount + 0.001) * LAMPORTS_PER_SOL // Add buffer for tx fees
        
        if (buyerBalance < totalNeeded) {
          const balanceSol = buyerBalance / LAMPORTS_PER_SOL
          const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'
          const hint = balanceSol === 0
            ? `\n\nTip: If you have SOL in Phantom, switch Phantom to ${network} (Settings → Developer Settings), or add NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta in Vercel if you use mainnet.`
            : ''
          alert(`Insufficient balance. You need ${totalAmount + 0.001} SOL but only have ${(balanceSol).toFixed(4)} SOL on ${network}.${hint}`)
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

      // Direct peer-to-peer transfer: buyer → seller (full amount, no escrow, no platform fee)
      const transaction = new Transaction()
      
      if (listing.price_token === 'SOL') {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: sellerWallet,
            lamports: Math.floor(totalAmount * LAMPORTS_PER_SOL),
          })
        )
      } else {
        const mintPublicKey = new PublicKey(listing.price_token)
        const buyerTokenAccount = await getAssociatedTokenAddress(mintPublicKey, publicKey)
        const sellerTokenAccount = await getAssociatedTokenAddress(mintPublicKey, sellerWallet)
        const mintInfo = await getMint(connection, mintPublicKey)
        const decimals = mintInfo.decimals
        
        try {
          await getAccount(connection, sellerTokenAccount)
        } catch {
          transaction.add(
            createAssociatedTokenAccountIdempotentInstruction(
              publicKey,
              sellerTokenAccount,
              sellerWallet,
              mintPublicKey
            )
          )
        }
        
        const amountLamports = BigInt(Math.floor(totalAmount * (10 ** decimals)))
        transaction.add(
          createTransferInstruction(
            buyerTokenAccount,
            sellerTokenAccount,
            publicKey,
            amountLamports,
          )
        )
      }

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

      // Update listing status
      if (supabase) {
        await supabase
          .from('listings')
          .update({ 
            status: 'sold',
            buyer_wallet_hash: publicKey.toString(),
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
        `Purchase successful! ${totalAmount} ${listing.price_token || 'SOL'} sent directly to seller.\n\n` +
        `Transaction: ${signature}\n\n` +
        `Coordinate with the seller for shipping. This platform does not handle payments or shipping.`
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
      </div>

      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl md:text-2xl font-pixel text-[#ff00ff] mb-2 sm:mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
          Description
        </h2>
        <p className="text-[#00ff00] font-pixel-alt text-sm sm:text-base whitespace-pre-wrap break-words" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {listing.description}
        </p>
      </div>

      {/* Encrypted chat between buyer and seller */}
      {publicKey && ['active', 'in_escrow', 'shipped'].includes(listing.status) && (
        <div className="mb-4 sm:mb-6">
          <ListingChat
            listing={{ id: listing.id, wallet_address: listing.wallet_address }}
            currentUserWallet={publicKey.toString()}
            onThreadLoaded={(threadId, escrowAgreed, escrowStatus) => {
              setEscrowThread({ threadId, escrowAgreed, escrowStatus })
            }}
            onEscrowProposed={() => setEscrowThread((t) => (t ? { ...t, escrowStatus: 'pending' } : t))}
            onEscrowAccepted={() => setEscrowThread((t) => (t ? { ...t, escrowAgreed: true, escrowStatus: 'pending' } : t))}
          />
        </div>
      )}

      {/* Optional escrow when both parties agreed */}
      {publicKey && escrowThread?.escrowAgreed && escrowThread.threadId && (
        <OptionalEscrowSection
          listing={{
            id: listing.id,
            title: listing.title,
            price: listing.price,
            price_token: listing.price_token,
            wallet_address: listing.wallet_address,
            escrow_pda: listing.escrow_pda,
            escrow_status: listing.escrow_status,
            tracking_number: listing.tracking_number,
            shipping_carrier: listing.shipping_carrier,
          }}
          threadId={escrowThread.threadId}
          escrowAgreed={escrowThread.escrowAgreed}
          escrowStatus={escrowThread.escrowStatus}
          userRole={publicKey.toString() === listing.wallet_address ? 'seller' : 'buyer'}
          onUpdate={() => fetchListing()}
        />
      )}

      {/* Prominent disclaimer - condition & delivery (Craigslist-style) */}
      <div className="mb-4 sm:mb-6 p-4 sm:p-5 bg-red-950/40 border-2 border-[#ff0000] rounded">
        <h3 className="font-pixel text-[#ff0000] mb-2 text-base sm:text-lg font-bold" style={{ fontFamily: 'var(--font-pixel)' }}>
          ⚠️ BUYER & SELLER BEWARE
        </h3>
        <p className="text-sm text-[#00ff00] font-pixel-alt leading-relaxed mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          <strong className="text-[#ff0000]">We cannot guarantee:</strong> item condition, authenticity, or successful delivery. 
          Listings are AS IS, AS AVAILABLE. We are not a party to transactions. We do not verify listings or shipping. 
          All risk is yours. Use at your own risk. All transactions are final.
        </p>
        <p className="text-xs text-[#660099] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          <a href="/terms" className="text-[#ff00ff] underline">Full Terms of Service</a>
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
          {publicKey && publicKey.toString() !== listing.wallet_address && listing.status === 'active' && (
            <Button
              onClick={handlePurchase}
              disabled={processing}
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

          {!publicKey && listing.status === 'active' && (
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

      <TermsAgreementModal
        isOpen={showTermsModal}
        onAccept={async () => {
          if (publicKey) {
            await acceptTerms(publicKey.toString())
            setShowTermsModal(false)
            handlePurchase()
          }
        }}
        onDecline={() => setShowTermsModal(false)}
      />
    </div>
  )
}
