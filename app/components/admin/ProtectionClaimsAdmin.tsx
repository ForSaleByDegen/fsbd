'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Claim {
  id: string
  listing_id: string
  reason: string
  description: string | null
  evidence_url: string | null
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  payout_tx: string | null
  created_at: string
  listing_title?: string
  listing_price?: number
  listing_price_token?: string
  protection_amount?: number
  protection_token?: string
}

interface ProtectionClaimsAdminProps {
  adminWallet: string
}

const REASON_LABELS: Record<string, string> = {
  not_received: 'Item not received',
  not_as_described: 'Item not as described',
  other: 'Other issue',
}

export default function ProtectionClaimsAdmin({ adminWallet }: ProtectionClaimsAdminProps) {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [updating, setUpdating] = useState<string | null>(null)
  const [payoutTx, setPayoutTx] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const loadClaims = async () => {
    if (!adminWallet) return
    try {
      setLoading(true)
      setError(null)
      const url = `/api/admin/protection-claims?wallet=${encodeURIComponent(adminWallet)}&status=${statusFilter}`
      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to load claims')
      }
      const data = await res.json()
      setClaims(data.claims ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClaims()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminWallet, statusFilter])

  const handleReview = async (claimId: string, status: 'approved' | 'rejected') => {
    if (!adminWallet) return
    setUpdating(claimId)
    setError(null)
    try {
      const body: { wallet: string; claimId: string; status: string; payoutTx?: string } = {
        wallet: adminWallet,
        claimId,
        status,
      }
      if (status === 'approved' && payoutTx[claimId]) {
        body.payoutTx = payoutTx[claimId]
      }
      const res = await fetch('/api/admin/protection-claims', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update')
      }
      await loadClaims()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00ff00]"></div>
        <p className="text-purple-readable font-pixel-alt mt-2 text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Loading claims...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-purple-readable font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Filter:
        </span>
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 border-2 font-pixel-alt text-sm ${
              statusFilter === s
                ? 'border-[#00ff00] text-[#00ff00] bg-black/50'
                : 'border-[#660099] text-purple-readable hover:border-[#00ff00] hover:text-[#00ff00]'
            }`}
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-red-500 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {error}
        </p>
      )}

      {claims.length === 0 ? (
        <p className="text-purple-readable font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          No protection claims found.
        </p>
      ) : (
        <div className="space-y-4">
          {claims.map((c) => (
            <div
              key={c.id}
              className="p-4 border-2 border-[#660099] bg-black/50 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/listings/${c.listing_id}`}
                    className="text-[#00ff00] font-pixel-alt text-sm hover:underline"
                    style={{ fontFamily: 'var(--font-pixel-alt)' }}
                  >
                    {c.listing_title || c.listing_id}
                  </Link>
                  <p className="text-purple-readable font-pixel-alt text-xs mt-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                    Reason: {REASON_LABELS[c.reason] ?? c.reason} • Amount: {c.protection_amount ?? '—'} {c.protection_token ?? 'SOL'}
                  </p>
                  {c.description && (
                    <p className="text-[#ff00ff] font-pixel-alt text-xs mt-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                      {c.description}
                    </p>
                  )}
                  <p className="text-purple-readable font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                    Filed {new Date(c.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`font-pixel-alt text-xs px-2 py-1 ${
                    c.status === 'pending'
                      ? 'text-amber-400'
                      : c.status === 'approved'
                      ? 'text-[#00ff00]'
                      : 'text-red-500'
                  }`}
                  style={{ fontFamily: 'var(--font-pixel-alt)' }}
                >
                  {c.status}
                </span>
              </div>

              {c.status === 'pending' && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#660099]/50">
                  <input
                    type="text"
                    placeholder="Payout tx (optional)"
                    value={payoutTx[c.id] ?? ''}
                    onChange={(e) => setPayoutTx((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    className="flex-1 min-w-[200px] bg-black border border-[#660099] text-[#00ff00] text-xs p-2"
                    style={{ fontFamily: 'var(--font-pixel-alt)' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleReview(c.id, 'approved')}
                    disabled={!!updating}
                    className="px-3 py-1 border-2 border-[#00ff00] text-[#00ff00] font-pixel-alt text-sm disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-pixel-alt)' }}
                  >
                    {updating === c.id ? '...' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReview(c.id, 'rejected')}
                    disabled={!!updating}
                    className="px-3 py-1 border-2 border-red-500 text-red-500 font-pixel-alt text-sm disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-pixel-alt)' }}
                  >
                    {updating === c.id ? '...' : 'Reject'}
                  </button>
                </div>
              )}

              {(c.status === 'approved' || c.status === 'rejected') && c.reviewed_at && (
                <p className="text-purple-readable font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Reviewed {new Date(c.reviewed_at).toLocaleString()}
                  {c.payout_tx && (
                    <span> • Payout: <code className="text-[#00ff00]">{c.payout_tx}</code></span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
