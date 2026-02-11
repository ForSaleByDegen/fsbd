'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PwaWalletHint from '@/components/PwaWalletHint'
import BrowserValidatorRunner from '@/components/BrowserValidatorRunner'
import ValidatorApyCalculator from '@/components/ValidatorApyCalculator'

type PoolStats = { totalValidators: number; totalStaked: number }
type RewardsInfo = { enabled: boolean; current_reward_per_job: number }
type MyStatus = { registered: boolean; endpoint_url?: string; stake_amount?: number; status?: string; validator_type?: string; jobs_completed?: number; total_earned?: number }
type MyJob = { id: string; status: string; created_at: string; claimed_at: string | null; completed_at: string | null; reward: number }

export default function ValidatorsPage() {
  const { connected, publicKey } = useWallet()
  const wallet = publicKey?.toString() ?? null

  const [whitelisted, setWhitelisted] = useState<boolean | null>(null)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [poolStats, setPoolStats] = useState<PoolStats>({ totalValidators: 0, totalStaked: 0 })
  const [rewardsInfo, setRewardsInfo] = useState<RewardsInfo>({ enabled: false, current_reward_per_job: 0 })
  const [myStatus, setMyStatus] = useState<MyStatus | null>(null)
  const [validatorMode, setValidatorMode] = useState<'endpoint' | 'browser'>('browser')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [stakeAmount, setStakeAmount] = useState('10000000')
  const [balance, setBalance] = useState<number | null>(null)
  const [registering, setRegistering] = useState(false)
  const [unregistering, setUnregistering] = useState(false)
  const [checkingBalance, setCheckingBalance] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [myJobs, setMyJobs] = useState<MyJob[]>([])
  const [releasingStuck, setReleasingStuck] = useState(false)
  const [refreshingStatus, setRefreshingStatus] = useState(false)

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
      setMyStatus({ registered: !!meRes.registered, endpoint_url: meRes.endpoint_url, stake_amount: meRes.stake_amount, status: meRes.status, validator_type: meRes.validator_type, jobs_completed: meRes.jobs_completed ?? 0, total_earned: meRes.total_earned ?? 0 })
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

  useEffect(() => {
    let cancelled = false
    fetch('/api/validators/rewards-info')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setRewardsInfo({ enabled: !!data.enabled, current_reward_per_job: data.current_reward_per_job ?? 0 })
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const canSee = connected && (whitelisted === true || userIsAdmin)
    if (!wallet || !canSee) {
      setMyJobs([])
      return
    }
    let cancelled = false
    fetch(`/api/validators/jobs/my?wallet=${encodeURIComponent(wallet)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.jobs)) setMyJobs(data.jobs)
      })
      .catch(() => { if (!cancelled) setMyJobs([]) })
    return () => { cancelled = true }
  }, [wallet, connected, whitelisted, userIsAdmin, myStatus?.jobs_completed])

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
    if (!wallet) return
    const isBrowser = validatorMode === 'browser'
    if (!isBrowser && !endpointUrl.trim()) return
    const stake = parseInt(stakeAmount, 10)
    const MIN_STAKE = 10_000_000
    if (!Number.isFinite(stake) || stake < MIN_STAKE) {
      setError(`Minimum stake: ${MIN_STAKE.toLocaleString()} $FSBD`)
      return
    }
    setRegistering(true)
    setError(null)
    setSuccess(null)
    try {
      const body = isBrowser
        ? { wallet, validator_type: 'browser', stake_amount: stake }
        : { wallet, endpoint_url: endpointUrl.trim(), stake_amount: stake }
      const res = await fetch('/api/validators/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      setSuccess('Registered as validator')
      setMyStatus((prev) => ({ ...prev, registered: true, endpoint_url: isBrowser ? undefined : endpointUrl.trim(), stake_amount: stake, status: 'active', validator_type: isBrowser ? 'browser' : 'endpoint', jobs_completed: prev?.jobs_completed ?? 0, total_earned: prev?.total_earned ?? 0 }))
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
                Own the AI. Get paid for it.
              </h3>
              <p>
                Every other app rents AI from OpenAI, Google, Anthropic — pay per request, hit limits, zero control. $FSBD flips the script: the validator pool is community-owned compute. You run the model. You earn $FSBD. Fees from Snap to Compare and listing creation flow into the pool, so the more people use the platform, the more validators earn. No third-party API. No middleman. Just you, your GPU or browser, and the rewards.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
                How it works
              </h2>
              <ol className="list-decimal list-inside space-y-2 mb-3">
                <li><strong>Connect wallet</strong> — You must be whitelisted. Stake $FSBD and register as a validator.</li>
                <li><strong>Choose your path</strong> — <strong>Browser:</strong> No install. Run the vision model in your browser (Phi-3.5). <strong>Endpoint:</strong> Download ai-service.zip, run Ollama + llava on your GPU server, expose a URL.</li>
                <li><strong>Stay online</strong> — Browser: Keep the validators tab open and click &quot;Run in browser.&quot; Endpoint: Keep your server running.</li>
                <li><strong>Get jobs</strong> — When a seller uses Snap to Compare (photograph an item for AI listing help), we send that image to validators. Browser validators poll for jobs; endpoint validators receive HTTP requests.</li>
                <li><strong>Run the AI</strong> — Your node analyzes the image and returns title, description, price, keywords. We validate the response and pass it to the seller.</li>
                <li><strong>Earn $FSBD</strong> — Validators earn for serving requests. Early supporters get treasury payouts; fees from Snap-to-Compare fund the pool over time.</li>
              </ol>
              <p className="text-xs text-purple-muted mb-2">
                We validate all responses before showing them to users. No third-party APIs (Gemini, etc.) — the AI runs on hardware you control.
              </p>
              <Link href="/docs/how-it-works#validators" className="text-xs text-cyan-400 hover:text-[#00ff00] underline">
                Learn more in How It Works →
              </Link>
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
              <ValidatorApyCalculator
                totalStaked={poolStats.totalStaked}
                totalValidators={Math.max(1, poolStats.totalValidators)}
                rewardPerJob={rewardsInfo.current_reward_per_job || 10}
                onStakeChange={(v) => setStakeAmount(String(v))}
              />
            </section>

            <section>
              <h2 className="text-lg font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
                Run in browser (no download)
              </h2>
              <p className="text-xs text-purple-muted mb-2">
                Registration is persistent. If &quot;Run in browser&quot; fails (WebGPU, model load), reload and try again — the tab must stay open while validating.
              </p>
              <p className="mb-2 text-sm">
                Easiest option. Register as a browser validator below, then click &quot;Run in browser.&quot; The vision model (Phi-3.5) loads in your tab via WebGPU. First time: ~2GB download. Keep the tab open to poll for jobs — when a seller uses Snap to Compare, you&apos;ll get the image, run inference, and earn.
              </p>
              <p className="mb-3 text-xs text-purple-muted">Requires Chrome, Edge, or Safari 18+ (WebGPU).</p>
              {myStatus?.registered && myStatus.validator_type === 'browser' && wallet && (
                <BrowserValidatorRunner wallet={wallet} />
              )}
              {(!myStatus?.registered || myStatus.validator_type !== 'browser') && (
                <p className="text-xs text-purple-muted">Register as a browser validator below, then come back here.</p>
              )}
            </section>

            <section>
              <h2 className="text-lg font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
                Or download package (GPU server)
              </h2>
              <p className="mb-2 text-sm">
                For more power: run Ollama + llava on your own GPU. Download the package, unzip, install Ollama and pull llava, run the server. Expose it via ngrok or a public URL, then register that endpoint below. We call your server directly when a seller uses Snap to Compare.
              </p>
              <a href="/ai-service.zip" download="ai-service.zip">
                <Button variant="outline" className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20">
                  Download ai-service.zip
                </Button>
              </a>
              <p className="mt-2 text-xs">README inside has full setup instructions.</p>
            </section>

            {myStatus?.registered ? (
              <section className="p-4 border border-[#00ff00]/40 rounded-lg bg-[#00ff00]/5">
                <h2 className="text-lg font-pixel text-[#00ff00] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                  Your status
                </h2>
                <p>Type: {myStatus.validator_type === 'browser' ? 'Browser validator' : 'Endpoint'}</p>
                {myStatus.endpoint_url && <p>Endpoint: {myStatus.endpoint_url}</p>}
                <p>Staked: {formatNum(myStatus.stake_amount ?? 0)} $FSBD</p>
                <p>Jobs completed: {myStatus.jobs_completed ?? 0}</p>
                <p>Total earned: {formatNum(myStatus.total_earned ?? 0)} $FSBD</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mb-2 border-[#660099] text-purple-readable hover:border-[#00ff00] hover:text-[#00ff00]"
                  disabled={refreshingStatus || !wallet}
                  onClick={async () => {
                    if (!wallet) return
                    setRefreshingStatus(true)
                    try {
                      const [meRes, jobsRes] = await Promise.all([
                        fetch(`/api/validators/me?wallet=${encodeURIComponent(wallet)}`).then((r) => r.json()),
                        fetch(`/api/validators/jobs/my?wallet=${encodeURIComponent(wallet)}`).then((r) => r.json()),
                      ])
                      setMyStatus((s) => (s ? { ...s, jobs_completed: meRes.jobs_completed ?? s.jobs_completed ?? 0, total_earned: meRes.total_earned ?? s.total_earned ?? 0 } : s))
                      if (Array.isArray(jobsRes.jobs)) setMyJobs(jobsRes.jobs)
                    } finally {
                      setRefreshingStatus(false)
                    }
                  }}
                >
                  {refreshingStatus ? '…' : 'Refresh status'}
                </Button>
                {myJobs.length > 0 && (
                  <div className="mt-3">
                    <h3 className="text-sm font-pixel text-cyan-400 mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>Your recent jobs</h3>
                    <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                      {myJobs.slice(0, 10).map((j) => (
                        <li key={j.id} className="flex justify-between gap-2">
                          <span className="truncate">{j.id.slice(0, 8)}…</span>
                          <span className={j.status === 'completed' ? 'text-[#00ff00]' : j.status === 'claimed' ? 'text-amber-400' : 'text-purple-muted'}>{j.status}</span>
                          {(j.reward ?? 0) > 0 && <span className="text-[#00ff00]">+{j.reward} $FSBD</span>}
                        </li>
                      ))}
                    </ul>
                    {myJobs.some((j) => j.status === 'claimed') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 border-amber-500 text-amber-400 hover:bg-amber-500/20"
                        disabled={releasingStuck || !wallet}
                        onClick={async () => {
                          if (!wallet) return
                          setReleasingStuck(true)
                          setError(null)
                          try {
                            const res = await fetch('/api/validators/jobs/release-stuck', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ wallet }),
                            })
                            const data = await res.json().catch(() => ({}))
                            if (res.ok && (data.released ?? 0) > 0) {
                              setSuccess(`Released ${data.released} stuck job(s) back to the pool`)
                              setError(null)
                              fetch(`/api/validators/me?wallet=${encodeURIComponent(wallet)}`).then((r) => r.json()).then((d) => setMyStatus((s) => (s ? { ...s, jobs_completed: d.jobs_completed ?? s.jobs_completed } : s)))
                              fetch(`/api/validators/jobs/my?wallet=${encodeURIComponent(wallet)}`).then((r) => r.json()).then((d) => Array.isArray(d.jobs) && setMyJobs(d.jobs))
                            } else if (!res.ok) {
                              setError(data.error || 'Failed to release')
                            }
                          } catch {
                            setError('Failed to release stuck jobs')
                          } finally {
                            setReleasingStuck(false)
                          }
                        }}
                      >
                        {releasingStuck ? '…' : 'Release stuck jobs'}
                      </Button>
                    )}
                  </div>
                )}
                <p className="text-xs text-purple-muted">
                  {rewardsInfo.enabled && rewardsInfo.current_reward_per_job > 0
                    ? `Earnings: ${rewardsInfo.current_reward_per_job} $FSBD per job (distribution slows over time)`
                    : 'Earnings: Coming soon (rewards from completed jobs)'}
                </p>
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
                    <label className="block text-sm mb-2">Validator type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="validatorMode"
                          checked={validatorMode === 'browser'}
                          onChange={() => setValidatorMode('browser')}
                        />
                        Browser (no download)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="validatorMode"
                          checked={validatorMode === 'endpoint'}
                          onChange={() => setValidatorMode('endpoint')}
                        />
                        Endpoint (run server)
                      </label>
                    </div>
                  </div>
                  {validatorMode === 'endpoint' && (
                    <div>
                      <label className="block text-sm mb-1">Endpoint URL</label>
                      <Input
                        placeholder="https://ai.example.com or http://1.2.3.4:8080"
                        value={endpointUrl}
                        onChange={(e) => setEndpointUrl(e.target.value)}
                        className="bg-black/50 border-cyan-500/40"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm mb-1">Stake amount ($FSBD)</label>
                    <Input
                      type="number"
                      placeholder="10000000"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="bg-black/50 border-cyan-500/40"
                    />
                    <p className="text-xs mt-1">Minimum: 10,000,000 $FSBD. You must hold at least this much in your wallet.</p>
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
                    disabled={registering || (validatorMode === 'endpoint' && !endpointUrl.trim())}
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
