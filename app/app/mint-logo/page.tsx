'use client'

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { Transaction } from '@solana/web3.js'

export default function MintLogoPage() {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const [config, setConfig] = useState<{ enabled: boolean; priceSol: number } | null>(null)
  const [step, setStep] = useState<'idle' | 'signing' | 'verifying' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [mintAddress, setMintAddress] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/mint-logo-nft/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({ enabled: false, priceSol: 0.01 }))
  }, [])

  const handleMint = async () => {
    if (!publicKey || !signTransaction) {
      setError('Connect your wallet to mint.')
      return
    }
    setError(null)
    setStep('signing')

    try {
      const prepRes = await fetch(
        `/api/mint-logo-nft/prepare?wallet=${encodeURIComponent(publicKey.toString())}`
      )
      if (!prepRes.ok) {
        const err = await prepRes.json().catch(() => ({}))
        throw new Error(err.error || prepRes.statusText || 'Could not prepare payment.')
      }
      const prep = (await prepRes.json()) as {
        transactionBase64: string
        blockhash: string
        lastValidBlockHeight: number
      }

      const binary = atob(prep.transactionBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const transaction = Transaction.from(bytes)

      const signed = await signTransaction(transaction)
      const serialized = signed.serialize()
      const signature = await connection.sendRawTransaction(serialized, {
        skipPreflight: false,
        maxRetries: 3,
      })

      await connection.confirmTransaction(
        { signature, blockhash: prep.blockhash, lastValidBlockHeight: prep.lastValidBlockHeight },
        'confirmed'
      )

      setStep('verifying')

      const verifyRes = await fetch('/api/mint-logo-nft/verify-and-mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txSignature: signature,
          wallet: publicKey.toString(),
        }),
      })
      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}))
        throw new Error(err.error || verifyRes.statusText || 'Verification failed.')
      }
      const data = (await verifyRes.json()) as { ok: boolean; mint?: string }
      setMintAddress(data.mint || null)
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStep('error')
    }
  }

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1
          className="text-2xl sm:text-3xl font-pixel text-[#00ff00] mb-6"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          FSBD Logo NFT
        </h1>

        {config && !config.enabled && (
          <p
            className="text-purple-readable font-pixel-alt text-sm mb-4"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            Logo NFT minting is not available right now.
          </p>
        )}

        {config?.enabled && (
          <div className="space-y-6">
            <div className="p-4 bg-black/50 border-2 border-[#660099] rounded">
              <p
                className="text-purple-muted font-pixel-alt text-sm mb-2"
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                A small token of our appreciation for our users. Only a couple dollars to mint.
              </p>
              <p
                className="text-purple-readable font-pixel-alt text-xs mb-4"
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                Nothing is promised from minting. This is purely a collectible to show support for
                the platform. No perks, no utility — just appreciation.
              </p>
              <p
                className="text-[#00ff00] font-pixel-alt text-sm"
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                Price: {config.priceSol} SOL (~$2)
              </p>
            </div>

            {step === 'done' ? (
              <div className="p-4 bg-black/50 border-2 border-[#00ff00] rounded">
                <p
                  className="text-[#00ff00] font-pixel-alt text-sm mb-2"
                  style={{ fontFamily: 'var(--font-pixel-alt)' }}
                >
                  ✅ NFT minted and sent to your wallet!
                </p>
                {mintAddress && (
                  <a
                    href={`https://solscan.io/token/${mintAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#ff00ff] font-pixel-alt text-xs underline hover:text-[#00ff00]"
                    style={{ fontFamily: 'var(--font-pixel-alt)' }}
                  >
                    View on Solscan →
                  </a>
                )}
              </div>
            ) : (
              <button
                onClick={handleMint}
                disabled={!publicKey || step === 'signing' || step === 'verifying'}
                className="w-full sm:w-auto px-6 py-3 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                {step === 'signing' && 'Sign payment...'}
                {step === 'verifying' && 'Minting...'}
                {step === 'idle' && (publicKey ? 'Mint Logo NFT' : 'Connect wallet to mint')}
                {step === 'error' && 'Try again'}
              </button>
            )}

            {error && (
              <p
                className="text-red-400 font-pixel-alt text-sm"
                style={{ fontFamily: 'var(--font-pixel-alt)' }}
              >
                {error}
              </p>
            )}
          </div>
        )}

        <div className="mt-6">
          <Link href="/">
            <button
              className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt text-sm"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              Back to home
            </button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
