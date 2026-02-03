'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import PrivyConnectButton from './PrivyConnectButton'
import NotificationBadge from './NotificationBadge'
import { isAdmin } from '@/lib/admin'

const isBetaMode = process.env.NEXT_PUBLIC_BETA_MODE === 'true'

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
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { connected, publicKey } = useWallet()
  const privyEnabled = !!(process.env.NEXT_PUBLIC_PRIVY_APP_ID && usePrivyHook)
  const privyAuth = privyEnabled ? usePrivyHook() : { authenticated: false }
  const authenticated = privyAuth.authenticated || false
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userIsAdmin, setUserIsAdmin] = useState(false)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' && !searchParams.get('tab')
    if (href === '/?tab=activity') return pathname === '/' && searchParams.get('tab') === 'activity'
    if (href === '/listings/create') return pathname === '/listings/create'
    if (href === '/listings/create-auction') return pathname.startsWith('/listings/create-auction')
    return pathname.startsWith(href)
  }

  const navLinkClass = (href: string) => {
    const active = isActive(href)
    return `text-xs md:text-sm font-pixel-alt transition-colors touch-manipulation px-2 py-1 border-2 ${active ? 'text-[#00ff00] border-[#660099]' : 'text-[#660099] border-transparent hover:text-[#00ff00] hover:border-[#660099]'}`
  }

  const mobileNavLinkClass = (href: string) => {
    const active = isActive(href)
    return `text-sm font-pixel-alt transition-colors touch-manipulation px-3 py-2 border-2 min-h-[44px] flex items-center ${active ? 'text-[#00ff00] border-[#660099]' : 'text-[#660099] border-transparent hover:text-[#00ff00] hover:border-[#660099]'}`
  }

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
            {!isBetaMode && (
              <>
                <Link href="/" className={navLinkClass('/')} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Browse
                </Link>
                <Link href="/?tab=activity" className={navLinkClass('/?tab=activity')} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Activity
                </Link>
                <Link href="/listings/create" className={navLinkClass('/listings/create')} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Create
                </Link>
            {connected && (
              <>
                <Link href="/listings/create-auction" className={navLinkClass('/listings/create-auction')} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Auction
                </Link>
                <Link href="/listings/my" className={navLinkClass('/listings/my')} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  My Listings
                </Link>
                <Link href="/profile" className={navLinkClass('/profile')} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Profile
                </Link>
                <Link href="/tiers" className={`${navLinkClass('/tiers')} hidden lg:inline`} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Tiers
                </Link>
              </>
            )}
              </>
            )}
            <Link href="/why" className={`${navLinkClass('/why')} hidden lg:inline`} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Why $FSBD
            </Link>
            {userIsAdmin && (
              <Link href="/admin" className={`text-xs md:text-sm font-pixel-alt transition-colors touch-manipulation px-2 py-1 border-2 ${isActive('/admin') ? 'text-[#00ff00] border-[#00ff00]' : 'text-[#ff00ff] border-[#ff00ff] hover:text-[#00ff00] hover:border-[#00ff00]'}`} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Admin
              </Link>
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
              {!isBetaMode && (
                <>
                  <Link 
                    href="/" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={mobileNavLinkClass('/')}
                    style={{ fontFamily: 'var(--font-pixel-alt)' }}
                  >
                    Browse
                  </Link>
                  <Link 
                    href="/?tab=activity" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={mobileNavLinkClass('/?tab=activity')}
                    style={{ fontFamily: 'var(--font-pixel-alt)' }}
                  >
                    Activity
                  </Link>
                  <Link 
                    href="/listings/create" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={mobileNavLinkClass('/listings/create')}
                    style={{ fontFamily: 'var(--font-pixel-alt)' }}
                  >
                    Create Listing
                  </Link>
                  {connected && (
                    <>
                      <Link 
                        href="/listings/create-auction" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={mobileNavLinkClass('/listings/create-auction')}
                        style={{ fontFamily: 'var(--font-pixel-alt)' }}
                      >
                        Create Auction
                      </Link>
                      <Link 
                        href="/listings/my" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={mobileNavLinkClass('/listings/my')}
                        style={{ fontFamily: 'var(--font-pixel-alt)' }}
                      >
                        My Listings
                      </Link>
                      <Link 
                        href="/profile" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={mobileNavLinkClass('/profile')}
                        style={{ fontFamily: 'var(--font-pixel-alt)' }}
                      >
                        Profile
                      </Link>
                      <NotificationBadge />
                      <Link 
                        href="/tiers" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={mobileNavLinkClass('/tiers')}
                        style={{ fontFamily: 'var(--font-pixel-alt)' }}
                      >
                        Tiers
                      </Link>
                    </>
                  )}
                </>
              )}
              <Link 
                href="/why" 
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass('/why')}
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                Why $FSBD
              </Link>
              {userIsAdmin && (
                <Link 
                  href="/admin" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-pixel-alt transition-colors touch-manipulation px-3 py-2 border-2 min-h-[44px] flex items-center ${isActive('/admin') ? 'text-[#00ff00] border-[#00ff00]' : 'text-[#ff00ff] border-[#ff00ff] hover:text-[#00ff00] hover:border-[#00ff00]'}`}
                  style={{ fontFamily: 'var(--font-pixel-alt)' }}
                >
                  Admin
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
