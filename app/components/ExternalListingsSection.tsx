'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

const AREAS = [
  { value: 'austin', label: 'Austin, TX' },
  { value: 'sfbay', label: 'San Francisco Bay Area' },
  { value: 'newyork', label: 'New York' },
  { value: 'losangeles', label: 'Los Angeles' },
  { value: 'chicago', label: 'Chicago' },
  { value: 'seattle', label: 'Seattle' },
  { value: 'dallas', label: 'Dallas' },
  { value: 'houston', label: 'Houston' },
  { value: 'phoenix', label: 'Phoenix' },
  { value: 'sandiego', label: 'San Diego' },
  { value: 'boston', label: 'Boston' },
  { value: 'denver', label: 'Denver' },
  { value: 'miami', label: 'Miami' },
]

interface ExternalItem {
  title: string
  link: string
  description?: string
}

export default function ExternalListingsSection() {
  const [area, setArea] = useState<string>('')
  const [items, setItems] = useState<ExternalItem[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!area) {
      setItems([])
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(`/api/external-listings?area=${encodeURIComponent(area)}&limit=8`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.items) setItems(data.items)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [area])

  return (
    <div className="mt-8 mb-6 p-4 bg-black/50 border-2 border-[#660099] rounded">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-center justify-between"
      >
        <span className="text-[#ff00ff] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Nearby from the web
        </span>
        <span className="text-purple-readable text-xs">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#660099]/50">
          <p className="text-sm text-purple-muted font-pixel-alt mb-3" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Listings from external classifieds in your area. Not affiliated. Prices in local currency. Links open in a new tab.
          </p>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="w-full sm:w-[220px] mb-4 bg-black border-2 border-[#660099] text-[#00ff00]">
              <SelectValue placeholder="Select area" />
            </SelectTrigger>
            <SelectContent>
              {AREAS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loading && (
            <p className="text-xs text-purple-readable">Loading...</p>
          )}
          {!loading && items.length > 0 && (
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li key={i}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#00ff00] hover:text-[#ff00ff] font-pixel-alt block truncate max-w-full"
                    style={{ fontFamily: 'var(--font-pixel-alt)' }}
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
