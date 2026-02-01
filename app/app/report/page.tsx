'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { uploadMultipleImagesToIPFS } from '@/lib/pinata'

export default function ReportPage() {
  const { publicKey } = useWallet()
  const [description, setDescription] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [txSignature, setTxSignature] = useState('')
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || description.trim().length < 10) {
      setError('Please describe the issue (at least 10 characters)')
      return
    }
    setLoading(true)
    setError(null)
    try {
      let screenshotUrls: string[] = []
      if (screenshots.length > 0) {
        screenshotUrls = await uploadMultipleImagesToIPFS(screenshots)
      }
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          error_message: errorMessage.trim() || undefined,
          tx_signature: txSignature.trim() || undefined,
          screenshot_urls: screenshotUrls.length ? screenshotUrls : undefined,
          page_url: typeof window !== 'undefined' ? window.location.href : undefined,
          wallet: publicKey?.toString(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setSent(true)
      setDescription('')
      setErrorMessage('')
      setTxSignature('')
      setScreenshots([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-2xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full">

        <div className="pixel-box bg-black border-2 sm:border-4 border-[#660099] p-4 sm:p-6 md:p-8">
          <h1 className="text-2xl sm:text-3xl font-pixel text-[#00ff00] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
            Bug Report
          </h1>
          <p className="text-[#aa77ee] font-pixel-alt text-sm mb-6" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Report errors, failed transactions, or issues. Include screenshots or tx signatures when helpful.
          </p>

          {sent ? (
            <div className="p-4 bg-green-900/30 border-2 border-green-600 rounded">
              <p className="text-[#00ff00] font-pixel-alt">Thanks! Your report was submitted. We&apos;ll look into it.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-pixel-alt text-[#00ff00] mb-1">Description *</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What happened? What were you trying to do?"
                  rows={4}
                  required
                  minLength={10}
                  className="bg-black border-2 border-[#660099] text-[#00ff00] w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-pixel-alt text-[#00ff00] mb-1">Error message (optional)</label>
                <Textarea
                  value={errorMessage}
                  onChange={(e) => setErrorMessage(e.target.value)}
                  placeholder="Paste the exact error message you saw"
                  rows={2}
                  className="bg-black border-2 border-[#660099] text-[#00ff00] w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-pixel-alt text-[#00ff00] mb-1">Transaction signature (optional)</label>
                <Input
                  value={txSignature}
                  onChange={(e) => setTxSignature(e.target.value)}
                  placeholder="Paste failed tx signature"
                  className="bg-black border-2 border-[#660099] text-[#00ff00]"
                />
              </div>

              <div>
                <label className="block text-sm font-pixel-alt text-[#00ff00] mb-1">Screenshots (optional)</label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setScreenshots(Array.from(e.target.files || []))}
                  className="bg-black border-2 border-[#660099] text-[#aa77ee]"
                />
                <p className="text-xs text-[#aa77ee] mt-1">Upload screenshots of the error or failed transaction</p>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
