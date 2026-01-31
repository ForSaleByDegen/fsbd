'use client'

import { useState } from 'react'

export default function DisclaimerBanner() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-6 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
      >
        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          ⚠️ Disclaimer
        </span>
        <span className="text-yellow-600 dark:text-yellow-400">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-3 text-xs text-yellow-700 dark:text-yellow-300">
          <p className="leading-relaxed">
            <strong>Experimental MVP:</strong> This is a prototype. Not financial advice. 
            $FBSD is a utility token only. Use at your own risk. All transactions are final. 
            No guarantees or warranties. Anonymous and private - no tracking, no data sharing.
          </p>
        </div>
      )}
    </div>
  )
}
