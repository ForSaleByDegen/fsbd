'use client'

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ListingCard from '@/components/ListingCard'
import BuyerOrderActions from '@/components/BuyerOrderActions'
import ShippingAddressGuidance from '@/components/ShippingAddressGuidance'
import LocalShippingAddressForm from '@/components/LocalShippingAddressForm'
import ProfileAreaTag from '@/components/ProfileAreaTag'
import ProfilePrivacyToggle from '@/components/ProfilePrivacyToggle'
import ProfileSocialsBanner from '@/components/ProfileSocialsBanner'
import NotificationsPanel from '@/components/NotificationsPanel'
import NotificationPreferences from '@/components/NotificationPreferences'
import { useTier } from '@/components/providers/TierProvider'
import { formatPriceToken } from '@/lib/utils'

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
  profile: {
    listings_count: number
    total_fees_paid: number
    total_listings_sold: number
    area_tag?: string | null
    profile_private?: boolean | null
    banner_url?: string | null
    twitter_url?: string | null
    telegram_url?: string | null
    discord_url?: string | null
    website_url?: string | null
    notify_email?: string | null
    notify_phone?: string | null
    notify_push_subscription?: unknown
  } | null
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
    has_protection?: boolean
    claim_status?: string
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
  const { tier: tierState } = useTier()
  const tier = tierState.tier
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deliverySectionOpen, setDeliverySectionOpen] = useState(false)
  const [socialsSectionOpen, setSocialsSectionOpen] = useState(false)
  const [notificationsSectionOpen, setNotificationsSectionOpen] = useState(false)
  const [verifySectionOpen, setVerifySectionOpen] = useState(false)
  const [notifySectionOpen, setNotifySectionOpen] = useState(false)
  const [verifications, setVerifications] = useState<{ verified: boolean; platforms: Array<{ platform: string; username?: string; storeUrl?: string }> } | null>(null)
  const [manualCode, setManualCode] = useState<{ code: string; qrDataUrl: string } | null>(null)
  const [manualUrl, setManualUrl] = useState('')
  const [manualVerifying, setManualVerifying] = useState(false)

  const walletAddress = getWalletAddress(publicKey, wallets)
  const searchParams = useSearchParams()
  const verifyError = searchParams.get('error')

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
      const apiRes = await fetch(`/api/profile?wallet=${encodeURIComponent(walletAddress)}`)

      if (!apiRes.ok) {
        const err = await apiRes.json().catch(() => ({}))
        throw new Error(err.error || `Failed to load profile (${apiRes.status})`)
      }
      const data = await apiRes.json()
      setProfileData(data)
      // Load verification status
      fetch(`/api/seller/verifications?wallet=${encodeURIComponent(walletAddress)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((v) => v && setVerifications(v))
        .catch(() => {})
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
          <div className="text-center py-8 sm:py-12 md:py-16">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-purple-readable mb-4 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
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
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-purple-readable mb-4 sm:mb-6 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
          Profile
        </h1>

        {error && (
          <div className="mb-4 p-4 border-2 border-red-500 bg-red-500/10 text-red-400 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            {error}
            <p className="mt-2 text-xs opacity-80">Ensure SUPABASE_SERVICE_ROLE_KEY is set in your deployment.</p>
          </div>
        )}

        {verifyError && (
          <div className="mb-4 p-4 border-2 border-amber-500/80 bg-amber-500/10 text-amber-400 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Verification: {verifyError === 'ebay_not_configured' || verifyError === 'etsy_not_configured' ? 'Platform not configured yet.' : verifyError === 'invalid_state' ? 'Session expired. Try again.' : verifyError === 'ebay_denied' || verifyError === 'etsy_denied' ? 'You declined access.' : verifyError}
          </div>
        )}

        <div className="pixel-box bg-black border-2 sm:border-4 border-[#660099] p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 relative z-10">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-base sm:text-lg md:text-xl font-pixel text-[#00ff00] mb-2 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
                Wallet Address
              </h2>
              <p className="text-purple-readable font-pixel-alt break-all text-xs sm:text-sm md:text-base leading-relaxed" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                {walletAddress || 'Not connected'}
              </p>
            </div>

            {email !== 'No email' && (
              <div>
                <h2 className="text-base sm:text-lg md:text-xl font-pixel text-[#00ff00] mb-2 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
                  Email
                </h2>
                <p className="text-purple-readable font-pixel-alt text-xs sm:text-sm md:text-base break-all" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  {email}
                </p>
              </div>
            )}

            <div>
              <h2 className="text-base sm:text-lg md:text-xl font-pixel text-[#00ff00] mb-2 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
                Current Tier
              </h2>
              <p className="text-xl sm:text-2xl md:text-3xl font-pixel text-purple-readable capitalize" style={{ fontFamily: 'var(--font-pixel)' }}>
                {loading ? 'Loading...' : tier}
              </p>
            </div>

            <div className="pt-4 border-t border-[#660099]/30">
              <NotificationsPanel />
            </div>

            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#660099]/30">
                <div>
                  <h3 className="text-sm font-pixel text-[#00ff00] mb-1" style={{ fontFamily: 'var(--font-pixel)' }}>
                    Listings Created
                  </h3>
                  <p className="text-lg font-pixel text-purple-readable" style={{ fontFamily: 'var(--font-pixel)' }}>
                    {stats.listings_count}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-pixel text-[#00ff00] mb-1" style={{ fontFamily: 'var(--font-pixel)' }}>
                    Listings Sold
                  </h3>
                  <p className="text-lg font-pixel text-purple-readable" style={{ fontFamily: 'var(--font-pixel)' }}>
                    {stats.total_listings_sold}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-pixel text-[#00ff00] mb-1" style={{ fontFamily: 'var(--font-pixel)' }}>
                    Total Fees Paid
                  </h3>
                  <p className="text-lg font-pixel text-purple-readable" style={{ fontFamily: 'var(--font-pixel)' }}>
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
                    <div key={idx} className="text-purple-readable font-pixel-alt text-xs sm:text-sm md:text-base break-all" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                      {account.type}: {account.address || account.email || 'N/A'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ProfileAreaTag
              walletAddress={walletAddress}
              initialValue={profileData?.profile?.area_tag ?? null}
              onSaved={loadProfile}
            />

            <div className="mt-4">
              <ProfilePrivacyToggle
                walletAddress={walletAddress}
                initialValue={profileData?.profile?.profile_private ?? false}
                onSaved={loadProfile}
              />
            </div>

            {/* Verified Seller section */}
            <div className="mt-4 pt-4 border-t border-[#660099]/30">
              <button
                type="button"
                onClick={() => setVerifySectionOpen(!verifySectionOpen)}
                className="w-full flex items-center justify-between text-left font-pixel-alt text-[#00ff00] hover:bg-[#660099]/20 transition-colors p-2 rounded"
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                <span className="flex items-center gap-2">
                  {verifications?.verified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#00ff00] bg-[#00ff00]/10 text-[#00ff00] text-xs">
                      ✓ Verified Seller
                    </span>
                  ) : (
                    <span className="text-purple-muted">Verify your seller profile</span>
                  )}
                </span>
                <span className="text-purple-readable">{verifySectionOpen ? '▼' : '▶'}</span>
              </button>
              {verifySectionOpen && (
                <div className="pt-3 space-y-3">
                  {verifications?.verified && verifications.platforms.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-purple-muted font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                        Verified platforms:
                      </p>
                      {verifications.platforms.map((p) => (
                        <div key={p.platform} className="flex items-center gap-2 text-sm">
                          <span className="capitalize text-[#00ff00]">{p.platform}</span>
                          {p.storeUrl && (
                            <a href={p.storeUrl} target="_blank" rel="noopener noreferrer" className="text-[#ff00ff] hover:text-[#00ff00] underline text-xs">
                              View store →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-purple-muted font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                    The verified seller badge appears on your listings when you import from external sites (Amazon, eBay, Etsy). It proves you own or control those external listings.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {!verifications?.platforms?.some((p) => p.platform === 'ebay') && (
                      <a
                        href={walletAddress ? `/api/verify/ebay/connect?wallet=${encodeURIComponent(walletAddress)}` : '#'}
                        className="px-3 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/30 font-pixel-alt text-xs transition-colors"
                        style={{ fontFamily: 'var(--font-pixel-alt)' }}
                      >
                        Verify with eBay
                      </a>
                    )}
                    {!verifications?.platforms?.some((p) => p.platform === 'etsy') && (
                      <a
                        href={walletAddress ? `/api/verify/etsy/connect?wallet=${encodeURIComponent(walletAddress)}` : '#'}
                        className="px-3 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/30 font-pixel-alt text-xs transition-colors"
                        style={{ fontFamily: 'var(--font-pixel-alt)' }}
                      >
                        Verify with Etsy
                      </a>
                    )}
                    {!verifications?.platforms?.some((p) => p.platform === 'manual') && (
                      <div className="flex flex-col gap-2 pt-2 border-t border-[#660099]/30 mt-2">
                        <span className="text-xs text-purple-muted font-pixel-alt">Manual: add QR to listing image</span>
                        {!manualCode ? (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!walletAddress) return
                              try {
                                const r = await fetch('/api/verify/code/request', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ wallet: walletAddress }),
                                })
                                const d = await r.json()
                                if (r.ok && d.code && d.qrDataUrl) setManualCode({ code: d.code, qrDataUrl: d.qrDataUrl })
                              } catch {}
                            }}
                            className="px-3 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/30 font-pixel-alt text-xs w-fit"
                            style={{ fontFamily: 'var(--font-pixel-alt)' }}
                          >
                            Request code
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <img src={manualCode.qrDataUrl} alt="QR" className="w-24 h-24 border border-[#660099]" />
                              <span className="text-[#00ff00] font-pixel-alt text-sm">{manualCode.code}</span>
                            </div>
                            <p className="text-xs text-purple-muted">Add QR to listing photo, then paste listing URL:</p>
                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={manualUrl}
                                onChange={(e) => setManualUrl(e.target.value)}
                                placeholder="https://ebay.com/itm/..."
                                className="flex-1 bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-xs p-2"
                                style={{ fontFamily: 'var(--font-pixel-alt)' }}
                              />
                              <button
                                type="button"
                                disabled={manualVerifying || !manualUrl.trim()}
                                onClick={async () => {
                                  if (!walletAddress || !manualUrl.trim()) return
                                  setManualVerifying(true)
                                  try {
                                    const r = await fetch('/api/verify/code/verify', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ wallet: walletAddress, listingUrl: manualUrl.trim() }),
                                    })
                                    const d = await r.json()
                                    if (r.ok) {
                                      setManualCode(null)
                                      setManualUrl('')
                                      loadProfile()
                                      fetch(`/api/seller/verifications?wallet=${encodeURIComponent(walletAddress)}`)
                                        .then((x) => (x.ok ? x.json() : null))
                                        .then((v) => v && setVerifications(v))
                                    } else {
                                      alert(d.error || 'Verification failed')
                                    }
                                  } catch {
                                    alert('Verification failed')
                                  } finally {
                                    setManualVerifying(false)
                                  }
                                }}
                                className="px-3 py-2 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20 font-pixel-alt text-xs disabled:opacity-50"
                                style={{ fontFamily: 'var(--font-pixel-alt)' }}
                              >
                                {manualVerifying ? 'Verifying...' : 'Verify'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-purple-muted pt-2 font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                    See{' '}
                    <Link href="/docs/features" className="text-[#ff00ff] hover:text-[#00ff00] underline">
                      Features &amp; Tiers
                    </Link>
                    {' '}for details.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-[#660099]/30">
              <button
                type="button"
                onClick={() => setNotifySectionOpen(!notifySectionOpen)}
                className="w-full flex items-center justify-between text-left font-pixel-alt text-[#00ff00] hover:bg-[#660099]/20 transition-colors p-2 rounded"
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                <span>Notification preferences (email, phone, push)</span>
                <span className="text-purple-readable">{notifySectionOpen ? '▼' : '▶'}</span>
              </button>
              {notifySectionOpen && (
                <div className="pt-3">
                  <NotificationPreferences
                    walletAddress={walletAddress}
                    initialEmail={profileData?.profile?.notify_email}
                    initialPhone={profileData?.profile?.notify_phone}
                    hasPushSubscription={!!profileData?.profile?.notify_push_subscription}
                    onSaved={loadProfile}
                  />
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-[#660099]/30">
              <button
                type="button"
                onClick={() => setSocialsSectionOpen(!socialsSectionOpen)}
                className="w-full flex items-center justify-between text-left font-pixel-alt text-[#00ff00] hover:bg-[#660099]/20 transition-colors p-2 rounded"
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                <span>Socials & banner (for token metadata)</span>
                <span className="text-purple-readable">{socialsSectionOpen ? '▼' : '▶'}</span>
              </button>
              {socialsSectionOpen && (
                <div className="pt-3 space-y-4">
                  <ProfileSocialsBanner
                    walletAddress={walletAddress}
                    initialValue={profileData?.profile ?? null}
                    onSaved={loadProfile}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My Listings */}
        <section className="mb-6">
          <h2 className="text-xl font-pixel text-[#00ff00] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
            My Listings
          </h2>
          {loading ? (
            <p className="text-purple-readable font-pixel-alt text-sm">Loading...</p>
          ) : listings.length === 0 ? (
            <p className="text-purple-readable font-pixel-alt text-sm mb-4">No listings yet.</p>
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

        {/* Escrows hidden until program launch */}

        {/* Bids */}
        <section className="mb-6">
          <h2 className="text-xl font-pixel text-[#00ff00] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
            My Bids
          </h2>
          {loading ? (
            <p className="text-purple-readable font-pixel-alt text-sm">Loading...</p>
          ) : bids.length === 0 ? (
            <p className="text-purple-readable font-pixel-alt text-sm mb-4">No bids yet.</p>
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
            <p className="text-purple-readable font-pixel-alt text-sm">Loading...</p>
          ) : purchases.length === 0 ? (
            <p className="text-purple-readable font-pixel-alt text-sm mb-4">No purchases yet.</p>
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
                      hasProtection={p.has_protection}
                      claimStatus={p.claim_status}
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
            <p className="text-purple-readable font-pixel-alt text-sm">Loading...</p>
          ) : (() => {
            const withTracking = purchases.filter(
              (p: (typeof purchases)[0]) => p.tracking_number && String(p.tracking_number).trim()
            )
            return withTracking.length === 0 ? (
              <p className="text-purple-readable font-pixel-alt text-sm mb-4">
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
                          {p.title} • {p.price} {formatPriceToken(p.price_token, (p as { token_symbol?: string | null }).token_symbol)}
                        </span>
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-purple-readable font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
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

        {/* Delivery address — optional, collapsible */}
        <section className="mb-6 border-2 border-[#660099] bg-black/30">
          <button
            type="button"
            onClick={() => setDeliverySectionOpen(!deliverySectionOpen)}
            className="w-full flex items-center justify-between p-3 sm:p-4 text-left font-pixel-alt text-[#00ff00] hover:bg-[#660099]/20 transition-colors"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            <span>Delivery address (optional)</span>
            <span className="text-purple-readable">{deliverySectionOpen ? '▼' : '▶'}</span>
          </button>
          {deliverySectionOpen && (
            <div className="p-3 sm:p-4 pt-0 border-t border-[#660099]/30 space-y-4 max-w-xl">
              <p className="text-purple-muted font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Save your address on this device (encrypted) to auto-fill when buying. Stored only here — clearing site data removes it.
              </p>
              <LocalShippingAddressForm />
              <ShippingAddressGuidance />
            </div>
          )}
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
