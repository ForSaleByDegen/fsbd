'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { supabase } from '@/lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface ManualTrackingFormProps {
  listingId: string
  onTrackingAdded: () => void
}

export default function ManualTrackingForm({ listingId, onTrackingAdded }: ManualTrackingFormProps) {
  const { publicKey } = useWallet()
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('USPS')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!publicKey) {
      setError('Please connect your wallet')
      return
    }

    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Update listing with manual tracking info
      if (supabase) {
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            tracking_number: trackingNumber.trim(),
            shipping_carrier: carrier,
            escrow_status: 'shipped',
            status: 'shipped',
            shipped_at: new Date().toISOString()
          })
          .eq('id', listingId)

        if (updateError) {
          throw new Error(`Failed to save tracking: ${updateError.message}`)
        }

        alert('Tracking information saved! The buyer will be notified.')
        onTrackingAdded()
      }
    } catch (err: any) {
      console.error('Error saving tracking:', err)
      setError(err.message || 'Failed to save tracking information')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-black/50 border-2 border-[#660099] rounded">
      <h3 className="text-[#ff00ff] font-pixel text-base mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
        Add Tracking Information
      </h3>
      <p className="text-[#00ff00] font-pixel-alt text-xs mb-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Enter the tracking number from your shipping carrier. This will notify the buyer and allow them to track their package.
      </p>

      <div>
        <label className="block text-[#00ff00] font-pixel-alt text-xs mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Carrier *
        </label>
        <select
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          className="w-full bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-xs p-2"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          <option value="USPS">USPS</option>
          <option value="UPS">UPS</option>
          <option value="FedEx">FedEx</option>
          <option value="DHL">DHL</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-[#00ff00] font-pixel-alt text-xs mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Tracking Number *
        </label>
        <Input
          type="text"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Enter tracking number"
          required
          className="bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-xs"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        />
      </div>

      {error && (
        <p className="text-red-500 text-xs font-pixel-alt">{error}</p>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          onClick={onTrackingAdded}
          className="flex-1 border-2 border-[#660099] text-[#660099] hover:bg-[#660099] hover:text-black font-pixel-alt text-xs"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          Skip
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt text-xs disabled:opacity-50"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          {loading ? 'Saving...' : 'Save Tracking'}
        </Button>
      </div>

      <p className="text-[#660099] font-pixel-alt text-xs mt-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        💡 Tip: You can add tracking information later if you don't have it yet. Just mark the item as shipped and add tracking when available.
      </p>
    </form>
  )
}
