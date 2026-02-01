'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { supabase } from '@/lib/supabase'
import { sendTransactionWithRebate, shouldUseRebate } from '@/lib/helius-rebate'
import { getIPFSGatewayURL } from '@/lib/pinata'
import { Button } from './ui/button'
import BiddingSection from './BiddingSection'
import ListingChat from './ListingChat'
import OptionalEscrowSection from './OptionalEscrowSection'
import TermsAgreementModal from './TermsAgreementModal'
import { hasAcceptedTerms, acceptTerms } from '@/lib/chat'

/** Solana Pay link - alternative when in-app transaction fails */
function SolanaPayLink({ listingId }: { listingId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (url) {
      window.open(url, '_blank')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/listings/${listingId}/purchase-params`, { cache: 'no-store' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Could not load payment details')
      }
      const p = await res.json() as { recipient: string; amount: number; token: string; mint?: string }
      const base = `solana:${p.recipient}`
      const params = new URLSearchParams()
      params.set('label', 'FSBD Purchase')
      if (p.token === 'SOL') {
        params.set('amount', String(Math.ceil(p.amount * LAMPORTS_PER_SOL)))
      } else if (p.mint) {
        // SPL: amount in smallest unit (USDC=6 decimals)
        const decimals = 6
        params.set('amount', String(Math.ceil(p.amount * 10 ** decimals)))
        params.set('spl-token', p.mint)
      } else {
        throw new Error('Token not supported for link payment')
      }
      const fullUrl = `${base}?${params.toString()}`
      setUrl(fullUrl)
      window.open(fullUrl, '_blank')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-xs sm:text-sm text-[#660099] hover:text-[#ff00ff] underline font-pixel-alt disabled:opacity-50"
      style={{ fontFamily: 'var(--font-pixel-alt)' }}
    >
      {loading ? 'Loading...' : error ? `Error: ${error}` : 'Having trouble? Pay via wallet link'}
    </button>
  )
}

/** Unlist button - removes listing from marketplace (owner can re-list later) */
function UnlistButton({ listingId, onSuccess }: { listingId: string; onSuccess: () => void }) {
  const { publicKey } = useWallet()
  const [loading, setLoading] = useState(false)

  const handleUnlist = async () => {
    if (!publicKey) return
    if (!confirm('Remove this listing from the marketplace? You can create a new listing later if you want to sell again.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toString(), action: 'unlist' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to unlist')
      alert('Listing removed. You can create a new listing whenever you\'re ready.')
      onSuccess()
    } catch (e) {
      alert('Failed to unlist: ' + (e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleUnlist}
      disabled={loading}
      variant="outline"
      className="border-[#ff6600] text-[#ff6600] hover:bg-[#ff6600]/20 w-fit text-sm"
    >
      {loading ? 'Removing...' : 'Unlist / Remove'}
    </Button>
  )
}

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

  const handleThreadLoaded = useCallback((threadId: string, escrowAgreed: boolean, escrowStatus: string | null) => {
    setEscrowThread({ threadId, escrowAgreed, escrowStatus })
  }, [])
  const handleEscrowProposed = useCallback(() => {
    setEscrowThread((t) => (t ? { ...t, escrowStatus: 'pending' } : t))
  }, [])
  const handleEscrowAccepted = useCallback(() => {
    setEscrowThread((t) => (t ? { ...t, escrowAgreed: true, escrowStatus: 'pending' } : t))
  }, [])

  useEffect(() => {
    fetchListing()
  }, [listingId])

  const fetchListing = async () => {
    try {
      // Prefer API route (service role) to ensure wallet_address is returned correctly
      const response = await fetch(`/api/listings/${listingId}`, { cache: 'no-store' })
      let data: Record<string, unknown> | null = null
      if (response.ok) {
        data = await response.json()
      } else if (response.status === 503 && supabase) {
        // Fallback to anon client if service role not configured
        const { data: supabaseData, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .single()
        if (error) throw error
        data = supabaseData
      } else {
        if (response.status === 404) throw new Error('Listing not found')
        throw new Error(await response.text())
      }
      
      if (!data) throw new Error('No listing data')
      
      // Normalize images array - handle both array and JSON string formats
      const normalizedListing = {
        ...data,
        images: Array.isArray(data.images) ? data.images : 
                typeof data.images === 'string' ? JSON.parse(data.images || '[]') : 
                []
      }
      
      setListing(normalizedListing)
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
    if (!listing) {
      alert('Please wait for the listing to load.')
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

      // Server builds transaction - seller wallet NEVER reaches client (avoids base58/corruption)
      const prepRes = await fetch(`/api/listings/${listingId}/prepare-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer: publicKey.toString() }),
      })
      if (!prepRes.ok) {
        const err = await prepRes.json().catch(() => ({}))
        const msg = err.error || prepRes.statusText || 'Could not prepare transaction.'
        throw new Error(msg)
      }
      const prep = await prepRes.json() as {
        transactionBase64: string
        blockhash: string
        lastValidBlockHeight: number
        amount: number
        token: string
        sellerWalletHash: string
      }
      const totalAmount = prep.amount

      // Deserialize transaction (no PublicKey on client - built server-side)
      const binary = atob(prep.transactionBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const transaction = Transaction.from(bytes)

      // Simulate transaction first; if RPC simulation fails (e.g. AccountNotFound), retry with skipPreflight
      let skipPreflight = false
      try {
        const simulation = await connection.simulateTransaction(transaction)
        if (simulation.value.err) {
          const errorMsg = typeof simulation.value.err === 'object' 
            ? JSON.stringify(simulation.value.err)
            : String(simulation.value.err)
          throw new Error(`Transaction simulation failed: ${errorMsg}`)
        }
        if (simulation.value.logs) {
          console.log('Transaction simulation logs:', simulation.value.logs)
        }
      } catch (simError: any) {
        console.error('Transaction simulation error:', simError)
        const msg = simError?.message || ''
        const isRpcSimIssue = /AccountNotFound|0 SOL|Attempt to debit|prior credit/i.test(msg)
        if (isRpcSimIssue) {
          const retry = confirm(
            'RPC simulation failed (often incorrect with Phantom). Send transaction anyway? This skips simulation and submits directly to the network.'
          )
          if (retry) skipPreflight = true
          else throw new Error(`Transaction simulation failed: ${msg}`)
        } else {
          throw new Error(`Transaction simulation failed: ${msg}`)
        }
      }

      const doSignAndSend = async (tx: Transaction): Promise<{ signature: string; blockhash: string; lastValidBlockHeight: number }> => {
        const signed = await signTransaction(tx)
        const serialized = signed.serialize()
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL
        const opts = { skipPreflight, maxRetries: 3 }
        let sig: string
        if (shouldUseRebate() && rpcUrl) {
          try {
            sig = await sendTransactionWithRebate(serialized, publicKey.toString(), rpcUrl, opts)
          } catch (rebateErr: unknown) {
            const rebateMsg = rebateErr instanceof Error ? rebateErr.message : String(rebateErr)
            if (/failed to fetch|ERR_CONNECTION|network|fetch/i.test(rebateMsg)) {
              console.warn('Helius rebate request failed, falling back to standard RPC:', rebateMsg)
              sig = await connection.sendRawTransaction(serialized, opts)
            } else {
              throw rebateErr
            }
          }
        } else {
          sig = await connection.sendRawTransaction(serialized, opts)
        }
        return { signature: sig, blockhash: prep.blockhash, lastValidBlockHeight: prep.lastValidBlockHeight }
      }

      let signature: string
      let blockhash: string
      let lastValidBlockHeight: number
      try {
        const result = await doSignAndSend(transaction)
        signature = result.signature
        blockhash = result.blockhash
        lastValidBlockHeight = result.lastValidBlockHeight
      } catch (sendErr: unknown) {
        const msg = sendErr instanceof Error ? sendErr.message : String(sendErr)
        const isBlockHeightExceeded = /block height exceeded|TransactionExpiredBlockheightExceeded|expired/i.test(msg)
        if (isBlockHeightExceeded) {
          const retry = confirm(
            'Transaction expired (blockhash timed out). Prepare fresh transaction and sign again?'
          )
          if (retry) {
            const prepRes2 = await fetch(`/api/listings/${listingId}/prepare-transfer`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ buyer: publicKey.toString() }),
            })
            if (!prepRes2.ok) throw new Error('Could not prepare fresh transaction')
            const prep2 = await prepRes2.json()
            const binary2 = atob(prep2.transactionBase64)
            const bytes2 = new Uint8Array(binary2.length)
            for (let i = 0; i < binary2.length; i++) bytes2[i] = binary2.charCodeAt(i)
            const tx2 = Transaction.from(bytes2)
            const result = await doSignAndSend(tx2)
            signature = result.signature
            blockhash = result.blockhash
            lastValidBlockHeight = result.lastValidBlockHeight
          } else {
            throw sendErr instanceof Error ? sendErr : new Error(String(sendErr))
          }
        } else {
          throw sendErr instanceof Error ? sendErr : new Error(String(sendErr))
        }
      }

      try {
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed')
      } catch (confirmErr: unknown) {
        const confirmMsg = confirmErr instanceof Error ? confirmErr.message : String(confirmErr)
        if (/block height exceeded|expired/i.test(confirmMsg)) {
          console.warn('Confirmation timed out but tx may have succeeded:', signature)
          alert(
            `Transaction was sent. Confirmation timed out, but it may have succeeded.\n\n` +
            `Signature: ${signature}\n\nCheck your wallet and Solscan to verify.`
          )
          router.push('/')
          router.refresh()
          setProcessing(false)
          return
        }
        throw confirmErr
      }

      const markRes = await fetch(`/api/listings/${listingId}/mark-sold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer: publicKey.toString(),
          signature,
          sellerWalletHash: prep.sellerWalletHash,
        }),
      })

      if (!markRes.ok) {
        const errData = await markRes.json().catch(() => ({}))
        console.error('Mark sold failed:', errData)
        if (markRes.status === 409) {
          setListing((prev: Record<string, unknown> | null) => (prev ? { ...prev, status: 'sold' } : prev))
          alert('This item was already sold. Your payment was sent — check with the seller.')
        } else {
          alert(
            'Purchase sent! However we could not update the listing status. The seller received your payment. ' +
            `Tx: ${signature}`
          )
        }
      } else {
        setListing((prev: Record<string, unknown> | null) => (prev ? { ...prev, status: 'sold' } : prev))
        alert(
          `Purchase successful! ${totalAmount} ${prep.token} sent directly to seller.\n\n` +
          `Transaction: ${signature}\n\n` +
          `Coordinate with the seller for shipping. This platform does not handle payments or shipping.`
        )
      }

      router.push('/profile')
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
      if (errorMessage.includes('invalid base58') || errorMessage.includes('InvalidCharacter')) {
        errorMessage = 'Invalid listing data (seller address or token). This listing may be corrupted. Please try another listing.'
      } else if (errorMessage.includes('insufficient funds') || errorMessage.includes('Insufficient')) {
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-wrap">
          <span className="text-xl sm:text-2xl md:text-3xl font-pixel text-[#00ff00] font-bold" style={{ fontFamily: 'var(--font-pixel)' }}>
            {listing.price} {listing.price_token || 'SOL'}
          </span>
          {(listing as { quantity?: number }).quantity != null && (listing as { quantity?: number }).quantity > 1 && (
            <span className="text-sm sm:text-base text-[#00ff00] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              ×{(listing as { quantity?: number }).quantity} available
            </span>
          )}
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
            onThreadLoaded={handleThreadLoaded}
            onEscrowProposed={handleEscrowProposed}
            onEscrowAccepted={handleEscrowAccepted}
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
            <div className="flex flex-col gap-2">
              <Button
                onClick={handlePurchase}
                disabled={processing}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 sm:border-4 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt transition-colors min-h-[44px] text-base sm:text-lg touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                {processing ? 'Processing...' : 'Purchase'}
              </Button>
              <SolanaPayLink listingId={listingId} />
            </div>
          )}

          {publicKey && publicKey.toString() === listing.wallet_address && (
            <div className="flex flex-col gap-2">
              <p className="text-[#660099] font-pixel-alt text-sm sm:text-base" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                This is your listing
              </p>
              {listing.status === 'active' && (
                <UnlistButton
                  listingId={listingId}
                  onSuccess={() => { router.push('/profile'); router.refresh(); }}
                />
              )}
            </div>
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
