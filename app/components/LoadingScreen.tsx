'use client'

import React from 'react'

const LoadingScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] bg-black text-[#9933ff] font-mono p-8 overflow-hidden">
      {/* Pulsing neon spinner */}
      <div className="neon-spinner mb-6"></div>

      {/* Typewriter reveal message */}
      <div className="typewriter-multi mb-6">
        INITIALIZING DEGEN BACKDOOR...
        LOADING SHITCOIN AUCTIONS...
        $FSBD WALLET SYNC IN PROGRESS...
        ANON ACCESS GRANTED • ENTER AT OWN RISK
      </div>

      {/* Vertical scrolling chaos in background */}
      <div className="vertical-marquee-wrapper">
        <div className="vertical-marquee-track">
          <div className="vertical-marquee-item">RUG PULLS WANTED • 0.69 SOL</div>
          <div className="vertical-marquee-item">DEGEN GIGS AVAILABLE • NO KYC</div>
          <div className="vertical-marquee-item">SHITCOINS FOR SALE • ANON ONLY</div>
          <div className="vertical-marquee-item">
            <span className="geocities-blink">BACKDOOR OPEN</span> • DEVNET MODE
          </div>
          <div className="vertical-marquee-item">CONNECT WALLET TO PROCEED</div>

          {/* Duplicate block for seamless loop */}
          <div className="vertical-marquee-item">RUG PULLS WANTED • 0.69 SOL</div>
          <div className="vertical-marquee-item">DEGEN GIGS AVAILABLE • NO KYC</div>
          <div className="vertical-marquee-item">SHITCOINS FOR SALE • ANON ONLY</div>
          <div className="vertical-marquee-item">
            <span className="geocities-blink">BACKDOOR OPEN</span> • DEVNET MODE
          </div>
          <div className="vertical-marquee-item">CONNECT WALLET TO PROCEED</div>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen
