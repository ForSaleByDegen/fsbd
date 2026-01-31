'use client'

import React, { useEffect, useState, useRef } from 'react'
import confetti from 'canvas-confetti'

const EasterEgg = () => {
  const [showBanner, setShowBanner] = useState(false)
  const [typed, setTyped] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fireConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#660099', '#9933ff', '#cc66ff', '#ffffff', '#000000'],
      ticks: 300,
      gravity: 0.8,
      decay: 0.94,
    })

    setTimeout(() => {
      confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0.2, y: 0.8 } })
      confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 0.8, y: 0.8 } })
    }, 200)
  }

  const triggerHaptic = async () => {
    // Try standard vibrate API first (works on Android and most browsers)
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200])
    } else {
      // Fallback: Try iOS haptics (Safari iOS only)
      try {
        const iosHapticsModule = await import('ios-haptics')
        if (iosHapticsModule && iosHapticsModule.haptic) {
          // Use confirm() for celebration (two rapid haptics)
          iosHapticsModule.haptic.confirm()
        }
      } catch {
        // iOS haptics not available - that's okay, we tried
      }
    }
  }

  const playSound = () => {
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch((err) => {
          // Silently fail if audio can't play (missing file, autoplay restrictions, etc.)
          console.debug('Audio playback failed:', err)
        })
      } catch (err) {
        console.debug('Audio error:', err)
      }
    }
  }

  useEffect(() => {
    // Try to load audio file, but don't fail if it doesn't exist
    try {
      audioRef.current = new Audio('/party-horn.mp3')
      audioRef.current.preload = 'auto'
      audioRef.current.volume = 0.7
      audioRef.current.onerror = () => {
        // File doesn't exist or failed to load - that's okay
        console.debug('Audio file not found or failed to load')
        audioRef.current = null
      }
    } catch (err) {
      console.debug('Audio initialization failed:', err)
      audioRef.current = null
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const key = e.key.toLowerCase()
      const newTyped = (typed + key).slice(-10)
      setTyped(newTyped)

      if (newTyped.includes('craigslist')) {
        setShowBanner(true)
        fireConfetti()
        playSound()
        triggerHaptic()
        setTyped('')
        setTimeout(() => setShowBanner(false), 5000)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [typed])

  if (!showBanner) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none animate-fadeInOut">
      <div className="bg-[#660099] text-white px-12 py-8 rounded-lg shadow-2xl border-4 border-[#9933ff] text-center font-mono text-3xl md:text-5xl font-bold tracking-wide">
        <div className="mb-4">Best Rugs of the Week</div>
        <div className="text-2xl md:text-4xl opacity-80">
          "My rug pulled me harder than my ex" – anon degen
        </div>
        <div className="mt-6 text-xl opacity-70">$FSBD approved • 💜🐸🎉</div>
      </div>
    </div>
  )
}

export default EasterEgg
