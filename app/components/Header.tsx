'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import { Button } from './ui/button'

export default function Header() {
  const { connected } = useWallet()

  return (
    <header className="border-b-4 border-[#660099] bg-black/90 backdrop-blur-sm sticky top-0 z-50 shadow-lg pixel-art">
      <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
        <Link href="/" className="text-xl md:text-2xl font-pixel text-[#00ff00] touch-manipulation hover:text-[#660099] transition-colors" style={{ fontFamily: 'var(--font-pixel)' }}>
          $FBSD
        </Link>
        
        <nav className="flex items-center gap-2 md:gap-3 lg:gap-4">
          <Link href="/" className="text-xs md:text-sm font-pixel-alt text-[#660099] hover:text-[#00ff00] active:text-[#00ff00] transition-colors touch-manipulation px-2 py-1 border-2 border-transparent hover:border-[#660099]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Browse
          </Link>
          {connected && (
            <>
              <Link href="/listings/create">
                <Button variant="outline" size="sm" className="hidden md:inline-flex touch-manipulation border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>Create Listing</Button>
              </Link>
              <Link href="/listings/create-auction">
                <Button variant="outline" size="sm" className="hidden md:inline-flex touch-manipulation border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>Auction</Button>
              </Link>
              <Link href="/listings/my" className="text-xs md:text-sm font-pixel-alt text-[#660099] hover:text-[#00ff00] active:text-[#00ff00] transition-colors hidden md:inline touch-manipulation px-2 py-1 border-2 border-transparent hover:border-[#660099]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                My Listings
              </Link>
              <Link href="/tiers" className="text-xs md:text-sm font-pixel-alt text-[#660099] hover:text-[#00ff00] active:text-[#00ff00] transition-colors hidden lg:inline touch-manipulation px-2 py-1 border-2 border-transparent hover:border-[#660099]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Tiers
              </Link>
            </>
          )}
          <div className="touch-manipulation">
            <WalletMultiButton />
          </div>
        </nav>
      </div>
    </header>
  )
}
