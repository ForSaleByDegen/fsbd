'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token'
import { supabase } from '@/lib/supabase'
import { getIPFSURL } from '@/lib/ipfs'
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
      
      // Create payment transaction (simplified escrow - direct transfer)
      // TODO: Implement proper escrow with Solana program
      const sellerWallet = new PublicKey(listing.wallet_address)
      const transaction = new Transaction()

      if (listing.price_token === 'SOL') {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: sellerWallet,
            lamports: listing.price * LAMPORTS_PER_SOL,
          })
        )
      } else {
        // USDC or other SPL tokens
        const mintPublicKey = new PublicKey(listing.price_token)
        const buyerTokenAccount = await getAssociatedTokenAddress(mintPublicKey, publicKey)
        const sellerTokenAccount = await getAssociatedTokenAddress(mintPublicKey, sellerWallet)
        
        transaction.add(
          createTransferInstruction(
            buyerTokenAccount,
            sellerTokenAccount,
            publicKey,
            BigInt(listing.price * (10 ** 9)), // Adjust decimals as needed
          )
        )
      }

      // Sign and send
      const signed = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(signature)

      // Update listing status
      if (supabase) {
        await supabase
          .from('listings')
          .update({ 
            status: 'sold',
            buyer_wallet_hash: publicKey.toString() // Would hash in production
          })
          .eq('id', listingId)
      }

      alert('Purchase successful! Contact the seller to complete the transaction.')
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

  const imageUrl = listing.images && listing.images.length > 0
    ? listing.images[0].startsWith('Qm') || listing.images[0].startsWith('baf')
      ? getIPFSURL(listing.images[0])
      : listing.images[0]
    : null

  return (
    <div className="bg-card rounded-lg shadow-lg p-8">
      <h1 className="text-3xl font-bold mb-4">{listing.title}</h1>
      
      {imageUrl && (
        <div className="mb-6">
          <img 
            src={imageUrl} 
            alt={listing.title}
            className="w-full max-h-96 object-contain rounded"
          />
        </div>
      )}

      <div className="mb-6">
        <span className="text-2xl font-bold text-primary">
          {listing.price} {listing.price_token || 'SOL'}
        </span>
        <span className="ml-4 text-sm text-muted-foreground capitalize">
          {listing.category?.replace('-', ' ')}
        </span>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Description</h2>
        <p className="text-foreground whitespace-pre-wrap">{listing.description}</p>
      </div>

      {listing.has_token && listing.token_mint && (
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded">
          <h3 className="font-semibold mb-2">🪙 Listing Token</h3>
          <p className="text-sm text-muted-foreground">
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
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? 'Processing...' : 'Purchase'}
            </Button>
          )}

          {publicKey && publicKey.toString() === listing.wallet_address && (
            <p className="text-muted-foreground">This is your listing</p>
          )}
        </>
      )}
    </div>
  )
}
