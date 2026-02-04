'use client'

import { useState, useCallback } from 'react'
import Header from '@/components/Header'
import { Keypair } from '@solana/web3.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function VanityAddressPage() {
  const [suffix, setSuffix] = useState('pump')
  const [result, setResult] = useState<{ publicKey: string; secretKey: string } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    const target = suffix.toLowerCase().trim()
    if (!target || target.length > 8) {
      setError('Suffix must be 1–8 characters')
      return
    }
    setResult(null)
    setError(null)
    setGenerating(true)
    setAttempts(0)
    const stopRef = { current: false }

    let count = 0
    const start = Date.now()

    const run = () => {
      if (stopRef.current) {
        setGenerating(false)
        return
      }
      for (let i = 0; i < 5000; i++) {
        if (stopRef.current) break
        const kp = Keypair.generate()
        const addr = kp.publicKey.toBase58()
        count++
        if (addr.toLowerCase().endsWith(target)) {
          setResult({
            publicKey: addr,
            secretKey: JSON.stringify(Array.from(kp.secretKey)),
          })
          setAttempts(count)
          setGenerating(false)
          return
        }
      }
      setAttempts(count)
      if (Date.now() - start > 60000) {
        setError(`No match after ${count.toLocaleString()} attempts in 60s. Try a shorter suffix.`)
        setGenerating(false)
        return
      }
      requestAnimationFrame(run)
    }
    const id = { run, stopRef }
    ;(window as unknown as { _vanityStop?: { stopRef: { current: boolean } } })._vanityStop = id
    run()
  }, [suffix])

  const stop = () => {
    const g = (window as unknown as { _vanityStop?: { stopRef: { current: boolean } } })._vanityStop
    if (g) g.stopRef.current = true
    setGenerating(false)
  }

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
          <span className="text-[#00ff00]">Faster?</span> Run locally:
          <br /><code className="text-[#aa77ee]">cd app &amp;&amp; npm run vanity pump</code> (uses all CPU cores)
          <br /><code className="text-[#aa77ee]">npm run vanity pump -- --background</code> (runs in background, writes to vanity-result.json)
          <br />Or install Solana CLI for 10-100x speed: <code className="text-[#aa77ee]">solana-keygen grind --ends-with pump:1</code>
        </p>

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="pump"
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
            className="max-w-[120px] font-mono"
          />
          <Button
            onClick={generating ? stop : generate}
            disabled={!suffix.trim()}
            className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black"
          >
            {generating ? 'Stop' : 'Generate'}
          </Button>
        </div>

        {generating && (
          <p className="text-sm text-[#660099] font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Trying… {attempts.toLocaleString()} attempts
          </p>
        )}

        {error && (
          <p className="text-sm text-amber-400 font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            {error}
          </p>
        )}

        {result && (
          <div className="p-4 border-2 border-[#660099] rounded bg-black/50 space-y-2">
            <p className="text-sm font-pixel-alt text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              ✓ Found after {attempts.toLocaleString()} attempts
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
