'use client'

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountIdempotentInstruction, getMint } from '@solana/spl-token'
import { supabase, hashWalletAddress } from '@/lib/supabase'
import { transferToUserEscrowTx } from '@/lib/user-pda-wallet'
import { sendTransactionWithRebate, shouldUseRebate } from '@/lib/helius-rebate'
import { updateThreadEscrow } from '@/lib/chat'
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

  const handleDepositToEscrow = async () => {
    if (!publicKey || !signTransaction || !connection) {
      alert('Please connect your wallet')
      return
    }
    if (userRole !== 'buyer') return
    const totalAmount = listing.price
    const token = listing.price_token || 'SOL'

    try {
      setProcessing(true)

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

      const { transaction, escrowPda } = await transferToUserEscrowTx(
        publicKey,
        listing.wallet_address,
        totalAmount,
        token,
        connection
      )
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey
      const signed = await signTransaction(transaction)
      const serialized = signed.serialize()
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL

      const doSend = (opts: { skipPreflight: boolean }) =>
        shouldUseRebate() && rpcUrl
          ? sendTransactionWithRebate(serialized, publicKey.toString(), rpcUrl, {
              skipPreflight: opts.skipPreflight,
              maxRetries: 3,
            })
          : connection.sendRawTransaction(serialized, {
              skipPreflight: opts.skipPreflight,
              maxRetries: 3,
            })

      let signature: string
      try {
        signature = await doSend({ skipPreflight: false })
      } catch (sendErr: any) {
        if (sendErr?.message?.includes('Attempt to debit') || sendErr?.message?.includes('prior credit')) {
          const retry = confirm(
            'Simulation failed (RPC may report wrong balance). Retry with simulation skipped?'
          )
          if (retry) {
            signature = await doSend({ skipPreflight: true })
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
            escrow_amount: totalAmount,
            escrow_status: 'pending',
            buyer_wallet_address: publicKey.toString(),
          })
          .eq('id', listing.id)
      }
      await updateThreadEscrow(threadId, true, 'funded')
      alert(`Deposited ${totalAmount} ${token} to escrow.\n\nTx: ${signature}`)
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
      alert('Receipt confirmed. Funds will be released to seller (requires escrow program deployment).')
      onUpdate()
    } catch (err: any) {
      alert('Failed: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (!escrowAgreed && escrowStatus !== 'pending') return null

  return (
    <div className="mb-4 p-4 bg-[#660099]/20 border-2 border-[#660099] rounded">
      <h3 className="font-pixel text-[#ff00ff] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
        🔒 Optional Escrow
      </h3>
      <p className="text-xs text-[#00ff00] font-pixel-alt mb-3" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Both parties agreed to use escrow. Funds held until shipment and receipt are confirmed.
      </p>

      {!listing.escrow_pda && userRole === 'buyer' && (
        <Button
          onClick={handleDepositToEscrow}
          disabled={processing}
          className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black"
        >
          {processing ? 'Depositing...' : `Deposit ${listing.price} ${listing.price_token || 'SOL'} to Escrow`}
        </Button>
      )}

      {listing.escrow_status === 'pending' && userRole === 'seller' && (
        <>
          {!showTrackingForm ? (
            <Button
              onClick={handleMarkShipped}
              className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black"
            >
              Mark as Shipped (optional tracking)
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
          <Button
            onClick={handleConfirmReceipt}
            disabled={processing}
            className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black"
          >
            {processing ? 'Confirming...' : 'Confirm Receipt'}
          </Button>
        </>
      )}

      {listing.escrow_status === 'completed' && (
        <p className="text-sm text-[#00ff00]">✓ Transaction completed.</p>
      )}
    </div>
  )
}
