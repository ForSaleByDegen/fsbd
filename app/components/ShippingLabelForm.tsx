'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { supabase } from '@/lib/supabase'
import { createShippingLabel } from '@/lib/shipping-labels'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface ShippingLabelFormProps {
  listingId: string
  buyerAddress?: {
    name?: string
    street1?: string
    city?: string
    state?: string
    zip?: string
  }
  onLabelCreated: (labelData: any) => void
}

export default function ShippingLabelForm({ listingId, buyerAddress, onLabelCreated }: ShippingLabelFormProps) {
  const { publicKey } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Seller address (from profile)
  const [sellerAddress, setSellerAddress] = useState({
    name: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: ''
  })

  // Package details
  const [packageInfo, setPackageInfo] = useState({
    length: '12',
    width: '10',
    height: '8',
    weight: '16' // ounces
  })

  const [service, setService] = useState('Priority')

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!publicKey) {
      setError('Please connect your wallet')
      return
    }

    // Validate seller address
    if (!sellerAddress.name || !sellerAddress.street1 || !sellerAddress.city || !sellerAddress.state || !sellerAddress.zip) {
      setError('Please complete your shipping address')
      return
    }

    // Validate buyer address
    if (!buyerAddress?.name || !buyerAddress?.street1 || !buyerAddress?.city || !buyerAddress?.state || !buyerAddress?.zip) {
      setError('Buyer address is incomplete')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Create shipping label
      const labelData = await createShippingLabel({
        toAddress: {
          name: buyerAddress.name,
          street1: buyerAddress.street1,
          city: buyerAddress.city,
          state: buyerAddress.state,
          zip: buyerAddress.zip,
          country: 'US'
        },
        fromAddress: {
          name: sellerAddress.name,
          street1: sellerAddress.street1,
          street2: sellerAddress.street2 || undefined,
          city: sellerAddress.city,
          state: sellerAddress.state,
          zip: sellerAddress.zip,
          country: 'US',
          phone: sellerAddress.phone || undefined,
          email: sellerAddress.email || undefined
        },
        parcel: {
          length: parseFloat(packageInfo.length),
          width: parseFloat(packageInfo.width),
          height: parseFloat(packageInfo.height),
          weight: parseFloat(packageInfo.weight)
        },
        service: service
      })

      // Update listing with shipping label info
      if (supabase) {
        await supabase
          .from('listings')
          .update({
            shipping_label_id: labelData.id,
            tracking_number: labelData.tracking_code,
            shipping_carrier: labelData.carrier
          })
          .eq('id', listingId)
      }

      onLabelCreated(labelData)
    } catch (err: any) {
      console.error('Error creating shipping label:', err)
      setError(err.message || 'Failed to create shipping label')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleCreateLabel} className="space-y-4 p-4 bg-black/50 border-2 border-[#660099] rounded">
      <h3 className="text-[#ff00ff] font-pixel text-base mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
        Create Shipping Label
      </h3>

      {/* Seller Address */}
      <div>
        <h4 className="text-[#00ff00] font-pixel-alt text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Your Address (From)
        </h4>
        <div className="space-y-2">
          <Input
            placeholder="Full Name"
            value={sellerAddress.name}
            onChange={(e) => setSellerAddress(prev => ({ ...prev, name: e.target.value }))}
            required
            className="bg-black border border-[#660099] text-[#00ff00] text-xs"
          />
          <Input
            placeholder="Street Address"
            value={sellerAddress.street1}
            onChange={(e) => setSellerAddress(prev => ({ ...prev, street1: e.target.value }))}
            required
            className="bg-black border border-[#660099] text-[#00ff00] text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="City"
              value={sellerAddress.city}
              onChange={(e) => setSellerAddress(prev => ({ ...prev, city: e.target.value }))}
              required
              className="bg-black border border-[#660099] text-[#00ff00] text-xs"
            />
            <Input
              placeholder="State"
              value={sellerAddress.state}
              onChange={(e) => setSellerAddress(prev => ({ ...prev, state: e.target.value }))}
              required
              maxLength={2}
              className="bg-black border border-[#660099] text-[#00ff00] text-xs"
            />
          </div>
          <Input
            placeholder="ZIP Code"
            value={sellerAddress.zip}
            onChange={(e) => setSellerAddress(prev => ({ ...prev, zip: e.target.value }))}
            required
            className="bg-black border border-[#660099] text-[#00ff00] text-xs"
          />
        </div>
      </div>

      {/* Package Details */}
      <div>
        <h4 className="text-[#00ff00] font-pixel-alt text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Package Details
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Length (in)"
            value={packageInfo.length}
            onChange={(e) => setPackageInfo(prev => ({ ...prev, length: e.target.value }))}
            required
            className="bg-black border border-[#660099] text-[#00ff00] text-xs"
          />
          <Input
            type="number"
            placeholder="Width (in)"
            value={packageInfo.width}
            onChange={(e) => setPackageInfo(prev => ({ ...prev, width: e.target.value }))}
            required
            className="bg-black border border-[#660099] text-[#00ff00] text-xs"
          />
          <Input
            type="number"
            placeholder="Height (in)"
            value={packageInfo.height}
            onChange={(e) => setPackageInfo(prev => ({ ...prev, height: e.target.value }))}
            required
            className="bg-black border border-[#660099] text-[#00ff00] text-xs"
          />
          <Input
            type="number"
            placeholder="Weight (oz)"
            value={packageInfo.weight}
            onChange={(e) => setPackageInfo(prev => ({ ...prev, weight: e.target.value }))}
            required
            className="bg-black border border-[#660099] text-[#00ff00] text-xs"
          />
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-xs font-pixel-alt">{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt text-sm disabled:opacity-50"
        style={{ fontFamily: 'var(--font-pixel-alt)' }}
      >
        {loading ? 'Creating Label...' : 'Create Shipping Label'}
      </Button>
    </form>
  )
}
