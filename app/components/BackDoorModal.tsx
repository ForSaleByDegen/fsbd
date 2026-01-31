'use client'

import React, { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

const BackDoorModal = () => {
  const { connected, connecting } = useWallet()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Show modal if wallet is not connected
    setIsOpen(!connected)
  }, [connected])

  if (!isOpen || connected) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 font-mono">
      <div className="bg-[#c0c0c0] border-4 border-t-[#dfdfdf] border-l-[#dfdfdf] border-b-[#808080] border-r-[#808080] w-96 max-w-[90%] shadow-2xl rounded-sm">
        {/* Title bar */}
        <div className="bg-[#000080] text-white px-2 py-1 flex justify-between items-center text-sm">
          <span>backdoor.exe - Security Warning</span>
          <button
            onClick={() => setIsOpen(false)}
            className="bg-[#c0c0c0] border border-black px-2 text-black hover:bg-gray-300"
          >
            X
          </button>
        </div>

        {/* Content */}
        <div className="p-4 text-black">
          <div className="flex items-start gap-4">
            <div className="text-5xl">⚠️</div>
            <div>
              <p className="font-bold mb-2">Access Denied – Solana Wallet Required</p>
              <p className="mb-4 text-sm">
                This application has detected no valid degen credentials.
                Proceed through the back door? (Wallet connect required)
              </p>
              <p className="text-xs italic text-gray-700">
                Warning: For degens only. No refunds on rugs. Proceed at own risk.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-8 p-4 border-t border-gray-400">
          <button
            onClick={() => {
              // Close modal - user can use WalletMultiButton in header
              setIsOpen(false)
            }}
            className="bg-[#c0c0c0] border-2 border-t-[#dfdfdf] border-l-[#dfdfdf] border-b-[#808080] border-r-[#808080] px-6 py-1.5 font-bold hover:bg-gray-300 active:border-t-[#808080] active:border-l-[#808080] active:border-b-[#dfdfdf] active:border-r-[#dfdfdf] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={connecting}
          >
            {connecting ? 'Connecting...' : 'Yes (Connect Wallet)'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="bg-[#c0c0c0] border-2 border-t-[#dfdfdf] border-l-[#dfdfdf] border-b-[#808080] border-r-[#808080] px-6 py-1.5 hover:bg-gray-300 active:border-t-[#808080] active:border-l-[#808080] active:border-b-[#dfdfdf] active:border-r-[#dfdfdf]"
          >
            No (Run Away)
          </button>
        </div>
      </div>
    </div>
  )
}

export default BackDoorModal
