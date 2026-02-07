'use client'

import { useState } from 'react'

type Props = {
  walletAddress: string | null
  onVerified?: () => void
}

export default function ManualVerificationSection({ walletAddress, onVerified }: Props) {
  const [code, setCode] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [listingUrl, setListingUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'idle' | 'code' | 'verify'>('idle')

  const requestCode = async () => {
    if (!walletAddress) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/verify/code/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletAddress }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      setCode(data.code)
      setQrDataUrl(data.qrDataUrl)
      setStep('code')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const submitVerify = async () => {
    if (!walletAddress || !listingUrl.trim()) {
      setError('Enter your listing URL')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/verify/code/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletAddress, listingUrl: listingUrl.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      setStep('idle')
      setCode(null)
      setQrDataUrl(null)
      setListingUrl('')
      onVerified?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  if (!walletAddress) return null

  return (
    <div className="space-y-3 pt-2 border-t border-[#660099]/30">
      <p className="text-xs text-purple-muted font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Add a verification QR to your listing image. Request a code, add the QR to your photo, then submit the listing URL.
      </p>
      {step === 'idle' && (
        <button
          type="button"
          onClick={requestCode}
          disabled={loading}
          className="px-3 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/30 font-pixel-alt text-xs disabled:opacity-50"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          {loading ? 'Requesting...' : 'Request verification code'}
        </button>
      )}
      {step === 'code' && qrDataUrl && code && (
        <div className="space-y-2">
          <div className="flex gap-4 items-start">
            <img src={qrDataUrl} alt="Verification QR" className="w-32 h-32 border-2 border-[#660099] bg-white" />
            <div>
              <p className="text-sm text-[#00ff00] font-pixel-alt font-mono">{code}</p>
              <p className="text-xs text-purple-muted mt-1">
                Download the QR, add it to your listing photo (corner), save & re-upload to your external listing.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <input
              type="url"
              value={listingUrl}
              onChange={(e) => setListingUrl(e.target.value)}
              placeholder="https://ebay.com/... or your listing URL"
              className="flex-1 min-w-[200px] bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-xs p-2"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            />
            <button
              type="button"
              onClick={submitVerify}
              disabled={loading}
              className="px-3 py-2 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20 font-pixel-alt text-xs disabled:opacity-50"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => { setStep('idle'); setCode(null); setQrDataUrl(null); setListingUrl(''); setError(null); }}
            className="text-xs text-purple-readable hover:text-[#ff00ff] font-pixel-alt"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            Start over
          </button>
        </div>
      )}
      {error && <p className="text-red-400 text-xs font-pixel-alt">{error}</p>}
    </div>
  )
}
