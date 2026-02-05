'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { Input } from '../ui/input'

interface VerifySellerFormProps {
  adminWallet: string
}

export default function VerifySellerForm({ adminWallet }: VerifySellerFormProps) {
  const [wallet, setWallet] = useState('')
  const [platform, setPlatform] = useState<'ebay' | 'etsy' | 'amazon' | 'manual'>('ebay')
  const [platformUsername, setPlatformUsername] = useState('')
  const [storeUrl, setStoreUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet.trim()) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/verify-seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminWallet,
          wallet: wallet.trim(),
          platform,
          platform_username: platformUsername.trim() || undefined,
          store_url: storeUrl.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || res.statusText)
      setMessage({ type: 'success', text: `Seller verified for ${platform}` })
      setWallet('')
      setPlatformUsername('')
      setStoreUrl('')
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border-2 border-[#660099] rounded-lg bg-black/30">
      <h3 className="font-pixel text-[#00ff00] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
        Verify seller
      </h3>
      <p className="text-sm text-[#aa77ee] mb-4 font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Add a seller verification so they get the verified badge on listings with external URLs.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <div>
          <label className="block text-xs text-[#aa77ee] mb-1">Wallet address *</label>
          <Input
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="Solana wallet (base58)"
            className="border-[#660099] bg-black/50"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-[#aa77ee] mb-1">Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as typeof platform)}
            className="w-full border-2 border-[#660099] bg-black/50 text-[#00ff00] px-3 py-2 rounded"
          >
            <option value="ebay">eBay</option>
            <option value="etsy">Etsy</option>
            <option value="amazon">Amazon</option>
            <option value="manual">Manual (other)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#aa77ee] mb-1">Platform username (optional)</label>
          <Input
            value={platformUsername}
            onChange={(e) => setPlatformUsername(e.target.value)}
            placeholder="e.g. seller123"
            className="border-[#660099] bg-black/50"
          />
        </div>
        <div>
          <label className="block text-xs text-[#aa77ee] mb-1">Store URL (optional)</label>
          <Input
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="https://..."
            className="border-[#660099] bg-black/50"
          />
        </div>
        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-[#00ff00]' : 'text-amber-400'}`}>
            {message.text}
          </p>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20"
        >
          {loading ? 'Verifying...' : 'Verify seller'}
        </Button>
      </form>
    </div>
  )
}
