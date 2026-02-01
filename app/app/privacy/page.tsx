'use client'

import Header from '@/components/Header'
import DisclaimerBanner from '@/components/DisclaimerBanner'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full relative z-10">
        <DisclaimerBanner />
        
        <div className="pixel-box bg-black border-2 sm:border-4 border-[#660099] p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 relative z-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-[#00ff00] mb-4 sm:mb-6 break-words">
            Privacy Policy
          </h1>
          
          <div className="text-[#00ff00] text-sm sm:text-base space-y-4 sm:space-y-6 font-pixel-alt">
            <p className="text-xs text-[#660099] mb-4">
              Last Updated: {new Date().toLocaleDateString()}
            </p>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">1. Introduction</h2>
              <p>
                Welcome to $FSBD ("For Sale By Degen"), a decentralized marketplace built on the Solana blockchain. 
                This Privacy Policy explains how we handle information in our decentralized platform. By using our 
                service, you agree to this policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">2. Decentralized Nature</h2>
              <p>
                $FSBD is a decentralized application (dApp) that operates on the Solana blockchain. We do not 
                control, store, or have access to your private keys, wallet addresses, or personal information 
                stored on-chain. Transactions occur directly between users on the blockchain.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">3. Information We Collect</h2>
              <h3 className="text-base font-pixel text-[#ff00ff] mb-2 mt-3">3.1 On-Chain Data</h3>
              <p>
                All transactions, listings, and interactions are recorded on the Solana blockchain, which is 
                publicly accessible. This includes wallet addresses, transaction hashes, and listing data.
              </p>
              
              <h3 className="text-base font-pixel text-[#ff00ff] mb-2 mt-3">3.2 Off-Chain Data</h3>
              <p>
                We do NOT collect or store shipping addresses, physical addresses, or delivery information. 
                Address exchange happens directly between users via encrypted chat; we never have access to 
                decrypted addresses.
              </p>
              <p className="mt-2">
                We may store the following information in our database:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Hashed wallet addresses (for user identification)</li>
                <li>Listing metadata (titles, descriptions, images stored on IPFS)</li>
                <li>User profile statistics (listing counts, fees paid)</li>
                <li>Email addresses (if provided via Privy authentication)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">4. How We Use Information</h2>
              <p>We use collected information to:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Provide marketplace functionality</li>
                <li>Display listings and user profiles</li>
                <li>Calculate tier-based fees (if applicable)</li>
                <li>Prevent fraud and abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">5. Third-Party Services</h2>
              <p>We use the following third-party services:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Supabase:</strong> Database and authentication services</li>
                <li><strong>Pinata:</strong> IPFS storage for images</li>
                <li><strong>Privy:</strong> Social/email wallet authentication (optional)</li>
                <li><strong>Solana RPC:</strong> Blockchain interaction</li>
              </ul>
              <p className="mt-3">
                These services have their own privacy policies. We are not responsible for their data practices.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">6. Wallet Security</h2>
              <p>
                <strong className="text-[#ff0000]">CRITICAL:</strong> We never have access to your private keys 
                or seed phrases. You are solely responsible for securing your wallet. Never share your private 
                keys or seed phrases with anyone, including us.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">7. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Access your stored data</li>
                <li>Request deletion of off-chain data (on-chain data cannot be deleted)</li>
                <li>Opt-out of optional features (like Privy authentication)</li>
                <li>Disconnect your wallet at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">8. Data Retention</h2>
              <p>
                On-chain data is permanent and cannot be deleted. Off-chain data (database records) may be 
                retained for legal compliance and platform functionality. You may request deletion of your 
                profile data, but transaction history on-chain will remain.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">9. Children's Privacy</h2>
              <p>
                Our service is not intended for users under 18 years of age. We do not knowingly collect 
                information from children.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy. Changes will be posted on this page with an updated 
                "Last Updated" date. Continued use of the service constitutes acceptance of changes.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">11. Contact</h2>
              <p>
                For privacy-related questions, contact us through the platform or at the contact information 
                provided in our Terms of Service.
              </p>
            </section>
          </div>

          <div className="mt-6 pt-4 border-t border-[#660099]/30">
            <Link 
              href="/terms" 
              className="text-[#00ff00] hover:text-[#ff00ff] underline text-sm sm:text-base"
            >
              ← Back to Terms of Service
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
