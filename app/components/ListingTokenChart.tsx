'use client'

import { useState } from 'react'

const BIRDEYE_WIDGET_BASE = 'https://birdeye.so/tv-widget'
const PUMP_FUN_BASE = 'https://pump.fun/coin'
const DEXSCREENER_BASE = 'https://dexscreener.com/solana'
const BIRDEYE_TOKEN_BASE = 'https://birdeye.so/token'

interface ListingTokenChartProps {
  tokenMint: string
  tokenName?: string | null
  tokenSymbol?: string | null
}

export default function ListingTokenChart({ tokenMint, tokenName, tokenSymbol }: ListingTokenChartProps) {
  const [copied, setCopied] = useState(false)
  const shortMint = `${tokenMint.slice(0, 4)}...${tokenMint.slice(-4)}`

  const copyMint = () => {
    navigator.clipboard.writeText(tokenMint)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const chartSrc = `${BIRDEYE_WIDGET_BASE}/${tokenMint}?chain=solana&viewMode=pair&chartInterval=1D&chartType=CANDLE&chartLeftToolbar=show&theme=dark`

  return (
    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-[#660099]/20 border-2 border-[#660099] rounded">
      <h3 className="font-pixel text-[#ff00ff] mb-2 text-base sm:text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>
        🪙 Listing Token
      </h3>
      {(tokenName || tokenSymbol) && (
        <p className="text-sm text-[#00ff00] font-pixel-alt mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {tokenSymbol ? `$${tokenSymbol}` : ''} {tokenName || ''}
        </p>
      )}
      <p className="text-xs sm:text-sm text-[#aa77ee] font-pixel-alt mb-3 break-all" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Contract: <code className="text-[#00ff00]">{shortMint}</code>
        <button
          type="button"
          onClick={copyMint}
          className="ml-2 text-[#660099] hover:text-[#00ff00] transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </p>

      <div className="flex flex-wrap gap-2 sm:gap-3 mb-3">
        <a
          href={`${PUMP_FUN_BASE}/${tokenMint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs sm:text-sm text-[#00ff00] hover:text-[#660099] font-pixel-alt underline transition-colors"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          Buy on pump.fun
        </a>
        <a
          href={`${DEXSCREENER_BASE}/${tokenMint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs sm:text-sm text-[#00ff00] hover:text-[#660099] font-pixel-alt underline transition-colors"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          DexScreener
        </a>
        <a
          href={`${BIRDEYE_TOKEN_BASE}/${tokenMint}?chain=solana`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs sm:text-sm text-[#00ff00] hover:text-[#660099] font-pixel-alt underline transition-colors"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          Birdeye
        </a>
      </div>

      <div className="rounded overflow-hidden border border-[#660099]/50 bg-black/50">
        <iframe
          title={`${tokenSymbol || 'Token'} chart`}
          src={chartSrc}
          width="100%"
          height="400"
          frameBorder="0"
          allowFullScreen
          className="min-h-[300px] sm:min-h-[400px]"
        />
      </div>
    </div>
  )
}
