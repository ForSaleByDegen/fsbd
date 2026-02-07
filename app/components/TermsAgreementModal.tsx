'use client'

import { useState } from 'react'
import { Button } from './ui/button'

const TERMS_TEXT = `
By using this marketplace, you agree that:

• WE CANNOT GUARANTEE item condition, authenticity, or successful delivery. All listings are AS IS, AS AVAILABLE.

• This platform hosts listings only. Buyers and sellers transact directly peer-to-peer. We are NOT a party to any transaction.

• We do NOT verify listings, item condition, or that items will be shipped or delivered. We do not hold funds, facilitate shipping, or resolve disputes.

• All risk is yours. Items may not match descriptions. Delivery may fail. We assume NO liability. Use at your own risk. All transactions are final.

• BUYER AND SELLER BEWARE: Conduct due diligence. Coordinate directly with the other party.

• You are responsible for compliance with applicable laws.

By clicking "I Agree", you accept these terms and may proceed.
`.trim()

interface TermsAgreementModalProps {
  isOpen: boolean
  onAccept: () => void
  onDecline?: () => void
}

export default function TermsAgreementModal({ isOpen, onAccept, onDecline }: TermsAgreementModalProps) {
  const [agreed, setAgreed] = useState(false)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="max-w-lg w-full bg-black border-4 border-[#660099] p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-pixel text-[#00ff00] mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
          Terms of Use
        </h3>
        <div className="text-sm text-[#00ff00] font-pixel-alt whitespace-pre-wrap mb-6 leading-relaxed" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {TERMS_TEXT}
        </div>
        <label className="flex items-start gap-2 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 accent-[#00ff00]"
          />
          <span className="text-sm text-[#00ff00] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            I have read and agree to these terms
          </span>
        </label>
        <div className="flex gap-3">
          <Button
            onClick={onAccept}
            disabled={!agreed}
            className="flex-1 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black disabled:opacity-50"
          >
            I Agree
          </Button>
          {onDecline && (
            <Button
              onClick={onDecline}
              variant="outline"
              className="border-2 border-[#660099] text-purple-readable"
            >
              Decline
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
