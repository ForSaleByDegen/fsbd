'use client'

import { useState } from 'react'

interface ListerAirdropAdminProps {
  adminWallet: string
}

export default function ListerAirdropAdmin({ adminWallet }: ListerAirdropAdminProps) {
  const [action, setAction] = useState<'idle' | 'snapshot' | 'execute'>('idle')
  const [snapshotId, setSnapshotId] = useState('')
  const [result, setResult] = useState<{
    ok?: boolean
    action?: string
    snapshotId?: string
    recipients?: number
    sent?: number
    failed?: number
    message?: string
    error?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSnapshot = async () => {
    if (!adminWallet) return
    setAction('snapshot')
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/lister-airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: adminWallet, action: 'snapshot' }),
      })
      const data = await res.json().catch(() => ({}))
      setResult(data)
      if (data.snapshotId) setSnapshotId(data.snapshotId)
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : 'Request failed' })
    } finally {
      setLoading(false)
      setAction('idle')
    }
  }

  const handleExecute = async () => {
    if (!adminWallet || !snapshotId.trim()) {
      alert('Enter a snapshot ID from a previous snapshot run.')
      return
    }
    if (!confirm(`Send 4200.69 $FSBD to each pending recipient in snapshot ${snapshotId}?`)) return
    setAction('execute')
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/lister-airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: adminWallet,
          action: 'execute',
          snapshotId: snapshotId.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      setResult(data)
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : 'Request failed' })
    } finally {
      setLoading(false)
      setAction('idle')
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-4 border-2 border-[#660099] bg-black/50">
        <h3 className="font-pixel text-[#00ff00] mb-2 text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>
          Lister Airdrop
        </h3>
        <p className="text-sm text-[#aa77ee] font-pixel-alt mb-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Snapshot unique listers and airdrop 4200.69 $FSBD to each. Requires{' '}
          <code className="text-[#00ff00]">AIRDROP_SOURCE_KEYPAIR_BASE64</code> env var and migration_lister_airdrop.sql run.
        </p>

        <div className="flex flex-wrap gap-4 mb-4">
          <button
            onClick={handleSnapshot}
            disabled={loading}
            className="px-4 py-2 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20 font-pixel-alt disabled:opacity-50"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            {loading && action === 'snapshot' ? 'Creating snapshot...' : '1. Snapshot listers'}
          </button>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Snapshot ID"
              value={snapshotId}
              onChange={(e) => setSnapshotId(e.target.value)}
              className="bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm p-2 min-w-[200px]"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            />
            <button
              onClick={handleExecute}
              disabled={loading || !snapshotId.trim()}
              className="px-4 py-2 border-2 border-amber-500 text-amber-400 hover:bg-amber-500/20 font-pixel-alt disabled:opacity-50"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              {loading ? 'Sending...' : '2. Execute airdrop'}
            </button>
          </div>
        </div>

        {result && (
          <div
            className={`p-3 border-2 font-pixel-alt text-sm ${
              result.error ? 'border-red-500 text-red-400' : 'border-[#00ff00] text-[#00ff00]'
            }`}
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            {result.error && <p>Error: {result.error}</p>}
            {result.message && <p>{result.message}</p>}
            {result.recipients != null && <p>Recipients: {result.recipients}</p>}
            {(result.sent != null || result.failed != null) && (
              <p>
                Sent: {result.sent ?? 0}, Failed: {result.failed ?? 0}
              </p>
            )}
            {result.snapshotId && <p>Snapshot ID: {result.snapshotId}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
