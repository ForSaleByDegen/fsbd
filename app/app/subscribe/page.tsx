'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { SUBSCRIPTION_TIERS } from '@/lib/tier-check'

const TIER_ORDER = ['basic', 'bronze', 'silver', 'gold'] as const

export default function SubscribePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-pixel text-[#660099] mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
          Seller Subscription
        </h1>
        <p className="text-[#aa77ee] font-pixel-alt text-sm sm:text-base mb-6" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Everyone gets 1 free listing. For more, hold $FSBD (2–10 by tier) or subscribe below—4 tiers like token holders: 2, 10, 30, 100 listings.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {TIER_ORDER.map((key) => {
            const t = SUBSCRIPTION_TIERS[key]
            return (
              <div
                key={key}
                className="p-4 sm:p-5 border-2 border-[#660099] bg-black/50 hover:border-[#00ff00]/60 transition-colors"
              >
                <h3 className="text-lg font-pixel text-[#00ff00] capitalize mb-1" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {key}
                </h3>
                <p className="text-2xl font-pixel text-[#660099] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                  ${t.priceUsd.toFixed(2)}/mo
                </p>
                <p className="text-[#aa77ee] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  {t.listings} active listings
                </p>
              </div>
            )
          })}
        </div>

        <div className="p-3 border border-[#00ff00]/50 bg-[#00ff00]/5">
          <p className="text-[#00ff00] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Stripe subscription coming soon. For now, hold $FSBD to unlock more listings (first 100 users get 99 each).
          </p>
        </div>
        <Link
          href="/tiers"
          className="inline-block mt-4 px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt text-sm transition-colors"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          View token tier requirements
        </Link>
      </main>
      <Footer />
    </div>
  )
}
