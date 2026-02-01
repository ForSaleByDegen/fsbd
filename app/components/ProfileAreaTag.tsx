'use client'

import { useState, useEffect } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'

export default function ProfileAreaTag({
  walletAddress,
  initialValue,
  onSaved,
}: {
  walletAddress: string | null
  initialValue: string | null | undefined
  onSaved?: () => void
}) {
  const [value, setValue] = useState(initialValue ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setValue(initialValue ?? '')
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
          area_tag: value.trim() || null,
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

  const hasChange = (value.trim() || '') !== (initialValue?.trim() || '')

  return (
    <div className="space-y-2">
      <label className="text-[#aa77ee] font-pixel-alt text-sm block" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Area (optional) — e.g. Austin, TX or Greater NYC
      </label>
      <div className="flex flex-wrap gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Where are you based?"
          className="flex-1 min-w-[160px] bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        />
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
