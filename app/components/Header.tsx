'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import { Button } from './ui/button'

export default function Header() {
  const { connected } = useWallet()

  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
        <Link href="/" className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent touch-manipulation">
          $FBSD
        </Link>
        
        <nav className="flex items-center gap-2 md:gap-3 lg:gap-4">
          <Link href="/" className="text-xs md:text-sm font-medium text-muted-foreground hover:text-foreground active:text-foreground transition-colors touch-manipulation px-2 py-1">
            Browse
          </Link>
          {connected && (
            <>
              <Link href="/listings/create">
                <Button variant="outline" size="sm" className="hidden md:inline-flex touch-manipulation">Create Listing</Button>
              </Link>
              <Link href="/listings/create-auction">
                <Button variant="outline" size="sm" className="hidden md:inline-flex touch-manipulation">Auction</Button>
              </Link>
              <Link href="/listings/my" className="text-xs md:text-sm font-medium text-muted-foreground hover:text-foreground active:text-foreground transition-colors hidden md:inline touch-manipulation px-2 py-1">
                My Listings
              </Link>
              <Link href="/tiers" className="text-xs md:text-sm font-medium text-muted-foreground hover:text-foreground active:text-foreground transition-colors hidden lg:inline touch-manipulation px-2 py-1">
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
