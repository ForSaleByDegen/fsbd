'use client'

import { useState, useRef, useEffect } from 'react'

interface ShareListingProps {
  listingId: string
  title: string
  price: number | string
  priceToken?: string
}

const SHARE_TEXT_MAX = 200 // Twitter has ~280 chars, leave room for URL

function buildShareText(title: string, price: number | string, priceToken?: string): string {
  const priceStr = `${price} ${priceToken || 'SOL'}`
  const base = `${title} — ${priceStr} on $FSBD`
  return base.length > SHARE_TEXT_MAX ? base.slice(0, SHARE_TEXT_MAX - 3) + '...' : base
}

function getListingUrl(listingId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/listings/${listingId}`
  }
  return `https://fsbd.fun/listings/${listingId}`
}

export default function ShareListing({ listingId, title, price, priceToken }: ShareListingProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const shareText = buildShareText(title, price, priceToken)
  const listingUrl = getListingUrl(listingId)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(listingUrl)
    const encodedText = encodeURIComponent(shareText)

    const urls: Record<string, string> = {
      x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
    }

    const url = urls[platform]
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400')
      setOpen(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${listingUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      setOpen(false)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = `${shareText}\n${listingUrl}`
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      setOpen(false)
    }
  }

  const btnClass = 'w-full text-left px-3 py-2 text-sm font-pixel-alt hover:bg-[#660099]/30 hover:text-[#00ff00] transition-colors flex items-center gap-2'
  const style = { fontFamily: 'var(--font-pixel-alt)' }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-[#660099] text-[#aa77ee] hover:border-[#00ff00] hover:text-[#00ff00] font-pixel-alt text-sm transition-colors"
        style={style}
      >
        Share
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 min-w-[180px] bg-black border-2 border-[#660099] rounded shadow-lg py-1">
          <button
            type="button"
            onClick={() => handleShare('x')}
            className={btnClass}
            style={style}
          >
            X (Twitter)
          </button>
          <button
            type="button"
            onClick={() => handleShare('facebook')}
            className={btnClass}
            style={style}
          >
            Facebook
          </button>
          <button
            type="button"
            onClick={() => handleShare('linkedin')}
            className={btnClass}
            style={style}
          >
            LinkedIn
          </button>
          <button
            type="button"
            onClick={() => handleShare('telegram')}
            className={btnClass}
            style={style}
          >
            Telegram
          </button>
          <button
            type="button"
            onClick={() => handleShare('reddit')}
            className={btnClass}
            style={style}
          >
            Reddit
          </button>
          <hr className="border-[#660099]/50 my-1" />
          <button
            type="button"
            onClick={handleCopy}
            className={btnClass}
            style={style}
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  )
}
