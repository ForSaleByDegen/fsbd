'use client'

import { useState, useEffect } from 'react'

export type AddressType = 'general_delivery' | 'po_box' | 'home'

export interface ShippingAddress {
  type: AddressType
  name: string
  street1?: string
  street2?: string
  city: string
  state: string
  zip: string
}

interface ShippingAddressFormProps {
  initialAddress?: Partial<ShippingAddress> | null
  onSave: (address: ShippingAddress) => Promise<void>
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
]

export default function ShippingAddressForm({ initialAddress, onSave }: ShippingAddressFormProps) {
  const [type, setType] = useState<AddressType>(initialAddress?.type || 'general_delivery')
  const [name, setName] = useState(initialAddress?.name || '')
  const [street1, setStreet1] = useState(initialAddress?.street1 || '')
  const [street2, setStreet2] = useState(initialAddress?.street2 || '')
  const [city, setCity] = useState(initialAddress?.city || '')
  const [state, setState] = useState(initialAddress?.state || '')
  const [zip, setZip] = useState(initialAddress?.zip || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialAddress) {
      setType((initialAddress.type as AddressType) || 'general_delivery')
      setName(initialAddress.name || '')
      setStreet1(initialAddress.street1 || '')
      setStreet2(initialAddress.street2 || '')
      setCity(initialAddress.city || '')
      setState(initialAddress.state || '')
      setZip(initialAddress.zip || '')
    }
  }, [initialAddress])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      setError('Name, city, state, and ZIP are required')
      return
    }
    if (type === 'po_box' && !street1.trim()) {
      setError('Enter your PO Box number (e.g. PO Box 123)')
      return
    }
    if (type === 'home' && !street1.trim()) {
      setError('Street address is required')
      return
    }
    setLoading(true)
    try {
      const addr: ShippingAddress = {
        type,
        name: name.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase().slice(0, 2),
        zip: zip.trim().slice(0, 10),
      }
      if (type === 'general_delivery') {
        addr.street1 = 'GENERAL DELIVERY'
      } else {
        addr.street1 = street1.trim()
        if (street2.trim()) addr.street2 = street2.trim()
      }
      await onSave(addr)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-[#00ff00] font-pixel-alt text-xs mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Choose delivery type
        </p>
        <div className="space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="addrType"
              value="general_delivery"
              checked={type === 'general_delivery'}
              onChange={() => setType('general_delivery')}
              className="mt-1"
            />
            <div>
              <span className="text-[#00ff00] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                General Delivery (free, pick up at post office)
              </span>
              <p className="text-[#660099] font-pixel-alt text-xs mt-0.5" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Seller ships to post office. You pick up with ID. Keeps your home address private.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="addrType"
              value="po_box"
              checked={type === 'po_box'}
              onChange={() => setType('po_box')}
              className="mt-1"
            />
            <div>
              <span className="text-[#00ff00] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                PO Box
              </span>
              <p className="text-[#660099] font-pixel-alt text-xs mt-0.5" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Rent from USPS. Privacy + secure pickup. <a href="https://poboxes.usps.com/findBox.html" target="_blank" rel="noopener noreferrer" className="text-[#ff00ff] underline">Find a PO Box →</a>
              </p>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="addrType"
              value="home"
              checked={type === 'home'}
              onChange={() => setType('home')}
              className="mt-1"
            />
            <div>
              <span className="text-[#00ff00] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Home address
              </span>
              <p className="text-[#660099] font-pixel-alt text-xs mt-0.5" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Standard delivery. Seller will see your address.
              </p>
            </div>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-[#00ff00] font-pixel-alt text-xs mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>Full name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="As it appears on your ID"
          required
          className="w-full bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm p-2"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        />
      </div>

      {type === 'general_delivery' && (
        <div className="p-3 bg-[#660099]/20 border border-[#660099] rounded">
          <p className="text-[#00ff00] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Use the post office where you&apos;ll pick up. Not all offer General Delivery. <a href="https://tools.usps.com/locations/" target="_blank" rel="noopener noreferrer" className="text-[#ff00ff] underline">Find post offices →</a>
          </p>
        </div>
      )}

      {type === 'po_box' && (
        <div>
          <label className="block text-[#00ff00] font-pixel-alt text-xs mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>PO Box address *</label>
          <input
            type="text"
            value={street1}
            onChange={(e) => setStreet1(e.target.value)}
            placeholder="e.g. PO Box 123"
            required
            className="w-full bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm p-2"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          />
        </div>
      )}

      {type === 'home' && (
        <div>
          <label className="block text-[#00ff00] font-pixel-alt text-xs mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>Street address *</label>
          <input
            type="text"
            value={street1}
            onChange={(e) => setStreet1(e.target.value)}
            placeholder="Street address"
            required
            className="w-full bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm p-2 mb-2"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          />
          <input
            type="text"
            value={street2}
            onChange={(e) => setStreet2(e.target.value)}
            placeholder="Apt, unit, etc. (optional)"
            className="w-full bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm p-2"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[#00ff00] font-pixel-alt text-xs mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>City *</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            className="w-full bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm p-2"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          />
        </div>
        <div>
          <label className="block text-[#00ff00] font-pixel-alt text-xs mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>State *</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
            className="w-full bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm p-2"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            <option value="">Select</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[#00ff00] font-pixel-alt text-xs mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>ZIP code *</label>
        <input
          type="text"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="12345"
          required
          maxLength={10}
          className="w-full bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm p-2"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        />
      </div>

      {error && <p className="text-red-500 text-xs font-pixel-alt">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt text-sm disabled:opacity-50"
        style={{ fontFamily: 'var(--font-pixel-alt)' }}
      >
        {loading ? 'Saving...' : 'Save delivery address'}
      </button>
    </form>
  )
}
