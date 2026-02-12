'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from './ui/button'

const MODEL_ID = 'Phi-3.5-vision-instruct-q4f16_1-MLC'
const POLL_INTERVAL_MS = 4000

type Status = 'idle' | 'loading' | 'ready' | 'validating' | 'error'

type Props = {
  wallet: string
  onStatus?: (status: Status, message?: string) => void
  onJobCompleted?: () => void
}

export default function BrowserValidatorRunner({ wallet, onStatus, onJobCompleted }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState<string>('')
  const [jobsCompleted, setJobsCompleted] = useState(0)
  const [verificationsCompleted, setVerificationsCompleted] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const stopRef = useRef(false)
  const engineRef = useRef<unknown>(null)

  const updateStatus = useCallback(
    (s: Status, msg?: string) => {
      setStatus(s)
      if (msg) setProgress(msg)
      onStatus?.(s, msg)
    },
    [onStatus]
  )

  const runValidator = useCallback(async () => {
    if (!wallet) return
    setError(null)
    stopRef.current = false
    updateStatus('loading', 'Loading WebLLM…')

    try {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
      updateStatus('loading', 'Loading vision model (first time: ~2GB download)…')

      const engine = await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (p: { progress: number; timeElapsed: number; text: string }) => {
          if (p.text) setProgress(p.text)
        },
      })
      engineRef.current = engine

      if (stopRef.current) return
      updateStatus('ready', 'Model loaded. Polling for jobs…')

      const poll = async () => {
        while (!stopRef.current) {
          try {
            // Try verification jobs first (lightweight) if no main job
            const vRes = await fetch(`/api/validators/verification-jobs/claim?wallet=${encodeURIComponent(wallet)}`)
            const vData = await vRes.json()
            if (vData.claimed && vData.job) {
              const { verification_job_id, primary_result } = vData.job as { verification_job_id: string; primary_result: string }
              let match = false
              try {
                const cleaned = (primary_result || '').replace(/```json\s*/gi, '').replace(/```/g, '').trim()
                const parsed = JSON.parse(cleaned) as Record<string, unknown>
                match = !!(parsed?.itemDescription || parsed?.suggestedTitle) && typeof (parsed?.category ?? parsed?.subcategory) !== 'undefined'
              } catch {
                match = false
              }
              await fetch(`/api/validators/verification-jobs/${verification_job_id}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet, match }),
              })
              setVerificationsCompleted((n) => n + 1)
              updateStatus('ready', 'Polling for jobs…')
              await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
              continue
            }

            const res = await fetch(`/api/validators/jobs/claim?wallet=${encodeURIComponent(wallet)}`)
            const data = await res.json()

            if (data.claimed && data.job) {
              const { id, image_base64, mime_type, prompt } = data.job as {
                id: string
                image_base64: string
                mime_type: string
                prompt: string
              }
              const releaseJob = () =>
                fetch(`/api/validators/jobs/${id}/fail`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ wallet }),
                })

              try {
                updateStatus('validating', 'Running inference…')
                const dataUrl = image_base64.startsWith('data:')
                  ? image_base64
                  : `data:${mime_type};base64,${image_base64}`

                const completion = await (engine as { chat: { completions: { create: (opts: unknown) => Promise<{ choices: { message?: { content?: string } }[] }> } } }).chat.completions.create({
                  model: MODEL_ID,
                  messages: [
                    {
                      role: 'user',
                      content: [
                        { type: 'image_url', image_url: { url: dataUrl } },
                        { type: 'text', text: prompt },
                      ],
                    },
                  ],
                  max_tokens: 400,
                })

                const rawContent = completion?.choices?.[0]?.message?.content?.trim()
                if (rawContent && rawContent.length >= 10) {
                  const completeRes = await fetch(`/api/validators/jobs/${id}/complete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wallet, raw_content: rawContent }),
                  })
                  if (completeRes.ok) {
                    setJobsCompleted((n) => n + 1)
                    onJobCompleted?.()
                  } else {
                    await releaseJob()
                  }
                } else {
                  await releaseJob()
                }
              } catch (inferenceErr) {
                console.error('[BrowserValidator] inference error', inferenceErr)
                await releaseJob()
              }
              updateStatus('ready', 'Polling for jobs…')
            }
          } catch (e) {
            console.error('[BrowserValidator]', e)
            if (!stopRef.current) updateStatus('ready', 'Polling for jobs…')
          }
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        }
      }
      poll()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load model'
      setError(msg)
      updateStatus('error', msg)
    }
  }, [wallet, updateStatus])

  const stop = useCallback(() => {
    stopRef.current = true
    setStatus('idle')
    setProgress('')
  }, [])

  const isWebGPUSupported = typeof navigator !== 'undefined' && 'gpu' in navigator

  return (
    <div className="space-y-3">
      {!isWebGPUSupported && (
        <p className="text-amber-400 text-sm">WebGPU is not supported in this browser. Use Chrome, Edge, or Safari 18+.</p>
      )}
      {status === 'idle' && (
        <Button
          className="bg-cyan-500 text-black hover:bg-cyan-400"
          disabled={!isWebGPUSupported || !wallet}
          onClick={runValidator}
        >
          Run in browser
        </Button>
      )}
      {(status === 'loading' || status === 'ready' || status === 'validating') && (
        <div className="space-y-2">
          <p className="text-sm text-cyan-400">{progress}</p>
          {status === 'ready' || status === 'validating' ? (
            <p className="text-xs text-purple-muted">
              Jobs: {jobsCompleted} · Verifications: {verificationsCompleted}
            </p>
          ) : null}
          <Button variant="outline" size="sm" className="border-amber-500 text-amber-400" onClick={stop}>
            Stop
          </Button>
        </div>
      )}
      {status === 'error' && error && (
        <div className="p-3 rounded border border-red-500/40 bg-red-500/5 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
