'use client'

import Link from 'next/link'
import BuyFsbdSection from './BuyFsbdSection'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="border-t-2 sm:border-t-4 border-[#660099] mt-8 sm:mt-12 py-4 sm:py-6 px-2 sm:px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="text-xs sm:text-sm text-[#00ff00] font-pixel-alt text-center sm:text-left">
            <p>© {currentYear} $FSBD Marketplace</p>
            <p className="text-purple-readable mt-1">For Sale By Degen</p>
          </div>
          
          <div className="flex flex-wrap justify-center sm:justify-end items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <Link 
              href="/report" 
              className="text-[#00ff00] hover:text-[#ff00ff] underline font-pixel-alt transition-colors"
            >
              Bug Report
            </Link>
            <span className="text-purple-readable">|</span>
            <Link 
              href="/mint-logo" 
              className="text-[#00ff00] hover:text-[#ff00ff] underline font-pixel-alt transition-colors"
            >
              Mint Logo NFT
            </Link>
            <span className="text-purple-readable">|</span>
            <Link 
              href="/vanity" 
              className="text-[#00ff00] hover:text-[#ff00ff] underline font-pixel-alt transition-colors"
            >
              Vanity Address
            </Link>
            <span className="text-purple-readable">|</span>
            <Link 
              href="/why" 
              className="text-[#00ff00] hover:text-[#ff00ff] underline font-pixel-alt transition-colors"
            >
              Why $FSBD
            </Link>
            <span className="text-purple-readable">|</span>
            <Link 
              href="/docs/features" 
              className="text-[#00ff00] hover:text-[#ff00ff] underline font-pixel-alt transition-colors"
            >
              Features &amp; Tiers
            </Link>
            <span className="text-purple-readable">|</span>
            <Link 
              href="/docs/guides" 
              className="text-[#00ff00] hover:text-[#ff00ff] underline font-pixel-alt transition-colors"
            >
              Guides
            </Link>
            <span className="text-purple-readable">|</span>
            <Link 
              href="/docs/help" 
              className="text-[#00ff00] hover:text-[#ff00ff] underline font-pixel-alt transition-colors"
            >
              FAQ &amp; Help
            </Link>
            <span className="text-purple-readable">|</span>
            <Link 
              href="/docs/whitepaper" 
              className="text-[#00ff00] hover:text-[#ff00ff] underline font-pixel-alt transition-colors"
            >
              Whitepaper
            </Link>
            <span className="text-purple-readable">|</span>
            <Link 
              href="/terms" 
              className="text-[#00ff00] hover:text-[#ff00ff] underline font-pixel-alt transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-purple-readable">|</span>
            <Link 
              href="/privacy" 
              className="text-[#00ff00] hover:text-[#ff00ff] underline font-pixel-alt transition-colors"
            >
              Privacy Policy
            </Link>
            <BuyFsbdSection variant="compact" />
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-[#660099]/30 text-center">
          <p className="text-sm text-purple-muted font-pixel-alt">
            ⚠️ Decentralized Platform - Use at Your Own Risk - No Refunds
          </p>
        </div>
      </div>
    </footer>
  )
}
