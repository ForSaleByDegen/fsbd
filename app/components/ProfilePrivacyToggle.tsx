'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'

export default function ProfilePrivacyToggle({
  walletAddress,
  initialValue,
  onSaved,
}: {
  walletAddress: string | null
  initialValue: boolean | null | undefined
  onSaved?: () => void
}) {
  const [value, setValue] = useState(Boolean(initialValue))
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setValue(Boolean(initialValue))
  }, [initialValue])

  const handleSave = async () => {
    if (!walletAddress) return
    setLoading(true)
    setSaved(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          profile_private: value,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSaved(true)
      onSaved?.()
    } catch {
      setSaved(false)
    } finally {
      setLoading(false)
    }
  }

  const hasChange = value !== Boolean(initialValue)

  return (
    <div className="space-y-2">
      <label className="text-[#aa77ee] font-pixel-alt text-sm block" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Profile privacy
      </label>
      <p className="text-[#660099] font-pixel-alt text-xs mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        When private: your listings and connected listings are hidden from your public seller profile. Your stats (reviews, listing count, sold, bought, shipped, received) remain visible.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setValue(!value)}
          className={`px-3 py-2 border-2 font-pixel-alt text-sm transition-colors ${value ? 'border-amber-500 text-amber-400 bg-amber-950/30' : 'border-[#660099] text-[#00ff00] bg-black/50'}`}
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          {value ? 'Private (listings hidden)' : 'Public'}
        </button>
        {hasChange && (
          <Button
            onClick={handleSave}
            disabled={loading}
            className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>
      {saved && (
        <p className="text-[#00ff00] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Saved
        </p>
      )}
    </div>
  )
}
