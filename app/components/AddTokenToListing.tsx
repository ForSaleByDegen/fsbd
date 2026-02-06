'use client'

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { createPumpFunToken, createListingToken } from '@/lib/token-ops'
import { addToTotalFees } from '@/lib/admin'
import { calculateListingFee } from '@/lib/tier-check'
import { useTier } from './providers/TierProvider'
import { formatPriceToken } from '@/lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'

/** Build formatted token description — does not include token name */
function buildTokenDescription(opts: {
  description: string
  price: string
  priceLabel: string
}): string {
  const parts: string[] = []
  if (opts.description?.trim()) parts.push(opts.description.trim())
  if (opts.price && opts.priceLabel) parts.push(`Listing Price: ${opts.price} ${opts.priceLabel}`)
  return parts.join('\n\n').slice(0, 800)
}

interface AddTokenToListingProps {
  listingId: string
  listingUrl: string
  imageUrl: string | null
  title: string
  description: string
  price: string | number
  priceToken: string
  tokenSymbol?: string | null
  onSuccess: () => void
}

export default function AddTokenToListing({
  listingId,
  listingUrl,
  imageUrl,
  title,
  description,
  price,
  priceToken,
  tokenSymbol,
  onSuccess,
}: AddTokenToListingProps) {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const { refresh } = useTier()
  const [tokenName, setTokenName] = useState('')
  const [tokenSymbolInput, setTokenSymbolInput] = useState('')
  const [devBuySol, setDevBuySol] = useState(0.01)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLaunch = async () => {
    if (!publicKey || !signTransaction) {
      alert('Connect your wallet to launch a token')
      return
    }
    const name = tokenName.trim()
    const symbol = (tokenSymbolInput || tokenSymbol || '').trim().toUpperCase().slice(0, 10)
    if (!name || !symbol) {
      alert('Enter token name and symbol')
      return
    }
    if (!imageUrl) {
      alert('This listing has no image. Add an image to your listing first, then create a token.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const fresh = await refresh()
      const fee = calculateListingFee(fresh.tier)
      const devBuy = Math.max(0, devBuySol ?? 0.01)
      const priceLabel = formatPriceToken(priceToken, symbol)
      const listingDescription = buildTokenDescription({
        description: String(description || ''),
        price: String(price || ''),
        priceLabel,
      })

      let tokenMint: string
      try {
        tokenMint = await createPumpFunToken(
          publicKey,
          signTransaction,
          connection,
          name,
          symbol,
          {
            imageUrl,
            description: listingDescription,
            devBuySol: devBuy,
            extras: { externalUrl: listingUrl },
          }
        )
      } catch (pumpErr: unknown) {
        const msg = pumpErr instanceof Error ? pumpErr.message : String(pumpErr)
        if (/Transaction may have succeeded|check your wallet/i.test(msg)) {
          setError(msg)
          throw pumpErr
        }
        if (/image|IPFS|pump/i.test(msg)) throw pumpErr
        tokenMint = await createListingToken(
          publicKey,
          signTransaction,
          connection,
          name,
          symbol
        )
      }

      const patchRes = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          token_mint: tokenMint,
          token_name: name,
          token_symbol: symbol,
        }),
      })
      if (!patchRes.ok) {
        const errData = await patchRes.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to link token to listing')
      }

      const appWallet = new PublicKey(
        process.env.NEXT_PUBLIC_APP_WALLET || '11111111111111111111111111111111'
      )
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: appWallet,
          lamports: Math.floor(fee * LAMPORTS_PER_SOL),
        })
      )
      const { blockhash } = await connection.getLatestBlockhash('finalized')
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey
      const signed = await signTransaction(tx)
      const serialized = signed.serialize()
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL
      const { sendTransactionWithRebate, shouldUseRebate } = await import('@/lib/helius-rebate')
      let signature: string
      if (shouldUseRebate() && rpcUrl) {
        try {
          signature = await sendTransactionWithRebate(
            serialized,
            publicKey.toString(),
            rpcUrl,
            { maxRetries: 3 }
          )
        } catch (rebateErr: unknown) {
          const rebateMsg = rebateErr instanceof Error ? rebateErr.message : String(rebateErr)
          if (/failed to fetch|ERR_CONNECTION|network|fetch/i.test(rebateMsg)) {
            signature = await connection.sendRawTransaction(serialized)
          } else {
            throw rebateErr
          }
        }
      } else {
        signature = await connection.sendRawTransaction(serialized)
      }
      await connection.confirmTransaction(signature)

      try {
        await addToTotalFees(publicKey.toString(), fee)
      } catch { /* non-fatal */ }

      alert('Token created and linked to your listing!')
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      alert('Failed to create token: ' + msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 rounded-lg border-2 border-[#660099] bg-[#660099]/10 space-y-3">
      <h4 className="font-pixel text-[#00ff00] text-sm sm:text-base" style={{ fontFamily: 'var(--font-pixel)' }}>
        Create a token for this listing
      </h4>
      <p className="text-xs text-[#aa77ee] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Launch a fun token for your listing on pump.fun. Only you (the creator) can add a token.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-[#aa77ee] mb-1">Token name</label>
          <Input
            placeholder={title?.slice(0, 20) || 'My Token'}
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            className="border-[#660099] bg-black/50"
          />
        </div>
        <div>
          <label className="block text-xs text-[#aa77ee] mb-1">Token symbol</label>
          <Input
            placeholder={tokenSymbol || 'MT'}
            value={tokenSymbolInput}
            onChange={(e) => setTokenSymbolInput(e.target.value.toUpperCase().slice(0, 10))}
            maxLength={10}
            className="border-[#660099] bg-black/50"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-[#aa77ee] mb-1">Dev buy (SOL) — optional</label>
        <Input
          type="number"
          step="0.01"
          min={0}
          value={devBuySol}
          onChange={(e) => setDevBuySol(Math.max(0, parseFloat(e.target.value) || 0))}
          className="border-[#660099] bg-black/50 w-32"
        />
      </div>
      {error && (
        <p className="text-xs text-amber-400 font-pixel-alt">{error}</p>
      )}
      <Button
        onClick={handleLaunch}
        disabled={loading}
        className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20"
      >
        {loading ? 'Creating token...' : 'Create token for listing'}
      </Button>
    </div>
  )
}
