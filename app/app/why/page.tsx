'use client'

import Header from '@/components/Header'
import DisclaimerBanner from '@/components/DisclaimerBanner'
import Link from 'next/link'
import Footer from '@/components/Footer'

export default function WhyFsbdPage() {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full relative z-10">
        <DisclaimerBanner />
        
        <div className="pixel-box bg-black border-2 sm:border-4 border-[#660099] p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-pixel text-[#00ff00] mb-4 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
            Why $FSBD?
          </h1>
          
          <p className="text-[#660099] font-pixel-alt text-sm mb-6" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Other classifieds and marketplaces work. But if you already live in crypto, why not one built for you?
          </p>

          <div className="space-y-6 font-pixel-alt text-sm">
            <section>
              <h2 className="text-lg font-pixel text-[#ff00ff] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                Crypto-native payments
              </h2>
              <p className="text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Pay with SOL or USDC. No Venmo holds, no cash meets, no checks in the mail. The transaction settles on-chain and you keep full control.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-pixel text-[#ff00ff] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                Wallet = identity. No signup.
              </h2>
              <p className="text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Connect your Phantom, Solflare, or any Solana wallet. No email, no password, no account to create or forget. Your wallet is your profile.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-pixel text-[#ff00ff] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                Privacy-first
              </h2>
              <p className="text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                We don&apos;t store shipping addresses. Share them with the seller via encrypted chat. Use General Delivery or a PO Box to keep your home address off the grid entirely.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-pixel text-[#ff00ff] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                Honor system + seller stats
              </h2>
              <p className="text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Buyers confirm receipt. Sellers get ratings and feedback. Public seller profiles show confirmed deliveries and reviews so you can trade with more confidence.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-pixel text-[#ff00ff] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                Free listings, optional escrow
              </h2>
              <p className="text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Basic listings are free (message signing only). Optional escrow is between you and the other party—we&apos;re not in the middle. Keep it simple or add protection when you want it.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-pixel text-[#ff00ff] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                Decentralized, not gatekept
              </h2>
              <p className="text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                We run the frontend and infra. Listings and transactions live on Solana and IPFS. No single company can lock you out or change the rules on a whim.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t-2 border-[#660099]">
            <Link 
              href="/" 
              className="inline-block text-[#ff00ff] font-pixel-alt text-sm hover:text-[#00ff00] transition-colors underline"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              ← Back to Browse
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
