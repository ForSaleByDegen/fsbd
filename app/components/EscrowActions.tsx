'use client'

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { supabase, hashWalletAddress } from '@/lib/supabase'
import { Button } from './ui/button'

interface EscrowActionsProps {
  listing: {
    id: string
    title: string
    wallet_address: string
    escrow_pda?: string
    escrow_status?: string
    escrow_amount?: number
    price_token?: string
    first_half_released?: boolean
    second_half_released?: boolean
    buyer_wallet_address?: string
  }
  userRole: 'seller' | 'buyer'
}

export default function EscrowActions({ listing, userRole }: EscrowActionsProps) {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleMarkShipped = async () => {
    if (!publicKey || !signTransaction) {
      alert('Please connect your wallet')
      return
    }

    // Verify user is the seller
    if (publicKey.toString() !== listing.wallet_address) {
      alert('Only the seller can mark an item as shipped')
      return
    }

    if (!confirm(
      'Mark this item as shipped?\n\n' +
      'This will release 50% of the escrow funds to you.\n' +
      'The remaining 50% will be released when the buyer confirms receipt.\n\n' +
      'IMPORTANT: Only mark as shipped after you have actually shipped the item.'
    )) {
      return
    }

    try {
      setProcessing(true)
      setError(null)

      // Update database to mark as shipped
      if (supabase) {
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            escrow_status: 'shipped',
            status: 'shipped',
            shipped_at: new Date().toISOString(),
            first_half_released: false // Will be set to true when actual release happens via program
          })
          .eq('id', listing.id)

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`)
        }

        alert(
          'Item marked as shipped!\n\n' +
          'The buyer will be notified. Once they confirm receipt, ' +
          'the remaining 50% will be released to you.\n\n' +
          'NOTE: Actual fund release requires a Solana escrow program. ' +
          'For MVP, the status is updated but funds will be released when the program is deployed.'
        )
        
        // Refresh the page to show updated status
        window.location.reload()
      }
    } catch (err: any) {
      console.error('Error marking as shipped:', err)
      setError(err.message || 'Failed to mark as shipped')
      alert('Error: ' + (err.message || 'Failed to mark as shipped'))
    } finally {
      setProcessing(false)
    }
  }

  const handleConfirmReceipt = async () => {
    if (!publicKey || !signTransaction) {
      alert('Please connect your wallet')
      return
    }

    // Verify user is the buyer
    if (!listing.buyer_wallet_address || publicKey.toString() !== listing.buyer_wallet_address) {
      alert('Only the buyer can confirm receipt')
      return
    }

    if (!confirm(
      'Confirm that you have received this item?\n\n' +
      'This will release the remaining 50% of escrow funds to the seller.\n\n' +
      'IMPORTANT: Only confirm receipt after you have actually received ' +
      'and inspected the item. This action cannot be undone.'
    )) {
      return
    }

    try {
      setProcessing(true)
      setError(null)

      // Update database to mark as received
      if (supabase) {
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            escrow_status: 'completed',
            status: 'completed',
            received_at: new Date().toISOString(),
            second_half_released: false // Will be set to true when actual release happens via program
          })
          .eq('id', listing.id)

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`)
        }

        alert(
          'Receipt confirmed!\n\n' +
          'The remaining 50% of escrow funds will be released to the seller.\n\n' +
          'NOTE: Actual fund release requires a Solana escrow program. ' +
          'For MVP, the status is updated but funds will be released when the program is deployed.'
        )
        
        // Refresh the page to show updated status
        window.location.reload()
      }
    } catch (err: any) {
      console.error('Error confirming receipt:', err)
      setError(err.message || 'Failed to confirm receipt')
      alert('Error: ' + (err.message || 'Failed to confirm receipt'))
    } finally {
      setProcessing(false)
    }
  }

  // Seller actions
  if (userRole === 'seller') {
    const canMarkShipped = 
      listing.escrow_status === 'pending' || 
      listing.escrow_status === 'in_escrow' ||
      !listing.escrow_status

    if (!canMarkShipped) {
      return (
        <div className="mt-4 p-4 bg-black/50 border-2 border-[#660099] rounded">
          <p className="text-[#00ff00] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            {listing.escrow_status === 'shipped' && 'Item marked as shipped. Waiting for buyer confirmation...'}
            {listing.escrow_status === 'completed' && 'Transaction completed. Funds released.'}
            {listing.escrow_status === 'disputed' && 'Transaction disputed. Contact support.'}
          </p>
        </div>
      )
    }

    return (
      <div className="mt-4 p-4 bg-black/50 border-2 border-[#660099] rounded">
        <h3 className="text-[#ff00ff] font-pixel text-base mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
          Seller Actions
        </h3>
        <p className="text-[#00ff00] font-pixel-alt text-xs mb-3" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Mark the item as shipped to release 50% of escrow funds. The remaining 50% will be released when the buyer confirms receipt.
        </p>
        {error && (
          <p className="text-red-500 text-xs mb-2">{error}</p>
        )}
        <Button
          onClick={handleMarkShipped}
          disabled={processing}
          className="w-full sm:w-auto px-6 py-3 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt transition-colors min-h-[44px] text-sm disabled:opacity-50"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          {processing ? 'Processing...' : 'Mark as Shipped'}
        </Button>
      </div>
    )
  }

  // Buyer actions
  if (userRole === 'buyer') {
    const canConfirmReceipt = listing.escrow_status === 'shipped'

    if (!canConfirmReceipt) {
      return (
        <div className="mt-4 p-4 bg-black/50 border-2 border-[#660099] rounded">
          <p className="text-[#00ff00] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            {!listing.escrow_status || listing.escrow_status === 'pending' 
              ? 'Waiting for seller to mark item as shipped...'
              : listing.escrow_status === 'completed'
              ? 'Receipt confirmed. Transaction completed.'
              : 'Waiting for seller action...'}
          </p>
        </div>
      )
    }

    return (
      <div className="mt-4 p-4 bg-black/50 border-2 border-[#660099] rounded">
        <h3 className="text-[#ff00ff] font-pixel text-base mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
          Buyer Actions
        </h3>
        <p className="text-[#00ff00] font-pixel-alt text-xs mb-3" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Confirm that you have received and inspected the item. This will release the remaining 50% to the seller.
        </p>
        {error && (
          <p className="text-red-500 text-xs mb-2">{error}</p>
        )}
        <Button
          onClick={handleConfirmReceipt}
          disabled={processing}
          className="w-full sm:w-auto px-6 py-3 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt transition-colors min-h-[44px] text-sm disabled:opacity-50"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          {processing ? 'Processing...' : 'Confirm Receipt'}
        </Button>
      </div>
    )
  }

  return null
}
