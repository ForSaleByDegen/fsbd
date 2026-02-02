'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full relative z-10">
        
        <div className="pixel-box bg-black border-2 sm:border-4 border-[#660099] p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 relative z-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-[#00ff00] mb-4 sm:mb-6 break-words">
            Terms of Service
          </h1>
          
          <div className="text-[#00ff00] text-sm sm:text-base space-y-4 sm:space-y-6 font-pixel-alt">
            <p className="text-xs text-[#660099] mb-4">
              Last Updated: {new Date().toLocaleDateString()}
            </p>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using $FSBD ("For Sale By Degen"), a decentralized marketplace built on the 
                Solana blockchain, you agree to be bound by these Terms of Service ("Terms"). If you do not 
                agree to these Terms, do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">2. Description of Service</h2>
              <p>
                $FSBD is a decentralized peer-to-peer marketplace where users can list, buy, and sell items 
                using cryptocurrency (SOL, USDC, or custom tokens). The platform operates on the Solana 
                blockchain for peer-to-peer transactions.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">3. Eligibility</h2>
              <p>You must:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Be at least 18 years old</li>
                <li>Have legal capacity to enter into contracts</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Not be located in a jurisdiction where cryptocurrency trading is prohibited</li>
                <li>Use a compatible Solana wallet</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">4. Decentralized Platform Disclaimer</h2>
              <p className="text-[#ff0000] font-bold mb-3">
                ⚠️ IMPORTANT: $FSBD IS A DECENTRALIZED PLATFORM. WE ARE NOT A PARTY TO ANY TRANSACTIONS.
              </p>
              <p>
                $FSBD operates as a decentralized application (dApp) on the Solana blockchain. We provide 
                the interface and infrastructure, but all transactions occur directly between users on the 
                blockchain. We do not:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Hold, control, or escrow funds</li>
                <li>Act as an intermediary in transactions</li>
                <li>Guarantee the quality, safety, or legality of listed items</li>
                <li>Verify the identity of users</li>
                <li>Provide refunds or dispute resolution</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">4a. NO GUARANTEE OF CONDITION, AUTHENTICITY, OR DELIVERY</h2>
              <p className="text-[#ff0000] font-bold mb-3">
                ⚠️ BUYER AND SELLER BEWARE. WE CANNOT GUARANTEE ITEM CONDITION, AUTHENTICITY, OR SUCCESSFUL DELIVERY.
              </p>
              <p>
                All listings are provided AS IS, AS AVAILABLE. To the fullest extent permitted by law, we:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Do NOT guarantee</strong> that listed items match their descriptions, are authentic, or are in the condition stated</li>
                <li><strong>Do NOT guarantee</strong> that items will be shipped or successfully delivered</li>
                <li><strong>Do NOT verify</strong> listings, seller reliability, or shipping arrangements</li>
                <li>Make <strong>no promises, warranties, or representations</strong> as to the completeness, accuracy, or reliability of any listing</li>
                <li><strong>Disclaim all warranties</strong>, express or implied, including merchantability and fitness for a particular purpose</li>
                <li><strong>Disclaim any liability</strong> for the acts, omissions, or conduct of any user in connection with the platform</li>
              </ul>
              <p className="mt-3">
                Any risk of using the platform is assumed by you. Conduct your own due diligence. Coordinate directly with the other party. 
                (Similar to Craigslist: we are a listing directory, not a party to transactions.)
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">5. No Liability for Trades</h2>
              <p className="text-[#ff0000] font-bold mb-3">
                ⚠️ YOU USE THIS PLATFORM AT YOUR OWN RISK. WE ARE NOT LIABLE FOR ANY LOSSES OR DAMAGES.
              </p>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, $FSBD, ITS OPERATORS, DEVELOPERS, AND AFFILIATES 
                SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Any losses resulting from transactions on the platform</li>
                <li>Items that do not match descriptions, are damaged, counterfeit, or misrepresented</li>
                <li>Failed delivery, lost shipments, or items never received</li>
                <li>Fraudulent, misrepresented, or illegal items listed by users</li>
                <li>Disputes between buyers and sellers</li>
                <li>Loss of funds due to wallet compromise, phishing, or user error</li>
                <li>Smart contract bugs, exploits, or vulnerabilities</li>
                <li>Blockchain network failures or congestion</li>
                <li>Loss of access to funds or accounts</li>
                <li>Any indirect, incidental, or consequential damages</li>
              </ul>
              <p className="mt-3">
                ALL TRANSACTIONS ARE FINAL. NO REFUNDS ARE PROVIDED BY THE PLATFORM.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">5a. Shipping Addresses</h2>
              <p>
                We do not collect, store, or process shipping addresses on our servers. Buyers and sellers 
                coordinate shipping and exchange addresses directly (e.g., through the encrypted chat). Any 
                shipping-related information shared between users is solely their responsibility. We are not 
                liable for the handling, security, or use of addresses exchanged between users. Shipping 
                logistics and address handling are entirely between buyer and seller.
              </p>
              <p className="mt-2">
                If you optionally save a shipping address on your device (encrypted, in browser storage), that 
                data is stored only in your browser and is your responsibility. We do not have access to it. 
                Clearing site data will remove it.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">6. User Responsibilities</h2>
              <p>You are solely responsible for:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Securing your wallet and private keys</li>
                <li>Verifying the identity and reputation of trading partners</li>
                <li>Ensuring listed items are legal, authentic, and accurately described</li>
                <li>Complying with all applicable laws (tax, import/export, etc.)</li>
                <li>Conducting due diligence before completing transactions</li>
                <li>Resolving disputes directly with other users</li>
                <li>Paying any applicable taxes on transactions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">7. Prohibited Items and Activities</h2>
              <p>You may not list, buy, or sell:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Illegal items or services</li>
                <li>Stolen goods</li>
                <li>Counterfeit or fraudulent items</li>
                <li>Items that infringe intellectual property rights</li>
                <li>Hazardous materials</li>
                <li>Weapons, drugs, or regulated substances (where prohibited)</li>
                <li>Adult content without proper labeling</li>
                <li>Any item that violates applicable laws</li>
              </ul>
              <p className="mt-3">
                We reserve the right to remove listings that violate these Terms, but we are not obligated 
                to monitor or moderate content.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">8. Fees</h2>
              <p>
                Regular listings are free (require message signing only). Fees may apply for:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Token launches (if you choose to create a token for your listing)</li>
                <li>Future premium features (if implemented)</li>
              </ul>
              <p className="mt-3">
                All fees are paid in SOL or other cryptocurrencies. Fees are non-refundable. Blockchain 
                transaction fees (gas) are separate and paid to the network.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">9. Smart Contract Risks</h2>
              <p className="text-[#ff0000] font-bold mb-3">
                ⚠️ SMART CONTRACTS ARE EXPERIMENTAL TECHNOLOGY. USE AT YOUR OWN RISK.
              </p>
              <p>
                Smart contracts may contain bugs, vulnerabilities, or be subject to exploits. We do not 
                guarantee the security or functionality of any smart contracts used on the platform. You 
                acknowledge that:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Smart contracts are immutable once deployed</li>
                <li>Bugs or exploits may result in permanent loss of funds</li>
                <li>We cannot reverse or modify smart contract transactions</li>
                <li>You use smart contracts at your own risk</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">10. Intellectual Property</h2>
              <p>
                The $FSBD platform, including its interface, code, and branding, is owned by us. You retain 
                ownership of content you create (listings, images, descriptions). By using the platform, you 
                grant us a license to display and store your content for platform functionality.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">11. Disclaimers</h2>
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS 
                OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
                PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p className="mt-3">
                We do not warrant that the service will be uninterrupted, secure, or error-free. We are not 
                responsible for any losses resulting from:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Technical failures or downtime</li>
                <li>Blockchain network issues</li>
                <li>Third-party service failures (RPC providers, IPFS, etc.)</li>
                <li>Malicious attacks or exploits</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">12. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless $FSBD, its operators, developers, and affiliates 
                from any claims, damages, losses, liabilities, and expenses (including legal fees) arising 
                from:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Your use of the platform</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any laws or regulations</li>
                <li>Your transactions with other users</li>
                <li>Any content you post or list</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">13. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your access to the platform at any time, with 
                or without cause, and with or without notice. You may stop using the platform at any time. 
                On-chain data cannot be deleted, but we may remove your off-chain profile data.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">14. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with applicable laws, without 
                regard to conflict of law principles. Any disputes shall be resolved through binding 
                arbitration or in courts of competent jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">15. Changes to Terms</h2>
              <p>
                We may modify these Terms at any time. Changes will be posted on this page with an updated 
                "Last Updated" date. Continued use of the service after changes constitutes acceptance. 
                Material changes will be communicated through the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">16. Severability</h2>
              <p>
                If any provision of these Terms is found to be unenforceable or invalid, that provision 
                shall be limited or eliminated to the minimum extent necessary, and the remaining provisions 
                shall remain in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">17. Entire Agreement</h2>
              <p>
                These Terms constitute the entire agreement between you and $FSBD regarding the use of the 
                platform and supersede all prior agreements and understandings.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3">18. Contact</h2>
              <p>
                For questions about these Terms, please contact us through the platform or refer to the 
                contact information provided in our Privacy Policy.
              </p>
            </section>

            <section className="bg-[#660099]/20 border-2 border-[#ff0000] p-4 mt-6">
              <p className="text-[#ff0000] font-bold text-base sm:text-lg mb-2">
                ⚠️ FINAL WARNING: USE AT YOUR OWN RISK
              </p>
              <p>
                By using $FSBD, you acknowledge that you understand the risks associated with decentralized 
                platforms, cryptocurrency, and peer-to-peer trading. You agree that $FSBD and its operators 
                are not liable for any losses, damages, or disputes arising from your use of the platform. 
                All transactions are final. No refunds. Proceed at your own risk.
              </p>
            </section>
          </div>

          <div className="mt-6 pt-4 border-t border-[#660099]/30 flex flex-wrap gap-4">
            <Link 
              href="/" 
              className="text-[#00ff00] hover:text-[#ff00ff] underline text-sm sm:text-base"
            >
              ← Back to Browse
            </Link>
            <Link 
              href="/privacy" 
              className="text-[#00ff00] hover:text-[#ff00ff] underline text-sm sm:text-base"
            >
              View Privacy Policy →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
