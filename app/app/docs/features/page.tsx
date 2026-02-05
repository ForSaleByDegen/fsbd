'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import {
  TIER_THRESHOLDS,
  SUBSCRIPTION_TIERS,
  EARLY_ADOPTER_LISTING_LIMIT,
  getMaxListingsForTier,
  getMaxImagesForTier,
  calculateListingFee,
} from '@/lib/tier-check'

const FORMAT_TOKEN = (n: number) => n >= 1_000_000 ? `${n / 1_000_000}M` : n >= 1_000 ? `${n / 1_000}k` : String(n)

export default function FeaturesDocsPage() {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-[#00ff00] mb-6" style={{ fontFamily: 'var(--font-pixel)' }}>
          Features & Tiers Guide
        </h1>

        <div className="space-y-8 font-pixel-alt text-sm sm:text-base text-[#aa77ee]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {/* Tiers */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              $FSBD Token Tiers
            </h2>
            <p className="mb-4">
              Hold $FSBD to unlock benefits. Your tier is determined by your on-chain balance—no signup, fully private.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-[#660099]">
                <thead>
                  <tr className="bg-[#660099]/20">
                    <th className="border border-[#660099] p-2 text-left">Tier</th>
                    <th className="border border-[#660099] p-2 text-left">Min $FSBD</th>
                    <th className="border border-[#660099] p-2 text-left">Listings</th>
                    <th className="border border-[#660099] p-2 text-left">Images/Listing</th>
                    <th className="border border-[#660099] p-2 text-left">Token Launch Fee</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-[#660099] p-2">Free</td><td className="border border-[#660099] p-2">—</td><td className="border border-[#660099] p-2">1</td><td className="border border-[#660099] p-2">{getMaxImagesForTier('free')}</td><td className="border border-[#660099] p-2">{calculateListingFee('free')} SOL</td></tr>
                  <tr><td className="border border-[#660099] p-2">Bronze</td><td className="border border-[#660099] p-2">{FORMAT_TOKEN(TIER_THRESHOLDS.bronze)}</td><td className="border border-[#660099] p-2">{getMaxListingsForTier('bronze')}</td><td className="border border-[#660099] p-2">{getMaxImagesForTier('bronze')}</td><td className="border border-[#660099] p-2">{calculateListingFee('bronze')} SOL</td></tr>
                  <tr><td className="border border-[#660099] p-2">Silver</td><td className="border border-[#660099] p-2">{FORMAT_TOKEN(TIER_THRESHOLDS.silver)}</td><td className="border border-[#660099] p-2">{getMaxListingsForTier('silver')}</td><td className="border border-[#660099] p-2">{getMaxImagesForTier('silver')}</td><td className="border border-[#660099] p-2">{calculateListingFee('silver')} SOL</td></tr>
                  <tr><td className="border border-[#660099] p-2">Gold</td><td className="border border-[#660099] p-2">{FORMAT_TOKEN(TIER_THRESHOLDS.gold)}</td><td className="border border-[#660099] p-2">{getMaxListingsForTier('gold')}</td><td className="border border-[#660099] p-2">{getMaxImagesForTier('gold')}</td><td className="border border-[#660099] p-2">{calculateListingFee('gold')} SOL</td></tr>
                  <tr><td className="border border-[#660099] p-2">Platinum</td><td className="border border-[#660099] p-2">{FORMAT_TOKEN(TIER_THRESHOLDS.platinum)}</td><td className="border border-[#660099] p-2">{getMaxListingsForTier('platinum')}</td><td className="border border-[#660099] p-2">{getMaxImagesForTier('platinum')}</td><td className="border border-[#660099] p-2">{calculateListingFee('platinum')} SOL</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[#aa77ee]/80">
              Gold+ can create auctions. Bronze+ get socials & banner in token metadata when launching.
            </p>
          </section>

          {/* Early Adopters */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Early Adopters
            </h2>
            <p>
              The first {100} users (by signup) get up to {EARLY_ADOPTER_LISTING_LIMIT} free listings each, regardless of tier or subscription.
            </p>
          </section>

          {/* Subscription */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Subscription Tiers
            </h2>
            <p className="mb-4">
              Don&apos;t hold $FSBD? Subscribe for more listings. Same structure: 2, 10, 30, 100 listings.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(['basic', 'bronze', 'silver', 'gold'] as const).map((key) => (
                <div key={key} className="p-3 border border-[#660099] bg-black/50">
                  <span className="capitalize text-[#00ff00]">{key}</span>: {SUBSCRIPTION_TIERS[key].listings} listings — ${SUBSCRIPTION_TIERS[key].priceUsd}/mo
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs">
              <Link href="/subscribe" className="text-[#ff00ff] hover:text-[#00ff00] underline">Subscribe page</Link> — Stripe coming soon.
            </p>
          </section>

          {/* Import from URL */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Import from Product URL
            </h2>
            <p>
              Paste a link from Amazon, eBay, Etsy, or similar. We pull title, description, price, image, and suggest category/subcategory. 
              Review the preview, toggle what to use, then apply. Price currency defaults to USDC for imported listings (you can change it).
            </p>
          </section>

          {/* Verified Seller */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Verified Seller Badge
            </h2>
            <p className="mb-3">
              Listings imported from external sites show a disclaimer: we can&apos;t guarantee the seller owns that listing. 
              <strong className="text-[#00ff00]"> Verified sellers</strong> have completed our verification process to prove ownership.
            </p>
            <p className="mb-3">
              Verification is done via our unique process—OAuth (eBay, Etsy) or manual verification (code in listing image). 
              Admins can also manually verify sellers. Once verified, your listings show a ✓ Verified Seller badge.
            </p>
            <p>
              See <Link href="/profile" className="text-[#ff00ff] hover:text-[#00ff00] underline">Profile</Link> → Verify your seller profile for your status.
            </p>
          </section>

          {/* Token Launch */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Token Launch for Listings
            </h2>
            <p>
              Launch a fun token on pump.fun alongside your listing. The token links to your listing page and can be used for token-gated chat. 
              Fee depends on tier (see table). You can also add a token to an <strong>existing</strong> listing from the listing page (seller only).
            </p>
          </section>

          {/* Chat */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Chat
            </h2>
            <p>
              <strong>Private chat</strong>: Encrypted between buyer and seller. Supports text and images. <br />
              <strong>Public / token-gated chat</strong>: Community discussion. Sellers can require holders to hold a minimum amount of the listing token to post. Supports images.
            </p>
          </section>

          {/* Payment */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Payment (Degen — Direct)
            </h2>
            <p>
              Buyers send SOL or USDC <strong>directly to the seller</strong>. No escrow (yet). Coordinate shipping via chat. 
              We don&apos;t stand by any item&apos;s authenticity. Price can be in SOL, USDC, or the listing&apos;s own token.
            </p>
          </section>

          {/* Rate Limiting */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Rate Limiting
            </h2>
            <p>
              API endpoints are rate limited per IP to prevent abuse (e.g. Import from URL, image upload, listing creation, balance checks). 
              If you hit a limit, wait a minute and try again.
            </p>
          </section>

          {/* Links */}
          <section className="pt-4 border-t border-[#660099]/50">
            <div className="flex flex-wrap gap-3">
              <Link href="/tiers" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                View Tiers
              </Link>
              <Link href="/subscribe" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Subscribe
              </Link>
              <Link href="/profile" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Profile
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
