'use client'

import React from 'react'

const AsciiLogo = () => {
  return (
    <div className="pixel-logo-container max-w-4xl mx-auto my-6 md:my-8">
      {/* Main Title - Pixel Art Style */}
      <h1 className="pixel-title text-center mb-6">
        <span className="laser-eyes">FOR SALE BY DEGEN</span>
      </h1>
      
      {/* Pixel-art box */}
      <div className="pixel-box bg-black border-4 border-[#660099] p-6 md:p-8 relative">
        {/* Pixelated border effect */}
        <div className="absolute inset-0 border-2 border-[#00ff00] opacity-30 pointer-events-none" 
             style={{ 
               clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
               imageRendering: 'pixelated'
             }} 
        />
        
        <div className="relative z-10 text-center">
          {/* $FBSD Logo */}
          <div className="mb-6">
            <div className="text-4xl md:text-6xl font-pixel text-[#00ff00] mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
              $FBSD
            </div>
            <div className="text-lg md:text-xl text-[#660099] font-pixel-alt">
              fbsd.fun
            </div>
          </div>
          
          {/* Categories Grid - Pixel Style */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {['miscellaneous', 'community', 'housing', 'jobs'].map((cat) => (
              <div key={cat} className="pixel-category border-2 border-[#660099] bg-black/50 p-3 text-xs md:text-sm text-[#660099] font-pixel-alt">
                {cat} - by owner
              </div>
            ))}
          </div>
          
          {/* Crypto Tokens List - Green Pixel Text */}
          <div className="grid grid-cols-2 gap-4 text-left max-w-md mx-auto">
            <div className="space-y-1 text-[#00ff00] font-pixel-alt text-xs md:text-sm">
              <div>SOL</div>
              <div>SHIT PEPE</div>
              <div>FLORK BOMB</div>
              <div>BOME POPCAT</div>
              <div>MER</div>
            </div>
            <div className="space-y-1 text-[#00ff00] font-pixel-alt text-xs md:text-sm">
              <div>OL</div>
              <div>ESOL</div>
              <div>MEL</div>
              <div>WFE</div>
              <div>BOME PORCAT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AsciiLogo
