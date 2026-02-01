'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { Button } from './ui/button'
import { hasAcceptedTerms, acceptTerms } from '@/lib/chat'

/**
 * One-time compliance gate. Shows when wallet is connected and user hasn't accepted.
 * Requires user to acknowledge Terms, Privacy, and key disclosures before using the app.
 * Purchase-time Degen warning remains separate in ListingDetail.
 */
export default function ComplianceModal() {
  const { publicKey } = useWallet()
  const [show, setShow] = useState(false)
  const [checking, setChecking] = useState(true)
  const [agreed, setAgreed] = useState(false)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!publicKey) {
      setShow(false)
      setChecking(false)
      return
    }
    let cancelled = false
    hasAcceptedTerms(publicKey.toString()).then((accepted) => {
      if (!cancelled) {
        setShow(!accepted)
        setChecking(false)
      }
    })
    return () => { cancelled = true }
  }, [publicKey])

  const handleAccept = async () => {
    if (!publicKey || !agreed) return
    setAccepting(true)
    try {
      await acceptTerms(publicKey.toString())
      setShow(false)
    } finally {
      setAccepting(false)
    }
  }

  if (!show || checking) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90">
      <div className="max-w-lg w-full bg-black border-4 border-[#660099] p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-pixel text-[#00ff00] mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
          Compliance & Terms
        </h3>
        <p className="text-sm text-[#aa77ee] font-pixel-alt mb-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Before using FSBD, please read and acknowledge the following:
        </p>
        <ul className="text-sm text-[#00ff00] font-pixel-alt space-y-2 mb-4 list-disc list-inside" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          <li>We host listings only. Buyers and sellers transact peer-to-peer. We are NOT a party to any transaction.</li>
          <li>No seller is affiliated with this platform. We do NOT verify listings, item authenticity, or delivery.</li>
          <li>Direct (Degen) payment sends funds straight to the seller with no protections.</li>
          <li>All risk is yours. Use at your own risk. All transactions are final.</li>
        </ul>
        <div className="flex flex-wrap gap-3 mb-6">
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#ff00ff] hover:text-[#00ff00] underline font-pixel-alt"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            Terms of Service →
          </Link>
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#ff00ff] hover:text-[#00ff00] underline font-pixel-alt"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            Privacy Policy →
          </Link>
        </div>
        <label className="flex items-start gap-2 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 accent-[#00ff00]"
          />
          <span className="text-sm text-[#00ff00] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            I have read the Terms of Service, Privacy Policy, and key disclosures above. I understand the risks and agree to use this platform at my own risk.
          </span>
        </label>
        <Button
          onClick={handleAccept}
          disabled={!agreed || accepting}
          className="w-full border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt disabled:opacity-50"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          {accepting ? '...' : 'I Agree'}
        </Button>
      </div>
    </div>
  )
}
