'use client'

import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'

export default function CreateListingCTA() {
  const { connected } = useWallet()

  return (
    <div className="flex justify-center w-full">
      <Link
        href="/listings/create"
        className="group flex items-center justify-center gap-3 sm:gap-4 px-10 sm:px-16 md:px-20 py-5 sm:py-6 md:py-7 rounded-xl border-4 border-[#00ff00] bg-[#00ff00]/15 hover:bg-[#00ff00]/25 text-[#00ff00] font-pixel-alt text-2xl sm:text-3xl md:text-4xl lg:text-5xl transition-all duration-200 hover:shadow-[0_0_40px_rgba(0,255,0,0.5)] hover:scale-105 active:scale-100 min-w-[280px] sm:min-w-[320px]"
        style={{ fontFamily: 'var(--font-pixel-alt)' }}
      >
        <span className="text-3xl sm:text-4xl md:text-5xl">+</span>
        {connected ? 'Create Listing' : 'Create Listing'}
      </Link>
    </div>
  )
}
