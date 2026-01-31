'use client'

import { useState } from 'react'

export default function DisclaimerBanner() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-black/90 border-4 border-[#660099] mb-6 overflow-hidden pixel-art">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-[#660099]/30 transition-colors border-b-2 border-[#660099]"
      >
        <span className="text-sm font-pixel-alt text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          ⚠️ Disclaimer
        </span>
        <span className="text-[#660099] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-3 text-xs text-[#00ff00] font-pixel-alt leading-relaxed" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          <p>
            <strong className="text-[#660099]">Experimental MVP:</strong> This is a prototype. Not financial advice. 
            $FSBD is a utility token only. Use at your own risk. All transactions are final. 
            No guarantees or warranties. Anonymous and private - no tracking, no data sharing.
          </p>
        </div>
      )}
    </div>
  )
}
