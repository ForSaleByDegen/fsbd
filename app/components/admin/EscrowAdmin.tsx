'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface EscrowRow {
  id: string
  title: string
  price: number
  price_token: string | null
  status: string
  escrow_status: string
  escrow_pda: string | null
  escrow_amount: number | null
  wallet_address: string | null
  buyer_wallet_address: string | null
  tracking_number: string | null
  shipping_carrier: string | null
  escrow_deposited_at: string | null
  shipped_at: string | null
  received_at: string | null
  created_at: string
}

interface EscrowAdminProps {
  adminWallet: string
}

export default function EscrowAdmin({ adminWallet }: EscrowAdminProps) {
  const [escrows, setEscrows] = useState<EscrowRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'release' | 'refund'>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadEscrows = async () => {
    if (!adminWallet) return
    try {
      setLoading(true)
      setError(null)
      const url = `/api/admin/escrow?wallet=${encodeURIComponent(adminWallet)}&filter=${filter}`
      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to load escrows')
      }
      const data = await res.json()
      setEscrows(data.escrows ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEscrows()
  }, [adminWallet, filter])

  const handleApprove = async (listingId: string, action: 'release' | 'refund') => {
    if (!adminWallet) return
    setUpdating(listingId)
    setError(null)
    try {
      const res = await fetch('/api/admin/escrow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: adminWallet, listingId, action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve')
      }
      alert(data.message || 'Approved')
      await loadEscrows()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00ff00]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-pixel-alt text-[#aa77ee]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Filter:
        </span>
        {(['all', 'release', 'refund'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 border-2 font-pixel-alt text-sm ${
              filter === f
                ? 'border-[#00ff00] text-[#00ff00] bg-black/50'
                : 'border-[#660099] text-[#660099] hover:border-[#00ff00] hover:text-[#00ff00]'
            }`}
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            {f === 'release' ? 'Awaiting release' : f === 'refund' ? 'Awaiting refund' : 'All'}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500 text-red-400 text-sm rounded">
          {error}
        </div>
      )}

      {escrows.length === 0 ? (
        <p className="text-[#aa77ee] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          No escrows need admin action.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-[#660099] text-left text-sm">
            <thead>
              <tr className="border-b border-[#660099] bg-[#660099]/20">
                <th className="p-2 font-pixel text-[#ff00ff]">Listing</th>
                <th className="p-2 font-pixel text-[#ff00ff]">Amount</th>
                <th className="p-2 font-pixel text-[#ff00ff]">Status</th>
                <th className="p-2 font-pixel text-[#ff00ff]">Tracking</th>
                <th className="p-2 font-pixel text-[#ff00ff]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {escrows.map((e) => (
                <tr key={e.id} className="border-b border-[#660099]/50">
                  <td className="p-2">
                    <Link
                      href={`/listings/${e.id}`}
                      className="text-[#00ff00] hover:underline"
                    >
                      {e.title}
                    </Link>
                  </td>
                  <td className="p-2 text-[#aa77ee]">
                    {e.escrow_amount ?? e.price} {e.price_token || 'SOL'}
                  </td>
                  <td className="p-2">
                    <span className={e.escrow_status === 'disputed' ? 'text-amber-400' : 'text-[#00ff00]'}>
                      {e.escrow_status}
                    </span>
                  </td>
                  <td className="p-2 text-xs">
                    {e.tracking_number
                      ? `${e.tracking_number}${e.shipping_carrier ? ` (${e.shipping_carrier})` : ''}`
                      : '—'}
                  </td>
                  <td className="p-2">
                    {e.escrow_status === 'completed' && (
                      <button
                        onClick={() => handleApprove(e.id, 'release')}
                        disabled={updating === e.id}
                        className="px-2 py-1 border border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20 font-pixel-alt text-xs disabled:opacity-50"
                        style={{ fontFamily: 'var(--font-pixel-alt)' }}
                      >
                        {updating === e.id ? '...' : 'Approve release'}
                      </button>
                    )}
                    {e.escrow_status === 'disputed' && (
                      <button
                        onClick={() => handleApprove(e.id, 'refund')}
                        disabled={updating === e.id}
                        className="px-2 py-1 border border-amber-400 text-amber-400 hover:bg-amber-400/20 font-pixel-alt text-xs disabled:opacity-50"
                        style={{ fontFamily: 'var(--font-pixel-alt)' }}
                      >
                        {updating === e.id ? '...' : 'Approve refund'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-[#660099] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Admin approval updates DB state. On-chain release/refund requires the deployed Anchor escrow program.
      </p>
    </div>
  )
}
