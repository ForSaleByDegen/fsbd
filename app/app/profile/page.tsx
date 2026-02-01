'use client'

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import DisclaimerBanner from '@/components/DisclaimerBanner'
import Footer from '@/components/Footer'
import { getUserTier } from '@/lib/tier-check'
import Link from 'next/link'
import ListingCard from '@/components/ListingCard'
import BuyerOrderActions from '@/components/BuyerOrderActions'
import ShippingAddressForm from '@/components/ShippingAddressForm'

// Dynamic import for Privy to avoid build issues
let usePrivy: any = null
let useWallets: any = null

if (typeof window !== 'undefined') {
  try {
    const privyModule = require('@privy-io/react-auth')
    usePrivy = privyModule.usePrivy
    useWallets = privyModule.useWallets
  } catch {
    // Privy not available
  }
}

function getWalletAddress(
  publicKey: ReturnType<typeof useWallet>['publicKey'],
  wallets: Array<{ chainId?: string; chainType?: string; address?: string }> | undefined
): string | null {
  if (publicKey) return publicKey.toString()
  if (wallets?.length) {
    // Prefer Solana wallet (devnet or mainnet)
    const solana = wallets.find(
      (w: { chainId?: string; chainType?: string }) =>
        w.chainType === 'solana' ||
        (typeof w.chainId === 'string' && w.chainId.toLowerCase().includes('solana'))
    )
    return solana?.address || wallets[0]?.address || null
  }
  return null
}

type ProfileData = {
  profile: { listings_count: number; total_fees_paid: number; total_listings_sold: number } | null
  listings: Array<{
    id: string
    title: string
    price: number
    price_token: string
    status: string
    escrow_status?: string
    images?: string[]
    category: string
    tracking_number?: string
    shipping_carrier?: string
    buyer_wallet_hash?: string
  }>
  escrows: Array<{ id: string; listing_id: string; escrow_status: string; listing_title?: string; listing_price?: number; listing_price_token?: string }>
  bids: Array<{ id: string; title: string; price: number; highest_bid: number; status: string; images?: string[]; category: string }>
  purchases: Array<{
    id: string
    title: string
    price: number
    price_token: string
    status: string
    images?: string[]
    category: string
    tracking_number?: string
    shipping_carrier?: string
    buyer_confirmed_received_at?: string | null
    wallet_address?: string
  }>
}

function SellerAddTrackingForm({
  listingId,
  title,
  price,
  priceToken,
  walletAddress,
  onSaved,
}: {
  listingId: string
  title: string
  price: number
  priceToken: string
  walletAddress: string | null
  onSaved: () => void
}) {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('USPS')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletAddress || !trackingNumber.trim()) {
      setError('Enter a tracking number')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/listings/${listingId}/add-tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          tracking_number: trackingNumber.trim(),
          shipping_carrier: carrier,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`)
      setTrackingNumber('')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-3 sm:p-4 bg-black/50 border-2 border-[#660099]">
      <Link href={`/listings/${listingId}`} className="block mb-2">
        <span className="text-[#00ff00] font-pixel-alt text-sm sm:text-base" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {title} • {price} {priceToken}
        </span>
      </Link>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
        <select
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          className="bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-xs p-2 min-w-[80px]"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          <option value="USPS">USPS</option>
          <option value="UPS">UPS</option>
          <option value="FedEx">FedEx</option>
          <option value="DHL">DHL</option>
          <option value="Other">Other</option>
        </select>
        <input
          type="text"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Tracking #"
          className="flex-1 min-w-[120px] bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-xs p-2"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt text-xs disabled:opacity-50"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </form>
      {error && <p className="text-red-500 text-xs font-pixel-alt mt-1">{error}</p>}
    </div>
  )
}

function getTrackingUrl(carrier: string | undefined, trackingNumber: string): string {
  const tn = encodeURIComponent(trackingNumber.trim())
  const c = (carrier || '').toUpperCase()
  if (c.includes('USPS')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`
  if (c.includes('FEDEX')) return `https://www.fedex.com/fedextrack/?trknbr=${tn}`
  if (c.includes('UPS')) return `https://www.ups.com/track?tracknum=${tn}`
  if (c.includes('DHL')) return `https://www.dhl.com/en/express/tracking.html?AWB=${tn}`
  return `https://www.google.com/search?q=track+${tn}`
}

export default function ProfilePage() {
  const privyAppId = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_PRIVY_APP_ID : undefined
  const privyEnabled = !!(privyAppId && usePrivy && useWallets)
  const privyHooks = privyEnabled ? usePrivy() : { user: null, authenticated: false, ready: true }
  const walletsHook = privyEnabled ? useWallets() : { wallets: [] }
  const { user, authenticated, ready } = privyHooks
  const { wallets } = walletsHook
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const [tier, setTier] = useState<'free' | 'bronze' | 'silver' | 'gold'>('free')
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const walletAddress = getWalletAddress(publicKey, wallets)

  useEffect(() => {
    if ((authenticated || connected) && walletAddress) {
      loadProfile()
    } else {
      setLoading(false)
    }
  }, [authenticated, connected, walletAddress, connection])

  const loadProfile = async () => {
    if (!walletAddress) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [apiRes, userTier] = await Promise.all([
        fetch(`/api/profile?wallet=${encodeURIComponent(walletAddress)}`),
        connection ? getUserTier(walletAddress, connection).catch(() => 'free' as const) : Promise.resolve('free' as const),
      ])

      setTier(userTier)

      if (!apiRes.ok) {
        const err = await apiRes.json().catch(() => ({}))
        throw new Error(err.error || `Failed to load profile (${apiRes.status})`)
      }
      const data = await apiRes.json()
      setProfileData(data)
    } catch (err: unknown) {
      console.error('Error loading profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
      setProfileData(null)
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background w-full overflow-x-hidden">
        <Header />
        <main className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full">
          <div className="text-center text-[#00ff00] font-pixel-alt text-sm sm:text-base" style={{ fontFamily: 'var(--font-pixel-alt)' }}>Loading...</div>
        </main>
      </div>
    )
  }

  const isAuthenticated = authenticated || connected

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background w-full overflow-x-hidden">
        <Header />
        <main className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full">
          <DisclaimerBanner />
          <div className="text-center py-8 sm:py-12 md:py-16">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-[#660099] mb-4 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
              Profile
            </h1>
            <p className="text-[#00ff00] font-pixel-alt mb-6 text-sm sm:text-base px-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Connect your wallet or sign in to view your profile
            </p>
            <Link href="/">
              <button className="px-4 sm:px-6 py-2 sm:py-3 border-2 sm:border-4 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt transition-colors min-h-[44px] text-sm sm:text-base touch-manipulation" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Go Home
              </button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const email = user?.email?.address || 'No email'
  const linkedAccounts = user?.linkedAccounts || []
  const stats = profileData?.profile
  const listings = profileData?.listings ?? []
  const escrows = profileData?.escrows ?? []
  const bids = profileData?.bids ?? []
  const purchases = profileData?.purchases ?? []

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full relative z-10">
        <DisclaimerBanner />

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-[#660099] mb-4 sm:mb-6 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
          Profile
        </h1>

        {error && (
          <div className="mb-4 p-4 border-2 border-red-500 bg-red-500/10 text-red-400 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            {error}
            <p className="mt-2 text-xs opacity-80">Ensure SUPABASE_SERVICE_ROLE_KEY is set in your deployment.</p>
          </div>
        )}

        <div className="pixel-box bg-black border-2 sm:border-4 border-[#660099] p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 relative z-10">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-base sm:text-lg md:text-xl font-pixel text-[#00ff00] mb-2 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
                Wallet Address
              </h2>
              <p className="text-[#660099] font-pixel-alt break-all text-xs sm:text-sm md:text-base leading-relaxed" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                {walletAddress || 'Not connected'}
              </p>
            </div>

            {email !== 'No email' && (
              <div>
                <h2 className="text-base sm:text-lg md:text-xl font-pixel text-[#00ff00] mb-2 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
                  Email
                </h2>
                <p className="text-[#660099] font-pixel-alt text-xs sm:text-sm md:text-base break-all" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  {email}
                </p>
              </div>
            )}

            <div>
              <h2 className="text-base sm:text-lg md:text-xl font-pixel text-[#00ff00] mb-2 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
                Current Tier
              </h2>
              <p className="text-xl sm:text-2xl md:text-3xl font-pixel text-[#660099] capitalize" style={{ fontFamily: 'var(--font-pixel)' }}>
                {loading ? 'Loading...' : tier}
              </p>
            </div>

            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#660099]/30">
                <div>
                  <h3 className="text-sm font-pixel text-[#00ff00] mb-1" style={{ fontFamily: 'var(--font-pixel)' }}>
                    Listings Created
                  </h3>
                  <p className="text-lg font-pixel text-[#660099]" style={{ fontFamily: 'var(--font-pixel)' }}>
                    {stats.listings_count}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-pixel text-[#00ff00] mb-1" style={{ fontFamily: 'var(--font-pixel)' }}>
                    Listings Sold
                  </h3>
                  <p className="text-lg font-pixel text-[#660099]" style={{ fontFamily: 'var(--font-pixel)' }}>
                    {stats.total_listings_sold}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-pixel text-[#00ff00] mb-1" style={{ fontFamily: 'var(--font-pixel)' }}>
                    Total Fees Paid
                  </h3>
                  <p className="text-lg font-pixel text-[#660099]" style={{ fontFamily: 'var(--font-pixel)' }}>
                    {Number(stats.total_fees_paid || 0).toFixed(2)} SOL
                  </p>
                </div>
              </div>
            )}

            {linkedAccounts.length > 0 && (
              <div>
                <h2 className="text-base sm:text-lg md:text-xl font-pixel text-[#00ff00] mb-2 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
                  Linked Accounts
                </h2>
                <div className="space-y-2">
                  {linkedAccounts.map((account: { type?: string; address?: string; email?: string }, idx: number) => (
                    <div key={idx} className="text-[#660099] font-pixel-alt text-xs sm:text-sm md:text-base break-all" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                      {account.type}: {account.address || account.email || 'N/A'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delivery Address - for buyers (General Delivery / PO Box keeps home private) */}
        <section className="mb-6">
          <h2 className="text-xl font-pixel text-[#00ff00] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
            📬 Delivery address
          </h2>
          <p className="text-[#660099] font-pixel-alt text-sm mb-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Sellers need this to ship your purchases. Use General Delivery or a PO Box to keep your home address private.
          </p>
          <div className="p-4 bg-black/50 border-2 border-[#660099] rounded max-w-xl">
            <ShippingAddressForm
              initialAddress={(profileData?.profile as { shipping_address?: Record<string, unknown> })?.shipping_address as Record<string, unknown> | undefined}
              onSave={async (addr) => {
                if (!walletAddress) return
                const res = await fetch('/api/profile/shipping-address', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ wallet: walletAddress, address: addr }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data.error || 'Failed to save')
                loadProfile()
              }}
            />
          </div>
        </section>

        {/* My Listings */}
        <section className="mb-6">
          <h2 className="text-xl font-pixel text-[#00ff00] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
            My Listings
          </h2>
          {loading ? (
            <p className="text-[#660099] font-pixel-alt text-sm">Loading...</p>
          ) : listings.length === 0 ? (
            <p className="text-[#660099] font-pixel-alt text-sm mb-4">No listings yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {listings.slice(0, 6).map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
          <Link href="/listings/my">
            <button className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              View All Listings
            </button>
          </Link>
        </section>

        {/* Escrows */}
        <section className="mb-6">
          <h2 className="text-xl font-pixel text-[#00ff00] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
            Active Escrows
          </h2>
          {loading ? (
            <p className="text-[#660099] font-pixel-alt text-sm">Loading...</p>
          ) : escrows.length === 0 ? (
            <p className="text-[#660099] font-pixel-alt text-sm mb-4">No active escrows.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {escrows.slice(0, 5).map((e: (typeof escrows)[0]) => (
                <Link key={e.id} href={`/listings/${e.listing_id}`} className="block p-3 bg-black/50 border-2 border-[#660099] hover:border-[#00ff00] transition-colors">
                  <span className="text-[#00ff00] font-pixel-alt text-sm block" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                    {e.listing_title || 'Listing'} • {e.listing_price != null ? `${e.listing_price} ${e.listing_price_token || 'SOL'}` : ''}
                  </span>
                  <span className="text-[#660099] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                    Escrow: {e.escrow_status || 'pending'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Bids */}
        <section className="mb-6">
          <h2 className="text-xl font-pixel text-[#00ff00] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
            My Bids
          </h2>
          {loading ? (
            <p className="text-[#660099] font-pixel-alt text-sm">Loading...</p>
          ) : bids.length === 0 ? (
            <p className="text-[#660099] font-pixel-alt text-sm mb-4">No bids yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {bids.slice(0, 4).map((b) => (
                <ListingCard key={b.id} listing={{ ...b, price: b.highest_bid ?? b.price, price_token: 'SOL' }} />
              ))}
            </div>
          )}
        </section>

        {/* Purchases */}
        <section className="mb-6">
          <h2 className="text-xl font-pixel text-[#00ff00] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
            My Purchases
          </h2>
          {loading ? (
            <p className="text-[#660099] font-pixel-alt text-sm">Loading...</p>
          ) : purchases.length === 0 ? (
            <p className="text-[#660099] font-pixel-alt text-sm mb-4">No purchases yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {purchases.slice(0, 6).map((p: (typeof purchases)[0]) => (
                <div key={p.id} className="space-y-2">
                  <ListingCard listing={p} />
                  {(p.status === 'sold' || p.status === 'shipped') && (
                    <BuyerOrderActions
                      listingId={p.id}
                      walletAddress={walletAddress}
                      buyerConfirmedReceivedAt={p.buyer_confirmed_received_at}
                      onUpdated={loadProfile}
                      compact
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Shipping / Order Tracking - for purchases with tracking info */}
        <section className="mb-6">
          <h2 className="text-xl font-pixel text-[#00ff00] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
            📦 Shipping & Tracking
          </h2>
          {loading ? (
            <p className="text-[#660099] font-pixel-alt text-sm">Loading...</p>
          ) : (() => {
            const withTracking = purchases.filter(
              (p: (typeof purchases)[0]) => p.tracking_number && String(p.tracking_number).trim()
            )
            return withTracking.length === 0 ? (
              <p className="text-[#660099] font-pixel-alt text-sm mb-4">
                No shipping info yet. Sellers add tracking after shipping — check back or coordinate via chat.
              </p>
            ) : (
              <div className="space-y-3 mb-4">
                {withTracking.map((p: (typeof purchases)[0]) => {
                  const trackUrl = getTrackingUrl(p.shipping_carrier, p.tracking_number!)
                  return (
                    <div
                      key={p.id}
                      className="p-3 sm:p-4 bg-black/50 border-2 border-[#660099] hover:border-[#00ff00] transition-colors"
                    >
                      <Link href={`/listings/${p.id}`} className="block">
                        <span className="text-[#00ff00] font-pixel-alt text-sm sm:text-base block" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                          {p.title} • {p.price} {p.price_token || 'SOL'}
                        </span>
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[#660099] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                          {p.shipping_carrier || 'Carrier'}: {p.tracking_number}
                        </span>
                        <a
                          href={trackUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#ff00ff] font-pixel-alt text-xs underline hover:text-[#00ff00]"
                          style={{ fontFamily: 'var(--font-pixel-alt)' }}
                        >
                          Track package →
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </section>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full flex-wrap">
          <Link href="/listings/my" className="flex-1 sm:flex-none">
            <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border-2 sm:border-4 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt transition-colors min-h-[44px] text-sm sm:text-base touch-manipulation" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              My Listings
            </button>
          </Link>
          {walletAddress && (
            <Link href={`/seller?wallet=${encodeURIComponent(walletAddress)}`} className="flex-1 sm:flex-none">
              <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border-2 sm:border-4 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt transition-colors min-h-[44px] text-sm sm:text-base touch-manipulation" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Your seller profile
              </button>
            </Link>
          )}
          <Link href="/tiers" className="flex-1 sm:flex-none">
            <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border-2 sm:border-4 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt transition-colors min-h-[44px] text-sm sm:text-base touch-manipulation" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              View Tiers
            </button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
