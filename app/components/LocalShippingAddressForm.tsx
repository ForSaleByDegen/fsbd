'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  hasStoredAddress,
  saveEncrypted,
  removeStoredAddress,
  type AddressPayload,
} from '@/lib/local-shipping-address'

const SIGN_MESSAGE = 'FSBD shipping address key'

export default function LocalShippingAddressForm() {
  const { publicKey, signMessage } = useWallet()
  const [saved, setSaved] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [method, setMethod] = useState<'pin' | 'signature'>('pin')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [address, setAddress] = useState<AddressPayload>({
    name: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wallet = publicKey?.toString() ?? ''

  useEffect(() => {
    setSaved(hasStoredAddress(wallet))
    if (!hasStoredAddress(wallet)) setShowForm(true)
  }, [wallet])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!wallet) {
      setError('Connect your wallet')
      return
    }
    if (!address.name?.trim() || !address.street1?.trim() || !address.city?.trim() || !address.state?.trim() || !address.zip?.trim()) {
      setError('Fill in name, street, city, state, and zip')
      return
    }
    if (method === 'pin') {
      if (pin.length < 4 || pin.length > 8) {
        setError('PIN must be 4–8 digits')
        return
      }
      if (pin !== pinConfirm) {
        setError('PINs do not match')
        return
      }
    }

    setLoading(true)
    try {
      const payload: AddressPayload = {
        name: address.name.trim(),
        street1: address.street1.trim(),
        street2: address.street2?.trim() || undefined,
        city: address.city.trim(),
        state: address.state.trim(),
        zip: address.zip.trim(),
      }

      if (method === 'pin') {
        const ok = await saveEncrypted(wallet, 'pin', payload, { type: 'pin', pin })
        if (!ok) throw new Error('Failed to save')
      } else {
        if (!signMessage) throw new Error('Wallet sign not available')
        const ok = await saveEncrypted(wallet, 'signature', payload, {
          type: 'signature',
          signMessage: (m) => signMessage(m),
        })
        if (!ok) throw new Error('Failed to save')
      }
      setSaved(true)
      setShowForm(false)
      setPin('')
      setPinConfirm('')
      setAddress({ name: '', street1: '', street2: '', city: '', state: '', zip: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = () => {
    if (!wallet) return
    if (!confirm('Remove saved address from this device?')) return
    removeStoredAddress(wallet)
    setSaved(false)
    setShowForm(true)
    setAddress({ name: '', street1: '', street2: '', city: '', state: '', zip: '' })
  }

  if (!wallet) return null

  return (
    <div className="p-4 bg-black/50 border-2 border-[#660099] rounded max-w-xl space-y-4">
      <p className="text-[#aa77ee] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Save your address on this device (encrypted). Use it when buying to auto-fill in chat. Stored only here—clearing site data removes it.
      </p>

      {saved && !showForm ? (
        <div className="space-y-2">
          <p className="text-[#00ff00] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Address saved on this device (encrypted)
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setShowForm(true)}
              variant="outline"
              className="border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/30 text-sm"
            >
              Change
            </Button>
            <Button
              type="button"
              onClick={handleRemove}
              variant="outline"
              className="border-2 border-red-500 text-red-400 hover:bg-red-500/20 text-sm"
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs text-[#00ff00] font-pixel-alt mb-1">Name *</label>
            <Input
              value={address.name}
              onChange={(e) => setAddress((a) => ({ ...a, name: e.target.value }))}
              className="bg-black border-2 border-[#660099] text-[#00ff00]"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-xs text-[#00ff00] font-pixel-alt mb-1">Street *</label>
            <Input
              value={address.street1}
              onChange={(e) => setAddress((a) => ({ ...a, street1: e.target.value }))}
              className="bg-black border-2 border-[#660099] text-[#00ff00]"
              placeholder="123 Main St"
            />
          </div>
          <div>
            <label className="block text-xs text-[#00ff00] font-pixel-alt mb-1">Apt / Suite (optional)</label>
            <Input
              value={address.street2 ?? ''}
              onChange={(e) => setAddress((a) => ({ ...a, street2: e.target.value || undefined }))}
              className="bg-black border-2 border-[#660099] text-[#00ff00]"
              placeholder="Apt 4"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[#00ff00] font-pixel-alt mb-1">City *</label>
              <Input
                value={address.city}
                onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                className="bg-black border-2 border-[#660099] text-[#00ff00]"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-xs text-[#00ff00] font-pixel-alt mb-1">State *</label>
              <Input
                value={address.state}
                onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                className="bg-black border-2 border-[#660099] text-[#00ff00]"
                placeholder="ST"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#00ff00] font-pixel-alt mb-1">ZIP *</label>
            <Input
              value={address.zip}
              onChange={(e) => setAddress((a) => ({ ...a, zip: e.target.value }))}
              className="bg-black border-2 border-[#660099] text-[#00ff00]"
              placeholder="12345"
            />
          </div>

          <div>
            <span className="block text-xs text-[#00ff00] font-pixel-alt mb-2">Lock with</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="method"
                  checked={method === 'pin'}
                  onChange={() => setMethod('pin')}
                  className="accent-[#00ff00]"
                />
                <span className="text-sm text-[#aa77ee] font-pixel-alt">PIN (4–8 digits)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="method"
                  checked={method === 'signature'}
                  onChange={() => setMethod('signature')}
                  className="accent-[#00ff00]"
                />
                <span className="text-sm text-[#aa77ee] font-pixel-alt">Wallet signature</span>
              </label>
            </div>
          </div>

          {method === 'pin' && (
            <>
              <div>
                <label className="block text-xs text-[#00ff00] font-pixel-alt mb-1">PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="bg-black border-2 border-[#660099] text-[#00ff00]"
                  placeholder="4–8 digits"
                />
              </div>
              <div>
                <label className="block text-xs text-[#00ff00] font-pixel-alt mb-1">Confirm PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                  className="bg-black border-2 border-[#660099] text-[#00ff00]"
                  placeholder="Repeat PIN"
                />
              </div>
            </>
          )}

          {error && <p className="text-red-400 text-sm font-pixel-alt">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt"
          >
            {loading ? 'Saving...' : method === 'signature' ? 'Sign & Save' : 'Save'}
          </Button>
          {saved && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              className="ml-2 border-2 border-[#660099] text-[#660099]"
            >
              Cancel
            </Button>
          )}
        </form>
      )}
    </div>
  )
}
