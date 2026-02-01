'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

const PLACEHOLDER = 'FSBD_TOKEN_MINT_PLACEHOLDER'
const PUMP_FUN_BASE = 'https://pump.fun/coin'
const DEXSCREENER_BASE = 'https://dexscreener.com/solana'
const BIRDEYE_BASE = 'https://birdeye.so/token'
const JUPITER_BASE = 'https://jup.ag/swap/SOL'
const RAYDIUM_BASE = 'https://raydium.io/swap'
const COINGECKO_REQUEST = 'https://www.coingecko.com/request-form?locale=en'
const COINMARKETCAP_REQUEST = 'https://coinmarketcap.com/request/'
const HACKATHON_TWEET_URL = 'https://x.com/Pumpfun/status/2013386533626163589'

function getMintFromConfig(): string | null {
  if (typeof window === 'undefined') return null
  const env = process.env.NEXT_PUBLIC_FSBD_TOKEN_MINT
  if (env && env !== PLACEHOLDER) return env
  return null
}

const LINK_STYLE = 'inline-flex items-center px-2 sm:px-3 py-1.5 border-2 border-[#660099] text-[#aa77ee] hover:border-[#00ff00] hover:text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-xs sm:text-sm transition-colors rounded'
const LINK_STYLE_PRIMARY = 'inline-flex items-center px-2 sm:px-3 py-1.5 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt text-xs sm:text-sm transition-colors rounded'

export default function AsciiLogo() {
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

  const copyCa = () => {
    if (!mint) return
    navigator.clipboard.writeText(mint)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const twitterUrl = process.env.NEXT_PUBLIC_TWITTER_URL || process.env.NEXT_PUBLIC_X_URL || ''
  const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL || ''
  const telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_URL || ''

  return (
    <div className="pixel-logo-container w-full max-w-4xl mx-auto my-4 sm:my-6 md:my-8 px-2 sm:px-4">
      <h1 className="pixel-title text-center mb-4 sm:mb-6 px-2">
        <span className="laser-eyes text-base sm:text-lg md:text-xl lg:text-2xl" style={{ fontFamily: 'var(--font-pixel)' }}>
          FOR SALE BY DEGEN
        </span>
      </h1>

      <div className="pixel-box bg-black border-2 sm:border-4 border-[#660099] p-3 sm:p-4 md:p-6 lg:p-8 relative w-full overflow-hidden">
        <div
          className="absolute inset-0 border-2 border-[#00ff00] opacity-30 pointer-events-none"
          style={{
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
            imageRendering: 'pixelated',
          }}
        />

        <div className="relative z-10 text-center">
          {/* Branding */}
          <div className="mb-4 sm:mb-6">
            <div className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-pixel text-[#00ff00] mb-1 sm:mb-2 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
              $FSBD
            </div>
            <div className="text-sm sm:text-base md:text-lg text-[#660099] font-pixel-alt break-words" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              fsbd.fun
            </div>
          </div>

          {/* Contract Address + DEX/Social Links */}
          {mint && mint !== PLACEHOLDER ? (
            <div className="space-y-4">
              {/* CA - copyable */}
              <div>
                <p className="text-[10px] sm:text-xs text-[#aa77ee] font-pixel-alt mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Contract Address
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <code className="text-[10px] sm:text-xs text-[#00ff00] font-mono break-all bg-black/50 px-2 py-1 rounded max-w-full" style={{ fontFamily: 'monospace' }}>
                    {mint}
                  </code>
                  <button
                    type="button"
                    onClick={copyCa}
                    className={`px-2 py-1 border-2 font-pixel-alt text-xs transition-colors rounded ${copied ? 'border-[#00ff00] text-[#00ff00]' : 'border-[#660099] text-[#aa77ee] hover:border-[#00ff00] hover:text-[#00ff00]'}`}
                    style={{ fontFamily: 'var(--font-pixel-alt)' }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* DEX links */}
              <div>
                <p className="text-[10px] sm:text-xs text-[#aa77ee] font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  DEX & Charts
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                  <a href={`${PUMP_FUN_BASE}/${mint}`} target="_blank" rel="noopener noreferrer" className={LINK_STYLE_PRIMARY} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                    pump.fun
                  </a>
                  <a href={`${DEXSCREENER_BASE}/${mint}`} target="_blank" rel="noopener noreferrer" className={LINK_STYLE} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                    DexScreener
                  </a>
                  <a href={`${BIRDEYE_BASE}/${mint}?chain=solana`} target="_blank" rel="noopener noreferrer" className={LINK_STYLE} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                    Birdeye
                  </a>
                  <a href={`${JUPITER_BASE}-${mint}`} target="_blank" rel="noopener noreferrer" className={LINK_STYLE} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                    Jupiter
                  </a>
                  <a href={`${RAYDIUM_BASE}/?inputMint=sol&outputMint=${mint}`} target="_blank" rel="noopener noreferrer" className={LINK_STYLE} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                    Raydium
                  </a>
                </div>
              </div>

              {/* Verify / List */}
              <div>
                <p className="text-[10px] sm:text-xs text-[#aa77ee] font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Verify & List
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                  <a href={COINGECKO_REQUEST} target="_blank" rel="noopener noreferrer" className={LINK_STYLE} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                    CoinGecko
                  </a>
                  <a href={COINMARKETCAP_REQUEST} target="_blank" rel="noopener noreferrer" className={LINK_STYLE} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                    CoinMarketCap
                  </a>
                </div>
              </div>

              {/* Socials */}
              {(twitterUrl || discordUrl || telegramUrl) && (
                <div>
                  <p className="text-[10px] sm:text-xs text-[#aa77ee] font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                    Socials
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                    {twitterUrl && (
                      <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className={LINK_STYLE} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                        X
                      </a>
                    )}
                    {discordUrl && (
                      <a href={discordUrl} target="_blank" rel="noopener noreferrer" className={LINK_STYLE} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                        Discord
                      </a>
                    )}
                    {telegramUrl && (
                      <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={LINK_STYLE} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                        Telegram
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Hackathon */}
              <div className="pt-2 border-t border-[#660099]/50">
                <a
                  href={HACKATHON_TWEET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#00ff00] hover:text-[#660099] font-pixel-alt underline transition-colors"
                  style={{ fontFamily: 'var(--font-pixel-alt)' }}
                >
                  pump.fun Hackathon →
                </a>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#660099] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              <p className="mb-2">Configure $FSBD token mint in Admin to display CA and links.</p>
              <Link href="/why" className="text-[#00ff00] hover:underline">
                Why $FSBD
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
