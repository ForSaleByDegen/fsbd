'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PwaWalletHint from '@/components/PwaWalletHint'

type PoolStats = { totalValidators: number; totalStaked: number }
type MyStatus = { registered: boolean; endpoint_url?: string; stake_amount?: number; status?: string }

export default function ValidatorsPage() {
  const { connected, publicKey } = useWallet()
  const wallet = publicKey?.toString() ?? null

  const [whitelisted, setWhitelisted] = useState<boolean | null>(null)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [poolStats, setPoolStats] = useState<PoolStats>({ totalValidators: 0, totalStaked: 0 })
  const [myStatus, setMyStatus] = useState<MyStatus | null>(null)
  const [endpointUrl, setEndpointUrl] = useState('')
  const [stakeAmount, setStakeAmount] = useState('10000')
  const [balance, setBalance] = useState<number | null>(null)
  const [registering, setRegistering] = useState(false)
  const [unregistering, setUnregistering] = useState(false)
  const [checkingBalance, setCheckingBalance] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!wallet) {
      setWhitelisted(null)
      setMyStatus(null)
      setUserIsAdmin(false)
      return
    }
    let cancelled = false
    Promise.all([
      fetch(`/api/validators/check-whitelist?wallet=${encodeURIComponent(wallet)}`).then((r) => r.json()),
      fetch(`/api/validators/me?wallet=${encodeURIComponent(wallet)}`).then((r) => r.json()),
      fetch(`/api/admin/check?wallet=${encodeURIComponent(wallet)}`).then((r) => r.json()),
    ]).then(([whitelistRes, meRes, adminRes]) => {
      if (cancelled) return
      setWhitelisted(!!whitelistRes.whitelisted)
      setMyStatus({ registered: !!meRes.registered, endpoint_url: meRes.endpoint_url, stake_amount: meRes.stake_amount, status: meRes.status })
      setUserIsAdmin(!!adminRes?.isAdmin)
    })
    return () => { cancelled = true }
  }, [wallet])

  useEffect(() => {
    let cancelled = false
    fetch('/api/validators')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setPoolStats({ totalValidators: data.totalValidators ?? 0, totalStaked: data.totalStaked ?? 0 })
      })
    return () => { cancelled = true }
  }, [myStatus])

  const checkBalance = async () => {
    if (!wallet) return
    setCheckingBalance(true)
    setError(null)
    try {
      const res = await fetch(`/api/config/balance-check?wallet=${encodeURIComponent(wallet)}`)
      const data = await res.json()
      setBalance(typeof data.balance === 'number' ? data.balance : null)
    } catch {
      setError('Failed to check balance')
    } finally {
      setCheckingBalance(false)
    }
  }

  const handleRegister = async () => {
    if (!wallet || !endpointUrl.trim()) return
    const stake = parseInt(stakeAmount, 10)
    if (!Number.isFinite(stake) || stake < 0) {
      setError('Enter a valid stake amount')
      return
    }
    setRegistering(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/validators/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, endpoint_url: endpointUrl.trim(), stake_amount: stake }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      setSuccess('Registered as validator')
      setMyStatus({ registered: true, endpoint_url: endpointUrl.trim(), stake_amount: stake, status: 'active' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  const handleUnregister = async () => {
    if (!wallet) return
    setUnregistering(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/validators/unregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unregister failed')
      setSuccess('Unregistered')
      setMyStatus({ registered: false })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unregister failed')
    } finally {
      setUnregistering(false)
    }
  }

  const formatNum = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n))

  const showFullPage = connected && (whitelisted === true || userIsAdmin)

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-pixel text-[#00ff00] mb-6" style={{ fontFamily: 'var(--font-pixel)' }}>
          AI Validator Pool
        </h1>

        {!showFullPage && (
          <div className="p-6 border-2 border-cyan-500/50 rounded-lg bg-cyan-500/5 font-pixel-alt text-purple-muted">
            <p className="text-lg mb-4">Coming soon.</p>
            <p>The validator pool is in private testing. Connect your wallet — if you&apos;re whitelisted or an admin, you&apos;ll see the full page.</p>
            {!connected && (
              <div className="mt-4">
                <PwaWalletHint />
              </div>
            )}
          </div>
        )}

        {showFullPage && (
          <div className="space-y-8 font-pixel-alt text-sm sm:text-base text-purple-muted">
            <section className="p-4 border-2 border-cyan-500/50 rounded-lg bg-cyan-500/5">
              <h2 className="text-lg font-pixel text-cyan-400 mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
                What you&apos;re doing as a validator
              </h2>
              <p className="mb-3">
                You run the vision AI that powers Snap to Compare — the feature that lets sellers photograph an item and get AI-suggested titles, descriptions, prices, and comps. When a user snaps a photo, we send that image to your node. Your GPU runs the model (Ollama/LLaVA), analyzes the item, and returns structured data. No third-party APIs. No Gemini. No Google. The AI runs on hardware you control, and you earn $FSBD for contributing.
              </p>
              <h3 className="text-base font-pixel text-[#ff00ff] mt-4 mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                How we&apos;re changing the way AI is funded and run
              </h3>
              <p>
                Most apps rely on closed APIs (OpenAI, Google, Anthropic). You pay per request, hit rate limits, and have no say in how the model behaves. $FSBD flips that: the validator pool is community-owned compute. Early supporters get treasury/airdrop payouts. As usage grows, fees from Snap-to-Compare and listing creation flow into the pool. Validators earn $FSBD for serving requests. The pool stays funded because the more people use the platform, the more they use AI — and the more they use AI, the more fees go back to validators. You&apos;re not renting someone else&apos;s API. You&apos;re running the AI and getting paid for it.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
                How it works
              </h2>
              <p>
                Stake $FSBD, run the vision AI package on your GPU, and register your endpoint. We route Snap-to-Compare requests to you. Early supporters get treasury payouts; later, fees fund the pool.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
                Pool stats
              </h2>
              <div className="flex gap-4">
                <span>{poolStats.totalValidators} active validators</span>
                <span>Total staked: {formatNum(poolStats.totalStaked)} $FSBD</span>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
                Download package
              </h2>
              <a href="/ai-service.zip" download="ai-service.zip">
                <Button variant="outline" className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20">
                  Download ai-service.zip
                </Button>
              </a>
              <p className="mt-2 text-xs">Unzip, install Ollama + llava, run the server. See README inside.</p>
            </section>

            {myStatus?.registered ? (
              <section className="p-4 border border-[#00ff00]/40 rounded-lg bg-[#00ff00]/5">
                <h2 className="text-lg font-pixel text-[#00ff00] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                  Your status
                </h2>
                <p>Endpoint: {myStatus.endpoint_url}</p>
                <p>Staked: {formatNum(myStatus.stake_amount ?? 0)} $FSBD</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-amber-500 text-amber-400 hover:bg-amber-500/20"
                  disabled={unregistering}
                  onClick={handleUnregister}
                >
                  {unregistering ? 'Unregistering…' : 'Unregister'}
                </Button>
              </section>
            ) : (
              <section>
                <h2 className="text-lg font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
                  Register as validator
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-1">Endpoint URL</label>
                    <Input
                      placeholder="https://ai.example.com or http://1.2.3.4:8080"
                      value={endpointUrl}
                      onChange={(e) => setEndpointUrl(e.target.value)}
                      className="bg-black/50 border-cyan-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Stake amount ($FSBD)</label>
                    <Input
                      type="number"
                      placeholder="10000"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="bg-black/50 border-cyan-500/40"
                    />
                    <p className="text-xs mt-1">You must hold at least this much $FSBD in your wallet.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-cyan-500 text-cyan-400"
                      disabled={checkingBalance || !wallet}
                      onClick={checkBalance}
                    >
                      {checkingBalance ? 'Checking…' : 'Check balance'}
                    </Button>
                    {balance != null && <span className="text-cyan-400">Balance: {formatNum(balance)} $FSBD</span>}
                  </div>
                  <Button
                    className="bg-cyan-500 text-black hover:bg-cyan-400"
                    disabled={registering || !endpointUrl.trim()}
                    onClick={handleRegister}
                  >
                    {registering ? 'Registering…' : 'Register as validator'}
                  </Button>
                </div>
              </section>
            )}

            {(error || success) && (
              <div className={`p-3 rounded border ${error ? 'border-red-500/40 bg-red-500/5 text-red-400' : 'border-[#00ff00]/40 bg-[#00ff00]/5 text-[#00ff00]'}`}>
                {error || success}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
