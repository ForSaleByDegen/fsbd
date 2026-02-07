'use client'

import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Transaction } from '@solana/web3.js'
import { Button } from './ui/button'

const STORAGE_KEY = (id: string) => `fsbd_redirected_${id}`

interface RedirectFeesToBuyerProps {
  listingId: string
  onSuccess?: () => void
  /** When true, automatically trigger redirect on mount (seller still signs once). */
  autoTrigger?: boolean
}

/** On-chain redirect of future pump.fun creator fees to the buyer via update_fee_shares. */
export default function RedirectFeesToBuyer({
  listingId,
  onSuccess,
  autoTrigger = false,
}: RedirectFeesToBuyerProps) {
  const { publicKey, sendTransaction } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem(STORAGE_KEY(listingId))
  })
  const hasAutoTriggered = useRef(false)

  const handleRedirect = async () => {
    if (!publicKey || !sendTransaction) {
      setError('Connect your wallet')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/listings/${listingId}/redirect-fees-to-buyer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seller: publicKey.toString() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to build redirect tx')

      const binary = atob(data.transactionBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const tx = Transaction.from(bytes)

      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
      const { Connection } = await import('@solana/web3.js')
      const connection = new Connection(rpcUrl)

      const sig = await sendTransaction(tx, connection, {
        skipPreflight: false,
        maxRetries: 3,
      })

      await connection.confirmTransaction(
        { signature: sig, blockhash: data.blockhash, lastValidBlockHeight: data.lastValidBlockHeight },
        'confirmed'
      )

      setDone(true)
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY(listingId), '1')
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!autoTrigger || hasAutoTriggered.current || done) return
    if (!publicKey || !sendTransaction) return
    hasAutoTriggered.current = true
    void handleRedirect()
  }, [autoTrigger, publicKey?.toString(), !!sendTransaction, done])

  if (done) {
    return (
      <div className="p-3 border border-[#00ff00]/50 rounded bg-[#00ff00]/5">
        <p className="text-sm text-[#00ff00] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Future creator fees are now redirected to the buyer.
        </p>
      </div>
    )
  }

  return (
    <div className="p-3 border border-[#660099] rounded bg-black/30">
      {autoTrigger && loading ? (
        <p className="text-sm text-purple-muted font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Redirecting creator fees to buyer... Approve in your wallet.
        </p>
      ) : (
        <>
          <p className="text-sm text-purple-muted font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            {autoTrigger ? 'Creator fees will redirect to the buyer when you approve.' : 'Redirect future pump.fun creator fees to the buyer (on-chain)'}
          </p>
          {!autoTrigger && (
            <p className="text-xs text-purple-readable/80 mb-2">
              Signs one transaction to update fee shares so future fees go to the buyer instead of you.
            </p>
          )}
          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
          <Button
            onClick={handleRedirect}
            disabled={loading}
            variant="outline"
            className="border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20 text-sm w-fit"
          >
            {loading ? 'Signing...' : 'Redirect fees to buyer'}
          </Button>
        </>
      )}
    </div>
  )
}
