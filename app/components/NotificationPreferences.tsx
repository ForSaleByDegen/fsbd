'use client'

import { useState, useEffect, useCallback } from 'react'

type Props = {
  walletAddress: string | null
  initialEmail?: string | null
  initialPhone?: string | null
  hasPushSubscription?: boolean
  onSaved?: () => void
}

export default function NotificationPreferences({
  walletAddress,
  initialEmail = '',
  initialPhone = '',
  hasPushSubscription = false,
  onSaved,
}: Props) {
  const [email, setEmail] = useState(initialEmail || '')
  const [phone, setPhone] = useState(initialPhone || '')
  const [pushEnabled, setPushEnabled] = useState(hasPushSubscription)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setEmail(initialEmail || '')
    setPhone(initialPhone || '')
    setPushEnabled(!!hasPushSubscription)
  }, [initialEmail, initialPhone, hasPushSubscription])

  const savePrefs = useCallback(async () => {
    if (!walletAddress) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          notify_email: email.trim() || null,
          notify_phone: phone.trim() ? phone.trim() : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSuccess(true)
      onSaved?.()
      setTimeout(() => setSuccess(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }, [walletAddress, email, phone, onSaved])

  const requestPushPermission = useCallback(async () => {
    if (!walletAddress) return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setError('Push notifications not supported in this browser')
      return
    }
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      setError('Push notifications not configured yet')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('Permission denied')
        setLoading(false)
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })
      const subJson = sub.toJSON()
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          notify_push_subscription: {
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          },
        }),
      })
      if (!res.ok) throw new Error('Failed to save push subscription')
      setPushEnabled(true)
      setSuccess(true)
      onSaved?.()
      setTimeout(() => setSuccess(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Push setup failed')
    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const buf = new ArrayBuffer(rawData.length)
    const view = new Uint8Array(buf)
    for (let i = 0; i < rawData.length; i++) {
      view[i] = rawData.charCodeAt(i)
    }
    return buf
  }

  if (!walletAddress) return null

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#aa77ee] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Get notified about new DMs, bids, and activity. Email and phone are optional.
      </p>
      <div className="space-y-2">
        <label className="block text-sm text-[#00ff00] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Email for notifications
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm p-2"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm text-[#00ff00] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Phone for SMS (optional)
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1234567890"
          className="w-full bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm p-2"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={savePrefs}
          disabled={loading}
          className="px-4 py-2 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20 font-pixel-alt text-sm disabled:opacity-50"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
        {!pushEnabled && (
          <button
            type="button"
            onClick={requestPushPermission}
            disabled={loading}
            className="px-4 py-2 border-2 border-[#660099] text-[#ff00ff] hover:bg-[#660099]/20 font-pixel-alt text-sm disabled:opacity-50"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            Enable push (PWA)
          </button>
        )}
        {pushEnabled && (
          <span className="text-xs text-[#00ff00] font-pixel-alt">✓ Push enabled</span>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-xs font-pixel-alt">{error}</p>
      )}
      {success && (
        <p className="text-[#00ff00] text-xs font-pixel-alt">Saved.</p>
      )}
    </div>
  )
}
