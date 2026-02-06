'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function HelpDocsPage() {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-[#00ff00] mb-6" style={{ fontFamily: 'var(--font-pixel)' }}>
          FAQ, Common Issues & Safety
        </h1>

        <div className="space-y-10 font-pixel-alt text-sm sm:text-base text-[#aa77ee]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {/* FAQ */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <div className="p-4 border border-[#660099]/50 rounded bg-black/30">
                <h3 className="font-pixel text-[#00ff00] mb-2 text-sm">Do I need to create an account?</h3>
                <p>No. Connect your Solana wallet (Phantom, Solflare, etc.). Your wallet is your identity. No email, no password.</p>
              </div>
              <div className="p-4 border border-[#660099]/50 rounded bg-black/30">
                <h3 className="font-pixel text-[#00ff00] mb-2 text-sm">What can I pay with?</h3>
                <p>SOL, USDC, or the listing&apos;s custom token (if the seller launched one). Payments go directly to the seller unless you use escrow.</p>
              </div>
              <div className="p-4 border border-[#660099]/50 rounded bg-black/30">
                <h3 className="font-pixel text-[#00ff00] mb-2 text-sm">What is buyer protection?</h3>
                <p>Buyer protection is available only when using escrow. You pay a 5% fee at deposit; if the item isn&apos;t received or isn&apos;t as described, you can file a claim for reimbursement (up to a cap). Claims are reviewed by the platform. Direct (Degen) payments have no protection.</p>
              </div>
              <div className="p-4 border border-[#660099]/50 rounded bg-black/30">
                <h3 className="font-pixel text-[#00ff00] mb-2 text-sm">What is escrow?</h3>
                <p>Both parties agree in chat. The buyer deposits funds, which are held until the seller ships and the buyer confirms receipt. Funds are released to the seller (or refunded if there&apos;s a dispute). Release/refund require admin approval.</p>
              </div>
              <div className="p-4 border border-[#660099]/50 rounded bg-black/30">
                <h3 className="font-pixel text-[#00ff00] mb-2 text-sm">What does the Verified Seller badge mean?</h3>
                <p>Verified sellers have proven ownership of external listings (e.g. eBay, Etsy). Look for the ✓ badge for added confidence when buying imported listings.</p>
              </div>
              <div className="p-4 border border-[#660099]/50 rounded bg-black/30">
                <h3 className="font-pixel text-[#00ff00] mb-2 text-sm">How do I get more listings?</h3>
                <p>Hold $FSBD tokens to unlock tiers, or subscribe. Early adopters (first 100 users) get 99 free listings. See <Link href="/docs/features" className="text-[#ff00ff] hover:text-[#00ff00] underline">Features & Tiers</Link>.</p>
              </div>
            </div>
          </section>

          {/* Common Issues */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
              Common Issues & Fixes
            </h2>
            <div className="space-y-4">
              <div className="p-4 border border-amber-600/40 rounded bg-amber-950/10">
                <h3 className="font-pixel text-amber-400 mb-2 text-sm">&quot;0.0000 SOL&quot; or wrong balance when I have SOL</h3>
                <p><strong>Cause:</strong> Network mismatch. The app might be on devnet while your wallet shows mainnet (or vice versa).</p>
                <p className="mt-2"><strong>Fix:</strong> Ensure your wallet network matches the app (mainnet vs devnet). If on devnet, get free SOL from <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="text-[#ff00ff] hover:text-[#00ff00] underline">faucet.solana.com</a>.</p>
              </div>
              <div className="p-4 border border-amber-600/40 rounded bg-amber-950/10">
                <h3 className="font-pixel text-amber-400 mb-2 text-sm">Transaction fails with &quot;BigInt&quot; or &quot;not an integer&quot; error</h3>
                <p><strong>Cause:</strong> Floating-point precision in fee/amount calculations.</p>
                <p className="mt-2"><strong>Fix:</strong> Try a slightly different amount (e.g. 0.02 instead of 0.0200001), or refresh and retry. Report if it persists.</p>
              </div>
              <div className="p-4 border border-amber-600/40 rounded bg-amber-950/10">
                <h3 className="font-pixel text-amber-400 mb-2 text-sm">Wallet won&apos;t connect / &quot;No wallet detected&quot;</h3>
                <p><strong>Cause:</strong> In PWA or mobile, wallet extensions may not inject. Phantom/Solflare need to be installed and enabled.</p>
                <p className="mt-2"><strong>Fix:</strong> Open fsbd.fun in a regular browser tab (not PWA). On mobile, open inside Phantom&apos;s in-app browser so the wallet is available.</p>
              </div>
              <div className="p-4 border border-amber-600/40 rounded bg-amber-950/10">
                <h3 className="font-pixel text-amber-400 mb-2 text-sm">Chat stuck on &quot;Loading chat...&quot;</h3>
                <p><strong>Cause:</strong> Backend/chat service may be unavailable or not configured.</p>
                <p className="mt-2"><strong>Fix:</strong> Refresh the page. If it persists, try again later. Coordinate with the other party via another channel if urgent.</p>
              </div>
              <div className="p-4 border border-amber-600/40 rounded bg-amber-950/10">
                <h3 className="font-pixel text-amber-400 mb-2 text-sm">Phantom shows &quot;This dApp could be malicious&quot;</h3>
                <p><strong>Cause:</strong> Phantom flags unverified domains. FSBD is a legitimate marketplace.</p>
                <p className="mt-2"><strong>Fix:</strong> You can proceed—review the transaction before signing. Domain verification is in progress with Phantom.</p>
              </div>
              <div className="p-4 border border-amber-600/40 rounded bg-amber-950/10">
                <h3 className="font-pixel text-amber-400 mb-2 text-sm">iCloud Private Relay warning on iPhone/iPad</h3>
                <p><strong>Cause:</strong> Apple&apos;s Private Relay sometimes fails to anonymize connections to certain sites.</p>
                <p className="mt-2"><strong>Fix:</strong> Tap &quot;Show IP Address&quot; to proceed. The site is safe; only that visit won&apos;t use Private Relay.</p>
              </div>
            </div>
          </section>

          {/* Safety Practices */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
              Good Safety Practices
            </h2>
            <div className="p-4 border-2 border-[#00ff00]/40 rounded bg-[#00ff00]/5">
              <h3 className="font-pixel text-[#00ff00] mb-3 text-sm">For Buyers</h3>
              <ul className="list-disc list-inside space-y-2 text-[#aa77ee]">
                <li>Check seller profile: confirmed deliveries, rating, feedback</li>
                <li>Prefer <strong>Verified Sellers</strong> for imported (eBay/Etsy) listings</li>
                <li>Use chat to confirm item details, shipping, and price before paying</li>
                <li>Consider <strong>escrow</strong> for high-value items—funds held until you confirm receipt</li>
                <li>Use <strong>escrow with buyer protection</strong> (5%) for reimbursement if item not received or not as described—direct payments have no protection</li>
                <li>Never send payment outside the platform before receiving the item</li>
                <li>Verify transaction details (amount, recipient) in your wallet before signing</li>
              </ul>
            </div>
            <div className="p-4 border-2 border-[#00ff00]/40 rounded bg-[#00ff00]/5 mt-4">
              <h3 className="font-pixel text-[#00ff00] mb-3 text-sm">For Sellers</h3>
              <ul className="list-disc list-inside space-y-2 text-[#aa77ee]">
                <li>Ship within <strong>7 days</strong> of escrow deposit—add tracking to avoid dispute/ban</li>
                <li>Use accurate descriptions and photos; misrepresentation can lead to claims</li>
                <li>Verify payment on-chain before shipping (check your wallet)</li>
                <li>Get the buyer&apos;s shipping address via encrypted chat—never assume</li>
                <li>Consider local pickup for high-value or bulky items</li>
                <li>Keep records of tracking and delivery confirmation</li>
              </ul>
            </div>
            <div className="p-4 border-2 border-amber-600/60 rounded bg-amber-950/20 mt-4">
              <h3 className="font-pixel text-amber-400 mb-3 text-sm">General</h3>
              <ul className="list-disc list-inside space-y-2 text-[#aa77ee]">
                <li>Never share your seed phrase or private keys—FSBD will never ask for them</li>
                <li>Review every transaction in your wallet before signing</li>
                <li>Use a dedicated wallet for marketplace activity if you prefer separation</li>
                <li>FSBD is decentralized—we don&apos;t hold funds or guarantee delivery; use escrow and protection when possible</li>
              </ul>
            </div>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-[#660099]/50 flex flex-wrap gap-3">
          <Link href="/docs/guides" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm">
            Buyer & Seller Guides
          </Link>
          <Link href="/docs/features" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm">
            Features & Tiers
          </Link>
          <Link href="/docs/whitepaper" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm">
            Whitepaper
          </Link>
          <Link href="/report" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm">
            Bug Report
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
