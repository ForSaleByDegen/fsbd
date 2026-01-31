'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import { Button } from './ui/button'

export default function Header() {
  const { connected } = useWallet()

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          $FBSD
        </Link>
        
        <nav className="flex items-center gap-3 md:gap-4">
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Browse
          </Link>
          {connected && (
            <>
              <Link href="/listings/create">
                <Button variant="outline" size="sm" className="hidden md:inline-flex">Create Listing</Button>
              </Link>
              <Link href="/listings/create-auction">
                <Button variant="outline" size="sm" className="hidden md:inline-flex">Auction</Button>
              </Link>
              <Link href="/listings/my" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:inline">
                My Listings
              </Link>
              <Link href="/tiers" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:inline">
                Tiers
              </Link>
            </>
          )}
          <WalletMultiButton />
        </nav>
      </div>
    </header>
  )
}
