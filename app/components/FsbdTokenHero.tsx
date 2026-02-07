'use client'

import { useState, useEffect } from 'react'
import Script from 'next/script'

const PLACEHOLDER = 'FSBD_TOKEN_MINT_PLACEHOLDER'
const PUMP_FUN_BASE = 'https://pump.fun/coin'
const DEXSCREENER_BASE = 'https://dexscreener.com/solana'
const BIRDEYE_BASE = 'https://birdeye.so/token'
const JUPITER_BASE = 'https://jup.ag/swap/SOL'
const COINGECKO_REQUEST = 'https://www.coingecko.com/request-form?locale=en'
const COINMARKETCAP_REQUEST = 'https://coinmarketcap.com/request/'
const HACKATHON_TWEET_URL = 'https://x.com/Pumpfun/status/2013386533626163589'

function getMintFromConfig(): string | null {
  if (typeof window === 'undefined') return null
  const env = process.env.NEXT_PUBLIC_FSBD_TOKEN_MINT
  if (env && env !== PLACEHOLDER) return env
  return null
}

export default function FsbdTokenHero() {
  const [mint, setMint] = useState<string | null>(getMintFromConfig())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (mint) return
    fetch('/api/config')
      .then((r) => r.json())
      .then((c) => {
        const m = c.fsbd_token_mint
        if (m && m !== PLACEHOLDER) setMint(m)
      })
      .catch(() => {})
  }, [mint])

  const copyFullCa = () => {
    if (!mint) return
    navigator.clipboard.writeText(mint)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!mint || mint === PLACEHOLDER) return null

  const pumpUrl = `${PUMP_FUN_BASE}/${mint}`
  const dexscreenerUrl = `${DEXSCREENER_BASE}/${mint}`
  const birdeyeUrl = `${BIRDEYE_BASE}/${mint}?chain=solana`
  const jupiterUrl = `${JUPITER_BASE}-${mint}`

  return (
    <section className="mb-8 sm:mb-10 p-4 sm:p-6 border-2 sm:border-4 border-[#660099] bg-black/50 rounded-lg">
      <h2 className="font-pixel text-xl sm:text-2xl text-[#00ff00] mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
        $FSBD Token
      </h2>

      {/* Full CA - copyable */}
      <div className="mb-4">
        <p className="text-xs text-purple-muted font-pixel-alt mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Contract Address (CA)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-sm sm:text-base text-[#00ff00] font-mono break-all bg-black/50 px-2 py-1 rounded" style={{ fontFamily: 'monospace' }}>
            {mint}
          </code>
          <button
            type="button"
            onClick={copyFullCa}
            className="px-3 py-1.5 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt text-sm transition-colors rounded"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* DEX links */}
      <div className="mb-4">
        <p className="text-xs text-purple-muted font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          DEX & Chart
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={pumpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex px-3 py-1.5 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt text-sm transition-colors rounded"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            pump.fun
          </a>
          <a
            href={dexscreenerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex px-3 py-1.5 border-2 border-[#660099] text-purple-muted hover:bg-[#660099] hover:text-black font-pixel-alt text-sm transition-colors rounded"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            DexScreener
          </a>
          <a
            href={birdeyeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex px-3 py-1.5 border-2 border-[#660099] text-purple-muted hover:bg-[#660099] hover:text-black font-pixel-alt text-sm transition-colors rounded"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            Birdeye
          </a>
          <a
            href={jupiterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex px-3 py-1.5 border-2 border-[#660099] text-purple-muted hover:bg-[#660099] hover:text-black font-pixel-alt text-sm transition-colors rounded"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            Jupiter
          </a>
        </div>
      </div>

      {/* Verification links */}
      <div className="mb-4">
        <p className="text-xs text-purple-muted font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Verify / List
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={COINGECKO_REQUEST}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#00ff00] hover:text-purple-readable font-pixel-alt underline transition-colors"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            CoinGecko Request
          </a>
          <a
            href={COINMARKETCAP_REQUEST}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#00ff00] hover:text-purple-readable font-pixel-alt underline transition-colors"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            CoinMarketCap Request
          </a>
        </div>
      </div>

      {/* Hackathon tweet */}
      <div className="mt-6 pt-4 border-t border-[#660099]/50">
        <p className="text-xs text-purple-muted font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          pump.fun Hackathon
        </p>
        <a
          href={HACKATHON_TWEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#00ff00] hover:text-purple-readable font-pixel-alt underline mb-3 block"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          View pump.fun hackathon tweet →
        </a>
        <div className="flex justify-center">
          <blockquote
            className="twitter-tweet"
            data-dnt="true"
            data-theme="dark"
          >
            <a href={HACKATHON_TWEET_URL}>pump.fun Hackathon</a>
          </blockquote>
        </div>
      </div>
      <Script
        src="https://platform.twitter.com/widgets.js"
        strategy="lazyOnload"
      />
    </section>
  )
}
