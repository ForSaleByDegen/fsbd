'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function WhitepaperPage() {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-[#00ff00] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
          $FSBD Whitepaper
        </h1>
        <p className="text-sm text-[#660099] font-pixel-alt mb-8" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          For Sale By Degen — Decentralized P2P Marketplace on Solana
        </p>

        <div className="space-y-10 font-pixel-alt text-sm sm:text-base text-[#aa77ee] leading-relaxed" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              1. Abstract
            </h2>
            <p>
              For Sale By Degen ($FSBD) is a decentralized peer-to-peer marketplace built on Solana. It combines 
              Craigslist-style classifieds with crypto-native payments, optional escrow, and tiered access driven by 
              $FSBD token holdings. No email signup, no KYC—your wallet is your identity.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              2. Vision & Problem
            </h2>
            <p className="mb-3">
              Existing classifieds (Craigslist, Facebook Marketplace) rely on cash, Venmo, or bank transfers. They 
              require accounts, lack crypto support, and centralize trust. FSBD targets users who already live in 
              crypto: pay with SOL, USDC, or listing-specific tokens; no middleman holds funds; optional escrow and 
              buyer protection add trust where desired.
            </p>
            <p>
              FSBD is not an auction house or DEX. It is a listing directory with integrated chat, payments, and 
              optional protections—built for the Solana ecosystem.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              3. Architecture
            </h2>
            <h3 className="text-base font-pixel text-[#00ff00] mt-4 mb-2">3.1 Stack</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Chain:</strong> Solana — low fees, fast finality</li>
              <li><strong>Payments:</strong> SOL, USDC, SPL tokens (including listing-specific tokens)</li>
              <li><strong>Storage:</strong> IPFS for images; Supabase (PostgreSQL) for listings, chat, profiles</li>
              <li><strong>Auth:</strong> Wallet connect (Phantom, Solflare, etc.) — message signing only</li>
            </ul>
            <h3 className="text-base font-pixel text-[#00ff00] mt-4 mb-2">3.2 Privacy</h3>
            <p>
              Wallet addresses are hashed before storage. Shipping addresses are shared via encrypted chat, not 
              stored. No analytics, no tracking. Tier checks use on-chain balance—no data leaves the chain.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              4. Payment Flows
            </h2>
            <h3 className="text-base font-pixel text-[#00ff00] mt-4 mb-2">4.1 Direct (Degen)</h3>
            <p>
              Buyer sends payment directly to the seller. No escrow. Fast and simple. No buyer protection—for 
              protection, use escrow.
            </p>
            <h3 className="text-base font-pixel text-[#00ff00] mt-4 mb-2">4.2 Escrow</h3>
            <p>
              Both parties agree to escrow in chat. Buyer deposits funds (sale amount + optional 5% insurance). 
              Funds held until seller ships and buyer confirms receipt. Optional buyer protection: 5% fee, coverage 
              cap (e.g. $100) per claim. Release/refund require 2-of-3 multisig (buyer, seller, arbiter/admin).
            </p>
            <h3 className="text-base font-pixel text-[#00ff00] mt-4 mb-2">4.3 Auctions</h3>
            <p>
              Gold+ tier can create auctions. Bids held in escrow; winner pays, non-winners refunded. Same escrow 
              logic as fixed-price sales.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              5. $FSBD Token & Tiers
            </h2>
            <p className="mb-3">
              $FSBD is a utility token on Solana. Holding it unlocks tiers: more listings, fewer fees, auction 
              creation, socials in token metadata. No governance token—purely utility. Tiers are checked on-chain; 
              no signup required.
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Free:</strong> 1 listing, standard fees</li>
              <li><strong>Bronze+:</strong> More listings, fee discounts, verified seller socials</li>
              <li><strong>Gold+:</strong> Auctions, priority visibility</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              6. Listing Tokens
            </h2>
            <p>
              Sellers can launch a token per listing (e.g. on pump.fun). Tokens represent the item, shop, or brand. 
              Token-gated chat lets holders engage. Pricing can be in SOL, USDC, or listing token. This creates 
              Etsy-style shops with mini-economies.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              7. Safety Model
            </h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Verified Sellers:</strong> OAuth or manual verification ties external listings (eBay, Etsy, etc.) to the wallet</li>
              <li><strong>7-Day Escrow Deadline:</strong> Sellers must add tracking within 7 days of deposit or face dispute/ban</li>
              <li><strong>Buyer Protection:</strong> Escrow only — optional 5% fee; claims reviewed, payout from pool</li>
              <li><strong>Seller Ban:</strong> Non-shippers (past 7-day deadline) banned from creating new listings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              8. Disclaimers
            </h2>
            <p>
              FSBD is a decentralized platform. We provide the interface and infrastructure; we do not hold funds, 
              guarantee items, or resolve disputes as a binding arbiter. Use at your own risk. $FSBD is a utility 
              token only—not an investment. See our{' '}
              <Link href="/terms" className="text-[#ff00ff] hover:text-[#00ff00] underline">Terms of Service</Link> for full disclaimers.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              9. Roadmap
            </h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>✓ Listings, chat, direct payments, escrow (PDA placeholder)</li>
              <li>✓ Buyer protection (optional fee + claims)</li>
              <li>✓ Token launch (pump.fun integration)</li>
              <li>✓ Auctions</li>
              <li>⏳ Anchor escrow program deployment</li>
              <li>⏳ Automated release/refund (2-of-3 multisig)</li>
            </ul>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-[#660099]/50 flex flex-wrap gap-3">
          <Link href="/docs/guides" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm">
            Buyer & Seller Guides
          </Link>
          <Link href="/docs/features" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm">
            Features & Tiers
          </Link>
          <Link href="/docs/help" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm">
            FAQ & Help
          </Link>
          <Link href="/terms" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm">
            Terms of Service
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
