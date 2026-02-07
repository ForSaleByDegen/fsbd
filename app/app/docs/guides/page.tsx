'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-[#00ff00] mb-6" style={{ fontFamily: 'var(--font-pixel)' }}>
          Buyer & Seller Guides
        </h1>

        <div className="space-y-8 font-pixel-alt text-sm sm:text-base text-purple-muted" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {/* Platform disclaimer */}
          <section className="p-4 border-2 border-amber-600/60 bg-amber-950/20 rounded">
            <h2 className="text-base font-pixel text-amber-400 mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
              ⚠️ Platform disclaimer
            </h2>
            <p>
              $FSBD is a decentralized peer-to-peer marketplace. We provide the interface and listing discovery.
              All transactions occur directly between buyer and seller—we do not hold funds, act as escrow, or guarantee delivery, authenticity, or condition of items.
              Use at your own risk. See our{' '}
              <Link href="/terms" className="text-[#ff00ff] hover:text-[#00ff00] underline">Terms of Service</Link> for full details.
            </p>
          </section>

          {/* Buyer guide */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Buyer guide
            </h2>
            <div className="space-y-3">
              <p>
                <strong className="text-[#00ff00]">What to expect:</strong> You send payment (SOL, USDC, or listing token) directly to the seller. Shipping and delivery are coordinated via private chat.
              </p>
              <p>
                <strong className="text-[#00ff00]">Verified sellers:</strong> Listings imported from Amazon, eBay, or Etsy show whether the seller has verified ownership. Look for the ✓ Verified Seller badge for added confidence.
              </p>
              <p>
                <strong className="text-[#00ff00]">Before buying:</strong> Check the seller&apos;s profile and feedback. Use the encrypted chat to ask questions, confirm shipping details, and share your address securely.
              </p>
              <p>
                <strong className="text-[#00ff00]">After payment:</strong> Sellers add tracking via their profile. You can confirm receipt once the item arrives—this helps build trust.
              </p>
              <p>
                <strong className="text-[#00ff00]">Imported listings:</strong> Some listings are pulled from external sites. We cannot guarantee the seller owns that external listing unless they have a verified badge. Links to external sites may be affiliate links.
              </p>
            </div>
          </section>

          {/* Seller guide */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Seller guide
            </h2>
            <div className="space-y-3">
              <p>
                <strong className="text-[#00ff00]">Listing limits:</strong> Free users get 1 listing. Hold $FSBD or subscribe for more. Early adopters (first 100 users) get 99 free listings. See{' '}
                <Link href="/docs/features" className="text-[#ff00ff] hover:text-[#00ff00] underline">Features &amp; Tiers</Link>.
              </p>
              <p>
                <strong className="text-[#00ff00]">Import from URL:</strong> Paste a link from Amazon, eBay, or Etsy to prefill title, description, price, image, and category. Review the preview and edit before publishing.
              </p>
              <p>
                <strong className="text-[#00ff00]">Verified seller badge:</strong> Prove you own your external listings by verifying via eBay/Etsy OAuth or our manual process (QR code in listing image). Verified sellers get a badge and build more trust.
              </p>
              <p>
                <strong className="text-[#00ff00]">Shipping:</strong> After sale, add tracking from your profile. Buyers can confirm receipt—this improves your seller stats.
              </p>
              <p>
                <strong className="text-[#00ff00]">Tokens:</strong> You can launch a token with your listing or add a token to an existing listing. Token-gated chat lets holders engage with your community.
              </p>
            </div>
          </section>

          {/* Links */}
          <section className="pt-4 border-t border-[#660099]/50">
            <div className="flex flex-wrap gap-3">
              <Link href="/docs/features" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Features &amp; Tiers
              </Link>
              <Link href="/docs/help" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                FAQ &amp; Help
              </Link>
              <Link href="/docs/whitepaper" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Whitepaper
              </Link>
              <Link href="/terms" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Terms of Service
              </Link>
              <Link href="/privacy" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Privacy Policy
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
