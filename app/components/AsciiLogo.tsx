'use client'

import React from 'react'

const AsciiLogo = () => {
  return (
    <div className="pixel-logo-container w-full max-w-4xl mx-auto my-4 sm:my-6 md:my-8 px-2 sm:px-4">
      {/* Main Title - Pixel Art Style */}
      <h1 className="pixel-title text-center mb-4 sm:mb-6 px-2">
        <span className="laser-eyes text-base sm:text-lg md:text-xl lg:text-2xl">FOR SALE BY DEGEN</span>
      </h1>
      
      {/* Pixel-art box */}
      <div className="pixel-box bg-black border-2 sm:border-4 border-[#660099] p-3 sm:p-4 md:p-6 lg:p-8 relative w-full overflow-hidden">
        {/* Pixelated border effect */}
        <div className="absolute inset-0 border-2 border-[#00ff00] opacity-30 pointer-events-none" 
             style={{ 
               clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
               imageRendering: 'pixelated'
             }} 
        />
        
        <div className="relative z-10 text-center">
          {/* $FSBD Logo */}
          <div className="mb-4 sm:mb-6">
            <div className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-pixel text-[#00ff00] mb-1 sm:mb-2 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
              $FSBD
            </div>
            <div className="text-sm sm:text-base md:text-lg lg:text-xl text-[#660099] font-pixel-alt break-words">
              fsbd.fun
            </div>
          </div>
          
          {/* Categories Grid - Pixel Style */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
            {['miscellaneous', 'community', 'housing', 'jobs'].map((cat) => (
              <div key={cat} className="pixel-category border-2 border-[#660099] bg-black/50 p-2 sm:p-3 text-[10px] sm:text-xs md:text-sm text-[#660099] font-pixel-alt break-words overflow-hidden">
                {cat} - by owner
              </div>
            ))}
          </div>
          
          {/* Crypto Tokens List - Green Pixel Text */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 text-left max-w-md mx-auto">
            <div className="space-y-0.5 sm:space-y-1 text-[#00ff00] font-pixel-alt text-[10px] sm:text-xs md:text-sm">
              <div className="break-words">SOL</div>
              <div className="break-words">SHIT PEPE</div>
              <div className="break-words">FLORK BOMB</div>
              <div className="break-words">BOME POPCAT</div>
              <div className="break-words">MER</div>
            </div>
            <div className="space-y-0.5 sm:space-y-1 text-[#00ff00] font-pixel-alt text-[10px] sm:text-xs md:text-sm">
              <div className="break-words">OL</div>
              <div className="break-words">ESOL</div>
              <div className="break-words">MEL</div>
              <div className="break-words">WFE</div>
              <div className="break-words">BOME PORCAT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AsciiLogo
