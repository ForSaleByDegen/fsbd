'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { Button } from './ui/button'
import PrivyConnectButton from './PrivyConnectButton'
import { isAdmin } from '@/lib/admin'

// Dynamic import for Privy
let usePrivyHook: any = null
if (typeof window !== 'undefined') {
  try {
    const privyModule = require('@privy-io/react-auth')
    usePrivyHook = privyModule.usePrivy
  } catch {
    // Privy not available
  }
}

export default function Header() {
  const { connected, publicKey } = useWallet()
  const privyEnabled = !!(process.env.NEXT_PUBLIC_PRIVY_APP_ID && usePrivyHook)
  const privyAuth = privyEnabled ? usePrivyHook() : { authenticated: false }
  const authenticated = privyAuth.authenticated || false
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userIsAdmin, setUserIsAdmin] = useState(false)

  useEffect(() => {
    if (connected && publicKey) {
      checkAdminStatus()
    } else {
      setUserIsAdmin(false)
    }
  }, [connected, publicKey])

  const checkAdminStatus = async () => {
    if (!publicKey) return
    try {
      const adminStatus = await isAdmin(publicKey.toString())
      setUserIsAdmin(adminStatus)
    } catch (error) {
      console.error('Error checking admin status:', error)
      setUserIsAdmin(false)
    }
  }

  return (
    <header className="border-b-4 border-[#660099] bg-black/90 backdrop-blur-sm sticky top-0 z-50 shadow-lg pixel-art">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-3 md:py-4">
        {/* Main header row */}
        <div className="flex justify-between items-center">
          <Link 
            href="/" 
            className="text-lg sm:text-xl md:text-2xl font-pixel text-[#00ff00] touch-manipulation hover:text-[#660099] transition-colors flex-shrink-0" 
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            $FSBD
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-4">
            <Link href="/" className="text-xs md:text-sm font-pixel-alt text-[#660099] hover:text-[#00ff00] active:text-[#00ff00] transition-colors touch-manipulation px-2 py-1 border-2 border-transparent hover:border-[#660099]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Browse
            </Link>
            <Link href="/listings/create" className="text-xs md:text-sm font-pixel-alt text-[#660099] hover:text-[#00ff00] active:text-[#00ff00] transition-colors touch-manipulation px-2 py-1 border-2 border-transparent hover:border-[#660099]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Create
            </Link>
            {connected && (
              <>
                <Link href="/listings/create-auction">
                  <Button variant="outline" size="sm" className="touch-manipulation border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>Auction</Button>
                </Link>
                <Link href="/listings/my" className="text-xs md:text-sm font-pixel-alt text-[#660099] hover:text-[#00ff00] active:text-[#00ff00] transition-colors touch-manipulation px-2 py-1 border-2 border-transparent hover:border-[#660099]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  My Listings
                </Link>
                <Link href="/profile" className="text-xs md:text-sm font-pixel-alt text-[#660099] hover:text-[#00ff00] active:text-[#00ff00] transition-colors touch-manipulation px-2 py-1 border-2 border-transparent hover:border-[#660099]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Profile
                </Link>
                <Link href="/tiers" className="text-xs md:text-sm font-pixel-alt text-[#660099] hover:text-[#00ff00] active:text-[#00ff00] transition-colors hidden lg:inline touch-manipulation px-2 py-1 border-2 border-transparent hover:border-[#660099]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Tiers
                </Link>
              </>
            )}
            <div className="touch-manipulation">
              <PrivyConnectButton />
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <div className="touch-manipulation">
              <PrivyConnectButton />
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="touch-manipulation p-2 border-2 border-[#660099] text-[#00ff00] font-pixel-alt"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-3 pb-2 border-t-2 border-[#660099]">
            <div className="flex flex-col gap-2 pt-2">
              <Link 
                href="/" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-pixel-alt text-[#660099] hover:text-[#00ff00] active:text-[#00ff00] transition-colors touch-manipulation px-3 py-2 border-2 border-transparent hover:border-[#660099] min-h-[44px] flex items-center" 
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                Browse
              </Link>
              <Link 
                href="/listings/create" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-pixel-alt text-[#660099] hover:text-[#00ff00] active:text-[#00ff00] transition-colors touch-manipulation px-3 py-2 border-2 border-transparent hover:border-[#660099] min-h-[44px] flex items-center" 
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                Create Listing
              </Link>
              {connected && (
                <>
                  <Link 
                    href="/listings/create-auction" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-pixel-alt text-[#660099] hover:text-[#00ff00] active:text-[#00ff00] transition-colors touch-manipulation px-3 py-2 border-2 border-transparent hover:border-[#660099] min-h-[44px] flex items-center" 
                    style={{ fontFamily: 'var(--font-pixel-alt)' }}
                  >
                    Create Auction
                  </Link>
                  <Link 
                    href="/listings/my" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-pixel-alt text-[#660099] hover:text-[#00ff00] active:text-[#00ff00] transition-colors touch-manipulation px-3 py-2 border-2 border-transparent hover:border-[#660099] min-h-[44px] flex items-center" 
                    style={{ fontFamily: 'var(--font-pixel-alt)' }}
                  >
                    My Listings
                  </Link>
                  <Link 
                    href="/profile" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-pixel-alt text-[#660099] hover:text-[#00ff00] active:text-[#00ff00] transition-colors touch-manipulation px-3 py-2 border-2 border-transparent hover:border-[#660099] min-h-[44px] flex items-center" 
                    style={{ fontFamily: 'var(--font-pixel-alt)' }}
                  >
                    Profile
                  </Link>
                  <Link 
                    href="/tiers" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-pixel-alt text-[#660099] hover:text-[#00ff00] active:text-[#00ff00] transition-colors touch-manipulation px-3 py-2 border-2 border-transparent hover:border-[#660099] min-h-[44px] flex items-center" 
                    style={{ fontFamily: 'var(--font-pixel-alt)' }}
                  >
                    Tiers
                  </Link>
                  {userIsAdmin && (
                    <Link 
                      href="/admin" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-pixel-alt text-[#ff00ff] hover:text-[#00ff00] active:text-[#00ff00] transition-colors touch-manipulation px-3 py-2 border-2 border-[#ff00ff] hover:border-[#00ff00] min-h-[44px] flex items-center" 
                      style={{ fontFamily: 'var(--font-pixel-alt)' }}
                    >
                      Admin
                    </Link>
                  )}
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
