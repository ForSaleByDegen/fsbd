'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { supabase } from '@/lib/supabase'
import { transferToUserEscrowTx } from '@/lib/user-pda-wallet'
import { sendTransactionWithRebate, shouldUseRebate } from '@/lib/helius-rebate'
import { updateThreadEscrow } from '@/lib/chat'
import { getInsuranceCost } from '@/lib/insurance-cost'
import { Button } from './ui/button'
import ManualTrackingForm from './ManualTrackingForm'

interface OptionalEscrowSectionProps {
  listing: {
    id: string
    title: string
    price: number
    price_token?: string
    wallet_address: string
    escrow_pda?: string
    escrow_status?: string
    escrow_deposited_at?: string | null
    tracking_number?: string
    shipping_carrier?: string
  }
  threadId: string
  escrowAgreed: boolean
  escrowStatus?: string | null
  userRole: 'seller' | 'buyer'
  onUpdate: () => void
}

export default function OptionalEscrowSection({
  listing,
  threadId,
  escrowAgreed,
  escrowStatus,
  userRole,
  onUpdate,
}: OptionalEscrowSectionProps) {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const [processing, setProcessing] = useState(false)
  const [showTrackingForm, setShowTrackingForm] = useState(false)
  const [showInsurancePrompt, setShowInsurancePrompt] = useState(true)
  const [insuranceOptIn, setInsuranceOptIn] = useState(false)
  const [config, setConfig] = useState<{ protection_coverage_cap_usd: number; sol_usd_rate: number } | null>(null)

  useEffect(() => {
    if (!listing.escrow_pda && userRole === 'buyer') {
      fetch('/api/config')
        .then((r) => r.json())
        .then((data) => setConfig({
          protection_coverage_cap_usd: data.protection_coverage_cap_usd ?? 100,
          sol_usd_rate: data.sol_usd_rate ?? 200,
        }))
        .catch(() => setConfig({ protection_coverage_cap_usd: 100, sol_usd_rate: 200 }))
    }
  }, [listing.escrow_pda, userRole])

  const handleDepositToEscrow = async () => {
    if (!publicKey || !signTransaction || !connection) {
      alert('Please connect your wallet')
      return
    }
    if (userRole !== 'buyer') return
    const token = listing.price_token || 'SOL'

    try {
      setProcessing(true)

      const paramsRes = await fetch(`/api/listings/${listing.id}/prepare-escrow-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer: publicKey.toString(), insuranceOptIn }),
        cache: 'no-store',
      })
      if (!paramsRes.ok) {
        const err = await paramsRes.json().catch(() => ({}))
        alert(err.error || 'Could not load purchase details. The seller may need to re-list.')
        setProcessing(false)
        return
      }
      const params = await paramsRes.json() as {
        seller: string
        saleAmount: number
        insuranceFee: number
        totalAmount: number
        insuranceWallet: string | null
        token: string
        mint?: string
      }
      const { saleAmount, insuranceFee, totalAmount, insuranceWallet } = params

      // Balance check (Solana: "Attempt to debit" = source account has no funds)
      if (token === 'SOL') {
        let balance: number
        try {
          balance = await connection.getBalance(publicKey, 'confirmed')
        } catch {
          balance = 0
        }
        const totalNeeded = (totalAmount + 0.001) * LAMPORTS_PER_SOL
        const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'
        if (balance < totalNeeded) {
          const balanceSol = balance / LAMPORTS_PER_SOL
          if (balanceSol === 0) {
            const tryAnyway = confirm(
              `RPC reports 0 SOL. You need ${totalAmount + 0.001} SOL on ${network}.\n\n` +
              'If you have SOL in Phantom, try anyway? (Add NEXT_PUBLIC_RPC_URL in Vercel for accurate balance.)'
            )
            if (!tryAnyway) {
              setProcessing(false)
              return
            }
          } else {
            alert(`Insufficient balance. You need ${(totalNeeded / LAMPORTS_PER_SOL).toFixed(4)} SOL but have ${balanceSol.toFixed(4)} SOL.`)
            setProcessing(false)
            return
          }
        }
      }

      if (params.token !== 'SOL' && !params.mint) {
        alert('Token payment not configured for this listing.')
        setProcessing(false)
        return
      }
      const tokenParam = params.token === 'SOL' ? 'SOL' : params.mint!
      const { Transaction, SystemProgram } = await import('@solana/web3.js')
      const transaction = new Transaction()

      // Insurance transfer: SOL only (5% fee goes to platform multisig)
      if (insuranceFee > 0 && insuranceWallet && params.token === 'SOL') {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new (await import('@solana/web3.js')).PublicKey(insuranceWallet),
            lamports: Math.floor(insuranceFee * LAMPORTS_PER_SOL),
          })
        )
      }

      const { transaction: escrowTx, escrowPda } = await transferToUserEscrowTx(
        publicKey,
        params.seller,
        saleAmount,
        tokenParam,
        connection
      )
      transaction.add(...escrowTx.instructions)
      transaction.feePayer = publicKey

      const doSignAndSend = async (skipPreflight = false): Promise<{ signature: string; blockhash: string; lastValidBlockHeight: number }> => {
        const { blockhash: freshBlockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')
        transaction.recentBlockhash = freshBlockhash
        const signed = await signTransaction(transaction)
        const serialized = signed.serialize()
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL
        const opts = { skipPreflight, maxRetries: 3 }
        let sig: string
        if (shouldUseRebate() && rpcUrl) {
          try {
            sig = await sendTransactionWithRebate(serialized, publicKey.toString(), rpcUrl, opts)
          } catch (rebateErr: unknown) {
            const rebateMsg = rebateErr instanceof Error ? rebateErr.message : String(rebateErr)
            if (/failed to fetch|ERR_CONNECTION|network|fetch/i.test(rebateMsg)) {
              console.warn('Helius rebate request failed, falling back to standard RPC:', rebateMsg)
              sig = await connection.sendRawTransaction(serialized, opts)
            } else {
              throw rebateErr
            }
          }
        } else {
          sig = await connection.sendRawTransaction(serialized, opts)
        }
        return { signature: sig, blockhash: freshBlockhash, lastValidBlockHeight }
      }

      let signature: string
      let blockhash: string
      let lastValidBlockHeight: number
      try {
        const result = await doSignAndSend(false)
        signature = result.signature
        blockhash = result.blockhash
        lastValidBlockHeight = result.lastValidBlockHeight
      } catch (sendErr: any) {
        if (sendErr?.message?.includes('Attempt to debit') || sendErr?.message?.includes('prior credit')) {
          const retry = confirm(
            'Simulation failed (RPC may report wrong balance). Retry with simulation skipped?'
          )
          if (retry) {
            const result = await doSignAndSend(true)
            signature = result.signature
            blockhash = result.blockhash
            lastValidBlockHeight = result.lastValidBlockHeight
          } else {
            throw sendErr
          }
        } else if (/block height exceeded|expired/i.test(sendErr?.message || '')) {
          const retry = confirm('Transaction expired. Sign again with a fresh blockhash?')
          if (retry) {
            const result = await doSignAndSend(false)
            signature = result.signature
            blockhash = result.blockhash
            lastValidBlockHeight = result.lastValidBlockHeight
          } else {
            throw sendErr
          }
        } else {
          throw sendErr
        }
      }
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')

      if (supabase) {
        await supabase
          .from('listings')
          .update({
            status: 'in_escrow',
            escrow_pda: escrowPda.toString(),
            escrow_amount: saleAmount,
            escrow_status: 'pending',
            buyer_wallet_address: publicKey.toString(),
            escrow_deposited_at: new Date().toISOString(),
          })
          .eq('id', listing.id)
      }
      await updateThreadEscrow(threadId, true, 'funded')
      const msg = insuranceOptIn
        ? `Deposited ${saleAmount} ${token} to escrow + ${insuranceFee.toFixed(4)} insurance.\n\nTx: ${signature}`
        : `Deposited ${saleAmount} ${token} to escrow.\n\nTx: ${signature}`
      alert(msg)
      onUpdate()
    } catch (err: any) {
      console.error(err)
      let msg = err?.message || 'Unknown error'
      try {
        const logs = typeof err?.getLogs === 'function' ? err.getLogs() : err?.logs
        if (logs && Array.isArray(logs) && logs.length > 0) {
          msg += '\n\nLogs: ' + logs.slice(-5).join('\n')
        }
      } catch (_) {}
      alert('Escrow deposit failed: ' + msg)
    } finally {
      setProcessing(false)
    }
  }

  const handleMarkShipped = async () => {
    if (!publicKey || userRole !== 'seller') return
    setShowTrackingForm(true)
  }

  const handleTrackingAdded = async () => {
    if (supabase) {
      await supabase
        .from('listings')
        .update({
          escrow_status: 'shipped',
          status: 'shipped',
          shipped_at: new Date().toISOString(),
        })
        .eq('id', listing.id)
    }
    await updateThreadEscrow(threadId, true, 'shipped')
    setShowTrackingForm(false)
    onUpdate()
  }

  const handleConfirmReceipt = async () => {
    if (!publicKey || userRole !== 'buyer' || !supabase) return
    try {
      setProcessing(true)
      await supabase
        .from('listings')
        .update({
          escrow_status: 'completed',
          status: 'completed',
          received_at: new Date().toISOString(),
        })
        .eq('id', listing.id)
      await updateThreadEscrow(threadId, true, 'completed')
      alert('Receipt confirmed. Funds will be released to seller (admin approval required).')
      onUpdate()
    } catch (err: any) {
      alert('Failed: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleReportNotReceived = async () => {
    if (!publicKey || userRole !== 'buyer' || !supabase) return
    if (!confirm('Report item as not received? This will open a dispute for admin review.')) return
    try {
      setProcessing(true)
      await supabase
        .from('listings')
        .update({
          escrow_status: 'disputed',
          status: 'disputed',
        })
        .eq('id', listing.id)
      await updateThreadEscrow(threadId, true, 'disputed')
      alert('Dispute opened. An admin will review and approve release or refund.')
      onUpdate()
    } catch (err: any) {
      alert('Failed: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (!escrowAgreed && escrowStatus !== 'pending') return null

  const insuranceCost = config && (listing.price_token === 'SOL' || !listing.price_token)
    ? getInsuranceCost(listing.price, listing.price_token || 'SOL', config)
    : null

  // 7-day seller tracking deadline
  const depositedAt = listing.escrow_deposited_at ? new Date(listing.escrow_deposited_at) : null
  const deadline = depositedAt ? new Date(depositedAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null
  const now = new Date()
  const daysLeft = deadline && now < deadline
    ? Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    : null
  const isOverdue = deadline && now >= deadline

  return (
    <div className="mb-4 p-4 bg-[#660099]/20 border-2 border-[#660099] rounded">
      <h3 className="font-pixel text-[#ff00ff] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
        🔒 Optional Escrow
      </h3>
      <p className="text-xs text-[#00ff00] font-pixel-alt mb-3" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Both parties agreed to use escrow. Funds held until shipment and receipt are confirmed.
        Seller has 7 days to add tracking.
      </p>

      {!listing.escrow_pda && userRole === 'buyer' && (
        <div className="space-y-3">
          {showInsurancePrompt && (
            <div className="p-3 bg-black/40 border border-[#660099] rounded">
              <p className="text-sm font-pixel-alt text-purple-muted mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Add buyer protection? 5% of sale. Coverage up to ${config?.protection_coverage_cap_usd ?? 100} per claim (increases as we grow).
              </p>
              {insuranceCost && (
                <p className="text-xs text-[#00ff00] mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Cost: {insuranceCost.feeSol.toFixed(4)} SOL (${insuranceCost.feeUsd.toFixed(2)})
                </p>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={insuranceOptIn}
                  onChange={(e) => setInsuranceOptIn(e.target.checked)}
                  className="w-4 h-4 border-2 border-[#660099] bg-black text-[#00ff00]"
                />
                <span className="text-sm font-pixel-alt text-purple-muted" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Add buyer protection (5%)
                </span>
              </label>
            </div>
          )}
          <Button
            onClick={handleDepositToEscrow}
            disabled={processing}
            className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black"
          >
            {processing ? 'Depositing...' : `Deposit ${(listing.price + (insuranceOptIn ? listing.price * 0.05 : 0)).toFixed(4)} ${listing.price_token || 'SOL'} to Escrow`}
          </Button>
        </div>
      )}

      {listing.escrow_status === 'pending' && userRole === 'seller' && (
        <>
          {daysLeft !== null && !showTrackingForm && (
            <p className="text-sm font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              {isOverdue ? (
                <span className="text-red-500">⚠️ Deadline passed. Add tracking immediately to avoid dispute.</span>
              ) : daysLeft <= 2 ? (
                <span className="text-amber-400">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left to add tracking</span>
              ) : (
                <span className="text-[#00ff00]">{daysLeft} days left to add tracking</span>
              )}
            </p>
          )}
          {!showTrackingForm ? (
            <Button
              onClick={handleMarkShipped}
              className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black"
            >
              Mark as Shipped (add tracking)
            </Button>
          ) : (
            <ManualTrackingForm listingId={listing.id} onTrackingAdded={handleTrackingAdded} />
          )}
        </>
      )}

      {listing.escrow_status === 'shipped' && userRole === 'buyer' && (
        <>
          {listing.tracking_number && (
            <p className="text-sm text-[#00ff00] mb-2">
              📦 Tracking: {listing.tracking_number} ({listing.shipping_carrier})
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleConfirmReceipt}
              disabled={processing}
              className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black"
            >
              {processing ? 'Confirming...' : 'Confirm Receipt'}
            </Button>
            <Button
              onClick={handleReportNotReceived}
              disabled={processing}
              variant="outline"
              className="border-2 border-amber-400 text-amber-400 hover:bg-amber-400/20"
            >
              Item not received
            </Button>
          </div>
        </>
      )}

      {listing.escrow_status === 'disputed' && (
        <p className="text-sm text-amber-400">
          ⚠️ Dispute opened. Admin will review and approve release or refund.
        </p>
      )}

      {listing.escrow_status === 'completed' && (
        <p className="text-sm text-[#00ff00]">✓ Transaction completed.</p>
      )}
    </div>
  )
}
