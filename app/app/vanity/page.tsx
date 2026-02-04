'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Keypair } from '@solana/web3.js'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const REPORT_INTERVAL = 100_000
const NUM_WORKERS = typeof navigator !== 'undefined' ? Math.max(2, (navigator.hardwareConcurrency || 4) - 1) : 4

export default function VanityAddressPage() {
  const [suffix, setSuffix] = useState('pump')
  const [result, setResult] = useState<{ publicKey: string; secretKey: string; attempts: number } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const workersRef = useRef<Worker[]>([])
  const progressRef = useRef<number[]>([])
  const startTimeRef = useRef<number>(0)
  const totalAttemptsRef = useRef(0)

  const start = useCallback(async () => {
    const target = suffix.toLowerCase().trim()
    if (!target || target.length > 8) {
      setError('Suffix must be 1–8 characters')
      return
    }
    setResult(null)
    setError(null)
    setGenerating(true)
    setAttempts(0)
    totalAttemptsRef.current = 0
    progressRef.current = new Array(NUM_WORKERS).fill(0)
    startTimeRef.current = Date.now()

    // Try pool first
    try {
      const claimRes = await fetch(`/api/vanity-pool/claim?suffix=${encodeURIComponent(target)}`)
      if (claimRes.ok) {
        const data = await claimRes.json()
        if (data.claimed && data.publicKey && Array.isArray(data.secretKey)) {
          const kp = Keypair.fromSecretKey(Uint8Array.from(data.secretKey))
          setResult({
            publicKey: kp.publicKey.toBase58(),
            secretKey: JSON.stringify(Array.from(kp.secretKey)),
            attempts: 0,
          })
          setGenerating(false)
          return
        }
      }
    } catch { /* fall through to workers */ }

    workersRef.current.forEach((w) => w.terminate())
    workersRef.current = []
    const workers: Worker[] = []
    let resolved = false

    const done = (msg: { publicKey: string; secretKey: number[] }, workerAttempts: number) => {
      if (resolved) return
      resolved = true
      workers.forEach((w) => w.terminate())
      workersRef.current = []
      const total = totalAttemptsRef.current + workerAttempts
      setResult({
        publicKey: msg.publicKey,
        secretKey: JSON.stringify(msg.secretKey),
        attempts: total,
      })
      setGenerating(false)
    }

    for (let i = 0; i < NUM_WORKERS; i++) {
      try {
        const worker = new Worker(
          new URL('../../lib/vanity-grind-worker.ts', import.meta.url),
          { type: 'module' }
        )
        workers.push(worker)
        const workerIndex = i
        worker.onmessage = (e: MessageEvent<{ type?: string; publicKey?: string; secretKey?: number[]; attempts?: number }>) => {
          if (e.data?.type === 'progress' && typeof e.data.attempts === 'number') {
            progressRef.current[workerIndex] = e.data.attempts
            const sum = progressRef.current.reduce((a, b) => a + b, 0)
            totalAttemptsRef.current = sum
            setAttempts(sum)
          } else if (e.data?.publicKey && Array.isArray(e.data.secretKey)) {
            const workerAttempts = progressRef.current[workerIndex] || REPORT_INTERVAL
            done({ publicKey: e.data.publicKey, secretKey: e.data.secretKey }, workerAttempts)
          }
        }
        worker.onerror = () => {
          if (!resolved) {
            resolved = true
            workers.forEach((w) => w.terminate())
            workersRef.current = []
            setError('Worker error. Try again.')
            setGenerating(false)
          }
        }
        worker.postMessage({ suffix: target, reportInterval: REPORT_INTERVAL })
      } catch (err) {
        setError('Could not start workers. Try the CLI: npm run vanity pump')
        setGenerating(false)
        return
      }
    }
    workersRef.current = workers
  }, [suffix])

  const stop = useCallback(() => {
    workersRef.current.forEach((w) => w.terminate())
    workersRef.current = []
    setGenerating(false)
  }, [])

  useEffect(() => {
    return () => {
      workersRef.current.forEach((w) => w.terminate())
      workersRef.current = []
    }
  }, [])

  // Auto-start when page loads (user doesn't have to click Generate)
  useEffect(() => {
    const target = suffix.toLowerCase().trim()
    if (target && target.length <= 8 && !generating && !result) {
      start()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  const elapsed = generating && startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0
  const rate = elapsed > 0 && attempts > 0 ? Math.floor(attempts / elapsed) : 0

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-pixel text-[#00ff00] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
          Vanity Address Generator
        </h1>
        <p className="text-sm text-[#aa77ee] font-pixel-alt mb-4" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Generate a Solana wallet address ending in your chosen suffix (e.g. &quot;pump&quot;). Keys are generated locally — never sent to any server.
        </p>
        <p className="text-xs text-[#888] font-mono mb-6 p-3 rounded bg-black/30 border border-[#333] space-y-1">
          <span className="text-[#00ff00]">Faster?</span> Run locally: <code className="text-[#aa77ee]">cd app &amp;&amp; npm run vanity pump</code> or <code className="text-[#aa77ee]">solana-keygen grind --ends-with pump:1</code>
        </p>

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="pump"
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
            disabled={generating}
            className="max-w-[120px] font-mono"
          />
          <Button
            onClick={generating ? stop : start}
            disabled={!suffix.trim()}
            className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black"
          >
            {generating ? 'Stop' : 'Generate'}
          </Button>
        </div>

        {generating && (
          <div className="mb-4">
            <p className="text-sm text-[#660099] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              Trying… {attempts.toLocaleString()} attempts
              {rate > 0 && (
                <span className="text-[#00ff00] ml-2">
                  (~{rate.toLocaleString()}/sec, {NUM_WORKERS} workers)
                </span>
              )}
            </p>
            <p className="text-xs text-[#660099]/80 mt-1">No timeout — runs until found. Check the CLI for 10–100x speed.</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-amber-400 font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            {error}
          </p>
        )}

        {result && (
          <div className="p-4 border-2 border-[#660099] rounded bg-black/50 space-y-2">
            <p className="text-sm font-pixel-alt text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              ✓ Found{result.attempts > 0 ? ` after ${result.attempts.toLocaleString()} attempts` : ' (from pool)'}
            </p>
            <div>
              <label className="text-xs text-[#660099]">Public Key</label>
              <p className="font-mono text-sm break-all text-[#00ff00]">{result.publicKey}</p>
            </div>
            <div>
              <label className="text-xs text-[#660099]">Secret Key (JSON array — import into Phantom/Solflare)</label>
              <p className="font-mono text-xs break-all text-[#aa77ee] bg-black/50 p-2 rounded mt-1">
                {result.secretKey}
              </p>
            </div>
            <p className="text-xs text-amber-400 font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              ⚠️ Save your secret key securely. Anyone with it controls the wallet. Never share it.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
