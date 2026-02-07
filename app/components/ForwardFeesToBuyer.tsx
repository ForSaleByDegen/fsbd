'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Transaction } from '@solana/web3.js'
import { Button } from './ui/button'

interface ForwardFeesToBuyerProps {
  listingId: string
  buyerWalletAddress?: string | null
  onSuccess?: () => void
}

export default function ForwardFeesToBuyer({
  listingId,
  buyerWalletAddress,
  onSuccess,
}: ForwardFeesToBuyerProps) {
  const { publicKey, sendTransaction } = useWallet()
  const [amount, setAmount] = useState('')
  const [buyerInput, setBuyerInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsBuyerInput = !buyerWalletAddress || buyerWalletAddress.trim().length < 32

  const handleBuildAndSend = async () => {
    if (!publicKey || !sendTransaction) {
      setError('Connect your wallet')
      return
    }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid SOL amount')
      return
    }
    const buyer = needsBuyerInput ? buyerInput.trim() : buyerWalletAddress
    if (!buyer || buyer.length < 32) {
      setError('Buyer address required')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/listings/${listingId}/forward-fees-tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller: publicKey.toString(),
          amount: amt,
          ...(needsBuyerInput && { buyer }),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to build transfer')

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

      setAmount('')
      setBuyerInput('')
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-3 border border-[#660099] rounded bg-black/30">
      <p className="text-sm text-purple-muted font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Forward your pump.fun creator fees to the buyer
      </p>
      <div className="flex flex-col gap-2">
        <input
          type="number"
          step="0.001"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (SOL)"
          className="px-3 py-2 bg-black/50 border border-[#660099] rounded text-[#00ff00] text-sm"
        />
        {needsBuyerInput && (
          <input
            type="text"
            value={buyerInput}
            onChange={(e) => setBuyerInput(e.target.value)}
            placeholder="Buyer wallet address (not on file)"
            className="px-3 py-2 bg-black/50 border border-[#660099] rounded text-[#00ff00] font-mono text-sm"
          />
        )}
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <Button
          onClick={handleBuildAndSend}
          disabled={loading || !amount || (needsBuyerInput && !buyerInput.trim())}
          variant="outline"
          className="border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20 text-sm w-fit"
        >
          {loading ? 'Sending...' : 'Build transfer'}
        </Button>
      </div>
    </div>
  )
}
