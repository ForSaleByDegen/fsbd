'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { VersionedTransaction } from '@solana/web3.js'
import { isAdmin } from '@/lib/admin'
import { Button } from './ui/button'

export default function ClaimCreatorFees() {
  const { publicKey, signTransaction, connected } = useWallet()
  const { connection } = useConnection()
  const router = useRouter()
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSig, setLastSig] = useState<string | null>(null)

  useEffect(() => {
    if (!publicKey) {
      setIsAdminUser(null)
      return
    }
    isAdmin(publicKey.toString()).then(setIsAdminUser)
  }, [publicKey?.toString()])

  const handleClaim = async () => {
    if (!publicKey || !signTransaction) {
      setError('Connect your wallet to claim creator fees.')
      return
    }

    setLoading(true)
    setError(null)
    setLastSig(null)

    try {
      const res = await fetch('/api/claim-creator-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: publicKey.toString(),
          priorityFee: 0.000001,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Claim failed (${res.status})`)
      }

      const txBase64 = data.txBase64
      if (!txBase64) {
        throw new Error('No transaction returned.')
      }

      const txBuf = Buffer.from(txBase64, 'base64')
      const tx = VersionedTransaction.deserialize(new Uint8Array(txBuf))

      const signed = await signTransaction(tx)
      const sig = await connection.sendTransaction(signed as VersionedTransaction, {
        skipPreflight: true,
        maxRetries: 5,
        preflightCommitment: 'confirmed',
      })

      setLastSig(sig)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <div className="rounded-lg border-2 border-[#660099] bg-black/50 p-6 text-center">
        <p className="text-muted-foreground mb-4">Connect your wallet to claim creator fees.</p>
      </div>
    )
  }

  if (isAdminUser === false) {
    return (
      <div className="rounded-lg border-2 border-red-500/50 bg-red-500/10 p-6 text-center">
        <p className="text-red-400 font-medium">Admin only.</p>
        <p className="text-muted-foreground mt-2 text-sm">This page is restricted to admin wallets.</p>
      </div>
    )
  }

  if (isAdminUser === null) {
    return (
      <div className="rounded-lg border-2 border-[#660099] bg-black/50 p-6 text-center">
        <p className="text-muted-foreground">Checking access...</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border-2 border-[#660099] bg-black/50 p-6">
      <Button
        onClick={handleClaim}
        disabled={loading}
        className="w-full font-pixel border-2 border-[#00ff00] bg-[#660099] hover:bg-[#660099]/80 text-[#00ff00]"
      >
        {loading ? 'Building...' : 'Claim Creator Fees'}
      </Button>

      {error && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}

      {lastSig && (
        <p className="mt-4 text-[#00ff00] text-sm">
          Claim sent.{' '}
          <a
            href={`https://solscan.io/tx/${lastSig}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View on Solscan
          </a>
        </p>
      )}
    </div>
  )
}
