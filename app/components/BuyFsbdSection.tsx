'use client'

import { useState, useEffect } from 'react'

const PLACEHOLDER = 'FSBD_TOKEN_MINT_PLACEHOLDER'
const PUMP_FUN_BASE = 'https://pump.fun/coin'

function getMintFromConfig(): string | null {
  if (typeof window === 'undefined') return null
  const env = process.env.NEXT_PUBLIC_FSBD_TOKEN_MINT
  if (env && env !== PLACEHOLDER) return env
  return null
}

export default function BuyFsbdSection({
  variant = 'default',
  mint: mintProp,
}: {
  variant?: 'default' | 'compact' | 'card'
  mint?: string | null
}) {
  const [mint, setMint] = useState<string | null>(mintProp ?? getMintFromConfig())

  useEffect(() => {
    if (mintProp != null) {
      setMint(mintProp)
      return
    }
    if (mint) return
    fetch('/api/config')
      .then((r) => r.json())
      .then((c) => {
        const m = c.fsbd_token_mint
        if (m && m !== PLACEHOLDER) setMint(m)
      })
      .catch(() => {})
  }, [mintProp])

  const [copied, setCopied] = useState(false)
  const copyMint = () => {
    if (!mint) return
    navigator.clipboard.writeText(mint)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!mint || mint === PLACEHOLDER) return null

  const pumpUrl = `${PUMP_FUN_BASE}/${mint}`
  const shortMint = `${mint.slice(0, 4)}...${mint.slice(-4)}`
  const explorerUrl = `https://explorer.solana.com/address/${mint}`

  if (variant === 'compact') {
    return (
      <a
        href={pumpUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-[#00ff00] hover:text-[#660099] font-pixel-alt transition-colors"
        style={{ fontFamily: 'var(--font-pixel-alt)' }}
      >
        Buy $FSBD on pump.fun →
      </a>
    )
  }

  if (variant === 'card') {
    return (
      <div className="p-4 border-2 border-[#660099] bg-black/50 rounded-lg">
        <p className="text-sm font-pixel-alt text-[#aa77ee] mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          $FSBD Contract: <code className="text-[#00ff00]">{shortMint}</code>
          <button
            type="button"
            onClick={copyMint}
            className="ml-2 text-xs text-[#660099] hover:text-[#00ff00] transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </p>
        <a
          href={pumpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt text-sm transition-colors rounded"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          Buy $FSBD on pump.fun →
        </a>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-3 text-xs text-[#660099] hover:text-[#00ff00] transition-colors"
        >
          View on Explorer
        </a>
      </div>
    )
  }

  // default
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
      <a
        href={pumpUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt text-sm transition-colors rounded"
        style={{ fontFamily: 'var(--font-pixel-alt)' }}
      >
        Buy $FSBD on pump.fun →
      </a>
      <span className="text-xs text-[#660099] font-pixel-alt">
        Contract: {shortMint}
        <button
          type="button"
          onClick={copyMint}
          className="ml-1 text-[#00ff00] hover:underline"
        >
          {copied ? 'Copied' : 'copy'}
        </button>
      </span>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[#660099] hover:text-[#00ff00] font-pixel-alt transition-colors"
      >
        Explorer
      </a>
    </div>
  )
}
