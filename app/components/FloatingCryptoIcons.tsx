'use client'

import React, { useEffect, useState } from 'react'

interface CryptoIcon {
  id: number
  x: number
  y: number
  size: number
  color: string
  symbol: string
  speed: number
}

const cryptoSymbols = ['SOL', 'PEPE', 'BOME', 'POPCAT', 'BONK', 'WIF', 'FSBD', 'SHIT', 'DEGEN']
const colors = ['#660099', '#00ff00', '#9933ff', '#cc66ff']

const FloatingCryptoIcons = () => {
  const [icons, setIcons] = useState<CryptoIcon[]>([])

  useEffect(() => {
    // Create 20-30 floating icons
    const newIcons: CryptoIcon[] = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 12 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      symbol: cryptoSymbols[Math.floor(Math.random() * cryptoSymbols.length)],
      speed: 0.2 + Math.random() * 0.3,
    }))
    setIcons(newIcons)

    // Animate icons floating upward
    const interval = setInterval(() => {
      setIcons((prev) =>
        prev.map((icon) => ({
          ...icon,
          y: icon.y - icon.speed < -5 ? 105 : icon.y - icon.speed,
          x: icon.x + (Math.sin(Date.now() / 2000 + icon.id) * 0.1),
        }))
      )
    }, 50)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-[-10] overflow-hidden">
      {icons.map((icon) => (
        <div
          key={icon.id}
          className="absolute pixel-text hidden md:block"
          style={{
            left: `${icon.x}%`,
            top: `${icon.y}%`,
            fontSize: `${icon.size}px`,
            color: icon.color,
            fontFamily: 'var(--font-pixel-alt)',
            opacity: 0.15 + Math.random() * 0.2, // Reduced opacity
            textShadow: `0 0 ${icon.size / 2}px ${icon.color}`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {icon.symbol}
        </div>
      ))}
    </div>
  )
}

export default FloatingCryptoIcons
