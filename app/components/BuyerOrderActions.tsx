'use client'

import { useState } from 'react'

interface BuyerOrderActionsProps {
  listingId: string
  walletAddress: string | null
  buyerConfirmedReceivedAt: string | null | undefined
  onUpdated: () => void
  compact?: boolean
  hasProtection?: boolean
  claimStatus?: string
}

const CLAIM_REASONS = [
  { value: 'not_received', label: 'Item not received' },
  { value: 'not_as_described', label: 'Item not as described' },
  { value: 'other', label: 'Other issue' },
] as const

export default function BuyerOrderActions({
  listingId,
  walletAddress,
  buyerConfirmedReceivedAt,
  onUpdated,
  compact = false,
  hasProtection = false,
  claimStatus,
}: BuyerOrderActionsProps) {
  const [confirming, setConfirming] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [claimReason, setClaimReason] = useState<(typeof CLAIM_REASONS)[number]['value']>('not_received')
  const [claimDescription, setClaimDescription] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)

  const canFileClaim = hasProtection && (claimStatus === 'none' || !claimStatus)
  const hasExistingClaim = claimStatus && claimStatus !== 'none'

  const confirmed = !!buyerConfirmedReceivedAt

  const handleConfirmReceipt = async () => {
    if (!walletAddress) return
    setConfirming(true)
    setError(null)
    try {
      const res = await fetch(`/api/listings/${listingId}/confirm-received`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletAddress }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setConfirming(false)
    }
  }

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletAddress) return
    setFeedbackLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/listings/${listingId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletAddress, rating, comment }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      setShowFeedback(false)
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setFeedbackLoading(false)
    }
  }

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletAddress) return
    setClaimLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/protection/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          listingId,
          reason: claimReason,
          description: claimDescription || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      setShowClaimForm(false)
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setClaimLoading(false)
    }
  }

  if (compact) {
    return (
      <div className="mt-2 space-y-1">
        {!confirmed && (
          <button
            type="button"
            onClick={handleConfirmReceipt}
            disabled={confirming || !walletAddress}
            className="text-xs text-[#00ff00] hover:underline font-pixel-alt disabled:opacity-50"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            {confirming ? 'Confirming...' : '✓ I received this item'}
          </button>
        )}
        {confirmed && !showFeedback && (
          <button
            type="button"
            onClick={() => setShowFeedback(true)}
            className="text-xs text-[#ff00ff] hover:underline font-pixel-alt"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            Leave feedback
          </button>
        )}
        {confirmed && showFeedback && (
          <form onSubmit={handleSubmitFeedback} className="space-y-2">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRating(r)}
                  className={`text-sm font-pixel-alt ${rating >= r ? 'text-[#00ff00]' : 'text-purple-readable'}`}
                  style={{ fontFamily: 'var(--font-pixel-alt)' }}
                >
                  ★
                </button>
              ))}
            </div>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment"
              className="w-full bg-black border border-[#660099] text-[#00ff00] text-xs p-2"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={feedbackLoading}
                className="text-xs px-3 py-1 border border-[#00ff00] text-[#00ff00] font-pixel-alt disabled:opacity-50"
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                {feedbackLoading ? 'Saving...' : 'Submit'}
              </button>
              <button
                type="button"
                onClick={() => setShowFeedback(false)}
                className="text-xs text-purple-readable font-pixel-alt"
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {canFileClaim && !showClaimForm && (
          <button
            type="button"
            onClick={() => setShowClaimForm(true)}
            className="text-xs text-amber-400 hover:underline font-pixel-alt"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            🛡️ File protection claim
          </button>
        )}
        {canFileClaim && showClaimForm && (
          <form onSubmit={handleSubmitClaim} className="space-y-2 mt-2">
            <select
              value={claimReason}
              onChange={(e) => setClaimReason(e.target.value as (typeof CLAIM_REASONS)[number]['value'])}
              className="w-full bg-black border border-[#660099] text-[#00ff00] text-xs p-2"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              {CLAIM_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <textarea
              value={claimDescription}
              onChange={(e) => setClaimDescription(e.target.value.slice(0, 2000))}
              placeholder="Describe the issue (optional)"
              rows={2}
              className="w-full bg-black border border-[#660099] text-[#00ff00] text-xs p-2 resize-none"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={claimLoading}
                className="text-xs px-3 py-1 border border-amber-400 text-amber-400 font-pixel-alt disabled:opacity-50"
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                {claimLoading ? 'Submitting...' : 'Submit claim'}
              </button>
              <button
                type="button"
                onClick={() => { setShowClaimForm(false); setError(null); }}
                className="text-xs text-purple-readable font-pixel-alt"
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {hasExistingClaim && (
          <span className="text-xs text-purple-readable font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Claim: {claimStatus}
          </span>
        )}
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </div>
    )
  }

  return (
    <div className="p-3 bg-black/50 border-2 border-[#660099] rounded space-y-2">
      {!confirmed ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={false}
            onChange={handleConfirmReceipt}
            disabled={confirming || !walletAddress}
            className="w-4 h-4"
          />
          <span className="text-[#00ff00] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            I received this item
          </span>
          {confirming && <span className="text-xs text-purple-readable">Confirming...</span>}
        </label>
      ) : (
        <>
          <p className="text-[#00ff00] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            ✓ Receipt confirmed
          </p>
          {!showFeedback ? (
            <button
              type="button"
              onClick={() => setShowFeedback(true)}
              className="text-sm text-[#ff00ff] hover:underline font-pixel-alt"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              Leave feedback for seller
            </button>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="space-y-2 mt-2">
              <p className="text-[#00ff00] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Rate this seller (1-5):
              </p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRating(r)}
                    className={`text-lg ${rating >= r ? 'text-[#00ff00]' : 'text-purple-readable'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional comment (helps other buyers)"
                className="w-full bg-black border-2 border-[#660099] text-[#00ff00] text-sm p-2"
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={feedbackLoading}
                  className="px-4 py-2 border-2 border-[#00ff00] text-[#00ff00] font-pixel-alt text-sm disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-pixel-alt)' }}
                >
                  {feedbackLoading ? 'Saving...' : 'Submit feedback'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFeedback(false)}
                  className="text-sm text-purple-readable font-pixel-alt"
                  style={{ fontFamily: 'var(--font-pixel-alt)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
      {canFileClaim && !showClaimForm && (
        <button
          type="button"
          onClick={() => setShowClaimForm(true)}
          className="text-sm text-amber-400 hover:underline font-pixel-alt mt-2 block"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          🛡️ File protection claim
        </button>
      )}
      {canFileClaim && showClaimForm && (
        <form onSubmit={handleSubmitClaim} className="space-y-2 mt-2">
          <p className="text-[#00ff00] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Reason for claim:
          </p>
          <select
            value={claimReason}
            onChange={(e) => setClaimReason(e.target.value as (typeof CLAIM_REASONS)[number]['value'])}
            className="w-full bg-black border-2 border-[#660099] text-[#00ff00] text-sm p-2"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            {CLAIM_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <textarea
            value={claimDescription}
            onChange={(e) => setClaimDescription(e.target.value.slice(0, 2000))}
            placeholder="Describe the issue (optional, max 2000 chars)"
            rows={3}
            className="w-full bg-black border-2 border-[#660099] text-[#00ff00] text-sm p-2 resize-none"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={claimLoading}
              className="px-4 py-2 border-2 border-amber-400 text-amber-400 font-pixel-alt text-sm disabled:opacity-50"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              {claimLoading ? 'Submitting...' : 'Submit claim'}
            </button>
            <button
              type="button"
              onClick={() => { setShowClaimForm(false); setError(null); }}
              className="text-sm text-purple-readable font-pixel-alt"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {hasExistingClaim && (
        <p className="text-purple-readable font-pixel-alt text-sm mt-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Protection claim: {claimStatus}
        </p>
      )}
      {error && <p className="text-red-500 text-xs font-pixel-alt">{error}</p>}
    </div>
  )
}
