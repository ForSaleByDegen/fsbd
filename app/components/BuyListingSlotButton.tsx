'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { getAssociatedTokenAddressSync, createTransferInstruction, getMint } from '@solana/spl-token'
import { EXTRA_LISTING_SLOT_COST_FSBD } from '@/lib/tier-check'

export default function BuyListingSlotButton({
  onSuccess,
  fsbdMint,
}: {
  onSuccess?: () => void
  fsbdMint?: string | null
}) {
  const { publicKey, signTransaction } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!publicKey || !signTransaction) return null
  if (!fsbdMint || fsbdMint === 'FSBD_TOKEN_MINT_PLACEHOLDER') return null

  const appWallet = process.env.NEXT_PUBLIC_APP_WALLET
  if (!appWallet || appWallet === 'YOUR_WALLET_ADDRESS') return null

  const handleBuy = async () => {
    setLoading(true)
    setError(null)
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
      const connection = new Connection(rpcUrl)
      const mint = new PublicKey(fsbdMint)
      const appPubkey = new PublicKey(appWallet)
      const userAta = getAssociatedTokenAddressSync(mint, publicKey)
      const appAta = getAssociatedTokenAddressSync(mint, appPubkey)

      const mintInfo = await getMint(connection, mint)
      const decimals = mintInfo.decimals
      const amount = BigInt(Math.floor(EXTRA_LISTING_SLOT_COST_FSBD * 10 ** decimals))

      const tx = new Transaction()
      const appAtaInfo = await connection.getAccountInfo(appAta)
      if (!appAtaInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(publicKey, appAta, appPubkey, mint)
        )
      }
      tx.add(
        createTransferInstruction(userAta, appAta, publicKey, amount)
      )
      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey

      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false })
      await connection.confirmTransaction(sig, 'confirmed')

      const res = await fetch('/api/listings/purchase-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toString(), signature: sig }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Purchase failed')
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleBuy}
        disabled={loading}
        className="px-4 py-2 border-2 border-[#00ff00] text-[#00ff00] font-pixel-alt text-sm hover:bg-[#00ff00]/20 disabled:opacity-50"
        style={{ fontFamily: 'var(--font-pixel-alt)' }}
      >
        {loading ? 'Processing...' : `Buy +1 slot (${EXTRA_LISTING_SLOT_COST_FSBD.toLocaleString()} $FSBD)`}
      </button>
      {error && <p className="text-amber-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
