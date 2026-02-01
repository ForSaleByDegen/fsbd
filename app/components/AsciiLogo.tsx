'use client'

import React from 'react'
import Link from 'next/link'
import { CATEGORIES, getSubcategories } from '@/lib/categories'

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'for-sale': 'Electronics, furniture, vehicles, collectibles & more',
  services: 'Repair, cleaning, tutoring, design & professional services',
  gigs: 'Creative, tech, writing & freelance gigs',
  housing: 'Apartments, rooms, sublets & rentals',
  community: 'Events, activities & local community',
  jobs: 'Full-time, part-time & contract positions',
}

const TOKEN_HINTS: Record<string, string> = {
  SOL: 'Solana native token — accepted for payments',
  'SHIT PEPE': 'Solana memecoin',
  'FLORK BOMB': 'Solana memecoin',
  'BOME POPCAT': 'Solana memecoin',
  MER: 'Solana memecoin',
  OL: 'Solana token',
  ESOL: 'Wrapped SOL variant',
  MEL: 'Solana token',
  WFE: 'Solana token',
  'BOME PORCAT': 'Solana memecoin',
}

const DISPLAY_CATEGORIES = ['for-sale', 'community', 'housing', 'jobs'] as const

const AsciiLogo = () => {
  return (
    <div className="pixel-logo-container w-full max-w-4xl mx-auto my-4 sm:my-6 md:my-8 px-2 sm:px-4">
      <h1 className="pixel-title text-center mb-4 sm:mb-6 px-2">
        <span className="laser-eyes text-base sm:text-lg md:text-xl lg:text-2xl">FOR SALE BY DEGEN</span>
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
          <div className="mb-4 sm:mb-6">
            <div className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-pixel text-[#00ff00] mb-1 sm:mb-2 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
              $FSBD
            </div>
            <div className="text-sm sm:text-base md:text-lg lg:text-xl text-[#660099] font-pixel-alt break-words">
              fsbd.fun
            </div>
          </div>

          {/* Categories - clickable with hover tooltips */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
            {DISPLAY_CATEGORIES.map((catValue) => {
              const label = CATEGORIES.find((c) => c.value === catValue)?.label ?? catValue.replace('-', ' ')
              const subs = getSubcategories(catValue)
              const desc = CATEGORY_DESCRIPTIONS[catValue] ?? ''
              return (
                <Link
                  key={catValue}
                  href={`/?category=${catValue}`}
                  className="group relative pixel-category border-2 border-[#660099] bg-black/50 p-2 sm:p-3 text-[10px] sm:text-xs md:text-sm text-[#660099] font-pixel-alt break-words overflow-hidden hover:border-[#00ff00] hover:text-[#00ff00] hover:bg-[#660099]/20 transition-colors cursor-pointer"
                  style={{ fontFamily: 'var(--font-pixel-alt)' }}
                >
                  {label.toLowerCase()} - by owner
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block z-20 w-56 sm:w-64">
                    <div className="bg-black border-2 border-[#660099] p-3 rounded shadow-lg text-left">
                      <p className="text-[#00ff00] text-xs font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                        {desc}
                      </p>
                      {subs.length > 0 && (
                        <p className="text-[#aa77ee] text-[10px] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                          Subcategories: {subs.map((s) => s.label).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Tokens - hover hints */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 text-left max-w-md mx-auto">
            <div className="space-y-0.5 sm:space-y-1 text-[#00ff00] font-pixel-alt text-[10px] sm:text-xs md:text-sm">
              {['SOL', 'SHIT PEPE', 'FLORK BOMB', 'BOME POPCAT', 'MER'].map((t) => (
                <div key={t} className="group/token relative break-words cursor-default">
                  {t}
                  {TOKEN_HINTS[t] && (
                    <span className="absolute left-0 bottom-full mb-1 hidden group-hover/token:inline-block z-20 bg-black border border-[#660099] px-2 py-1 text-[10px] text-[#aa77ee] whitespace-nowrap rounded">
                      {TOKEN_HINTS[t]}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-0.5 sm:space-y-1 text-[#00ff00] font-pixel-alt text-[10px] sm:text-xs md:text-sm">
              {['OL', 'ESOL', 'MEL', 'WFE', 'BOME PORCAT'].map((t) => (
                <div key={t} className="group/token relative break-words cursor-default">
                  {t}
                  {TOKEN_HINTS[t] && (
                    <span className="absolute left-0 bottom-full mb-1 hidden group-hover/token:inline-block z-20 bg-black border border-[#660099] px-2 py-1 text-[10px] text-[#aa77ee] whitespace-nowrap rounded">
                      {TOKEN_HINTS[t]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AsciiLogo
