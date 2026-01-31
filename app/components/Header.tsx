'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import { Button } from './ui/button'

export default function Header() {
  const { connected } = useWallet()

  return (
    <header className="border-b bg-card">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          $FBSD
        </Link>
        
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Browse
          </Link>
          {connected && (
            <>
              <Link href="/listings/create">
                <Button variant="outline" size="sm">Create Listing</Button>
              </Link>
              <Link href="/listings/create-auction">
                <Button variant="outline" size="sm">Create Auction</Button>
              </Link>
              <Link href="/listings/my" className="text-sm text-muted-foreground hover:text-foreground">
                My Listings
              </Link>
              <Link href="/tiers" className="text-sm text-muted-foreground hover:text-foreground">
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
