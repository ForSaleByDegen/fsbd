'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Keypair } from '@solana/web3.js'

export function useVanityGrind(suffix: string, enabled: boolean) {
  const [keypair, setKeypair] = useState<Keypair | null>(null)
  const [generating, setGenerating] = useState(false)
  const workerRef = useRef<Worker | null>(null)

  const start = useCallback(async () => {
    if (!enabled || !suffix.trim()) return
    const target = suffix.trim().toLowerCase().slice(0, 8)
    if (!target) return
    if (workerRef.current) workerRef.current.terminate()
    setKeypair(null)
    setGenerating(true)
    try {
      const claimRes = await fetch(`/api/vanity-pool/claim?suffix=${encodeURIComponent(target)}`)
      if (claimRes.ok) {
        const data = await claimRes.json()
        if (data.claimed && data.publicKey && Array.isArray(data.secretKey)) {
          const kp = Keypair.fromSecretKey(Uint8Array.from(data.secretKey))
          setKeypair(kp)
          setGenerating(false)
          return
        }
      }
      const worker = new Worker(
        new URL('./vanity-grind-worker.ts', import.meta.url),
        { type: 'module' }
      )
      workerRef.current = worker
      worker.onmessage = (e: MessageEvent<{ publicKey: string; secretKey: number[] }>) => {
        const { publicKey, secretKey } = e.data
        const kp = Keypair.fromSecretKey(Uint8Array.from(secretKey))
        setKeypair(kp)
        setGenerating(false)
        worker.terminate()
        workerRef.current = null
      }
      worker.onerror = () => {
        setGenerating(false)
        workerRef.current = null
      }
      worker.postMessage({ suffix: target })
    } catch {
      setGenerating(false)
    }
  }, [enabled, suffix])

  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setGenerating(false)
  }, [])

  const consume = useCallback(() => {
    setKeypair(null)
  }, [])

  useEffect(() => {
    if (enabled && suffix.trim()) {
      start()
    } else {
      stop()
    }
    return stop
  }, [enabled, suffix, start, stop])

  return { keypair, generating, start, stop, consume }
}
