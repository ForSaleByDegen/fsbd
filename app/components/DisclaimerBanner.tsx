'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function DisclaimerBanner() {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="bg-black/90 border-4 border-[#ff0000] mb-6 overflow-hidden pixel-art">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#660099]/30 transition-colors border-b-2 border-[#660099]"
      >
        <span className="text-sm font-pixel-alt text-[#ff0000] font-bold" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          ⚠️ BUYER & SELLER BEWARE — READ BEFORE USING
        </span>
        <span className="text-[#660099] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2 text-xs text-[#00ff00] font-pixel-alt leading-relaxed space-y-3" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          <p className="text-[#ff0000] font-bold">
            WE CANNOT GUARANTEE ITEM CONDITION, AUTHENTICITY, OR SUCCESSFUL DELIVERY.
          </p>
          <p>
            <strong className="text-[#aa77ee]">Listing directory only — AS IS, AS AVAILABLE:</strong> We host listings only. 
            Buyers and sellers transact directly peer-to-peer. We are NOT a party to any transaction. We do NOT verify listings, 
            item condition, authenticity, or that items will be shipped or delivered. We do NOT hold funds (except optional escrow 
            by user choice), facilitate shipping, or resolve disputes.
          </p>
          <p>
            <strong className="text-[#aa77ee]">All risk is yours:</strong> Items may not match descriptions. Delivery may fail. 
            We assume NO liability for listings, items, shipping, delivery, or any transaction. Use at your own risk. 
            All transactions are final. Conduct due diligence and coordinate directly with the other party. 
            <Link href="/terms" className="text-[#ff00ff] underline ml-1">Full Terms</Link>
          </p>
        </div>
      )}
    </div>
  )
}
