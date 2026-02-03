'use client'

import { useState, useEffect } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'

type Socials = {
  banner_url?: string | null
  twitter_url?: string | null
  telegram_url?: string | null
  discord_url?: string | null
  website_url?: string | null
}

export default function ProfileSocialsBanner({
  walletAddress,
  initialValue,
  onSaved,
}: {
  walletAddress: string | null
  initialValue: Socials | null | undefined
  onSaved?: () => void
}) {
  const [banner, setBanner] = useState(initialValue?.banner_url ?? '')
  const [twitter, setTwitter] = useState(initialValue?.twitter_url ?? '')
  const [telegram, setTelegram] = useState(initialValue?.telegram_url ?? '')
  const [discord, setDiscord] = useState(initialValue?.discord_url ?? '')
  const [website, setWebsite] = useState(initialValue?.website_url ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setBanner(initialValue?.banner_url ?? '')
    setTwitter(initialValue?.twitter_url ?? '')
    setTelegram(initialValue?.telegram_url ?? '')
    setDiscord(initialValue?.discord_url ?? '')
    setWebsite(initialValue?.website_url ?? '')
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
          banner_url: banner.trim() || null,
          twitter_url: twitter.trim() || null,
          telegram_url: telegram.trim() || null,
          discord_url: discord.trim() || null,
          website_url: website.trim() || null,
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

  const hasChange =
    (banner.trim() || '') !== (initialValue?.banner_url?.trim() || '') ||
    (twitter.trim() || '') !== (initialValue?.twitter_url?.trim() || '') ||
    (telegram.trim() || '') !== (initialValue?.telegram_url?.trim() || '') ||
    (discord.trim() || '') !== (initialValue?.discord_url?.trim() || '') ||
    (website.trim() || '') !== (initialValue?.website_url?.trim() || '')

  return (
    <div className="space-y-3">
      <h3 className="text-base font-pixel text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel)' }}>
        Socials & banner (optional)
      </h3>
      <p className="text-[#aa77ee] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Shown in token metadata when you launch a token with a listing.
      </p>
      <div className="grid gap-2">
        <div>
          <label className="text-[#aa77ee] font-pixel-alt text-xs block mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Banner image URL
          </label>
          <Input
            value={banner}
            onChange={(e) => setBanner(e.target.value)}
            placeholder="https://... (IPFS or image URL)"
            className="bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          />
        </div>
        <div>
          <label className="text-[#aa77ee] font-pixel-alt text-xs block mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Website
          </label>
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yoursite.com"
            className="bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          />
        </div>
        <div>
          <label className="text-[#aa77ee] font-pixel-alt text-xs block mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Twitter / X
          </label>
          <Input
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="https://x.com/yourhandle"
            className="bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          />
        </div>
        <div>
          <label className="text-[#aa77ee] font-pixel-alt text-xs block mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Telegram
          </label>
          <Input
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="https://t.me/yourhandle"
            className="bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          />
        </div>
        <div>
          <label className="text-[#aa77ee] font-pixel-alt text-xs block mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Discord
          </label>
          <Input
            value={discord}
            onChange={(e) => setDiscord(e.target.value)}
            placeholder="https://discord.gg/..."
            className="bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          />
        </div>
      </div>
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
      {saved && (
        <p className="text-[#00ff00] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Saved
        </p>
      )}
    </div>
  )
}
