'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { supabase, hashWalletAddress } from '@/lib/supabase'
import { createUserEscrowPDA } from '@/lib/user-pda-wallet'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface EmailSignupModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function EmailSignupModal({ isOpen, onClose, onComplete }: EmailSignupModalProps) {
  const { publicKey } = useWallet()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!publicKey) {
      setError('Please connect your wallet')
      return
    }

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Create user's escrow PDA
      const escrowPda = await createUserEscrowPDA(publicKey.toString())

      // Create or update profile with email and PDA
      if (supabase) {
        const walletHash = hashWalletAddress(publicKey.toString())
        
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            wallet_address_hash: walletHash,
            wallet_address: publicKey.toString(),
            email: email.toLowerCase().trim(),
            email_verified: false, // Can verify via email link later
            escrow_pda: escrowPda.toString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'wallet_address_hash'
          })

        if (upsertError) {
          throw new Error(`Failed to save profile: ${upsertError.message}`)
        }

        // Send verification email (optional - can implement later)
        // await sendVerificationEmail(email)

        onComplete()
        onClose()
      } else {
        throw new Error('Database not available')
      }
    } catch (err: any) {
      console.error('Error signing up:', err)
      setError(err.message || 'Failed to complete signup')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-black border-4 border-[#660099] p-6 sm:p-8 max-w-md w-full pixel-art">
        <h2 className="text-2xl font-pixel text-[#00ff00] mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
          Email Required
        </h2>
        <p className="text-[#00ff00] font-pixel-alt text-sm mb-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          An email address is required to:
        </p>
        <ul className="text-[#00ff00] font-pixel-alt text-xs mb-6 space-y-2 list-disc list-inside" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          <li>Create shipping labels</li>
          <li>Receive transaction notifications</li>
          <li>Access your escrow wallet</li>
          <li>Withdraw funds when eligible</li>
        </ul>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-pixel-alt text-[#00ff00] mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Email Address *
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs font-pixel-alt">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 border-2 border-[#660099] text-[#660099] hover:bg-[#660099] hover:text-black font-pixel-alt"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt disabled:opacity-50"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              {loading ? 'Creating...' : 'Continue'}
            </Button>
          </div>
        </form>

        <p className="text-xs text-[#660099] font-pixel-alt mt-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Your email will be used only for shipping labels and transaction notifications. 
          We respect your privacy and will never spam you.
        </p>
      </div>
    </div>
  )
}
