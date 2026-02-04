'use client'

/**
 * Small preview card showing how the token will look on pump.fun / DEX.
 * Displays logo, name, symbol, description, banner, socials as the user fills the form.
 */
interface TokenPreviewCardProps {
  tokenName: string
  tokenSymbol: string
  description?: string
  imageUrl?: string | null
  bannerUrl?: string | null
  website?: string | null
  twitter?: string | null
  telegram?: string | null
  discord?: string | null
  contractPreview?: string | null
}

export default function TokenPreviewCard({
  tokenName,
  tokenSymbol,
  description,
  imageUrl,
  bannerUrl,
  website,
  twitter,
  telegram,
  discord,
  contractPreview,
}: TokenPreviewCardProps) {
  const hasSocials = website || twitter || telegram || discord
  const displayName = tokenName.trim() || 'Token Name'
  const displaySymbol = tokenSymbol.trim() || 'SYMBOL'

  return (
    <div className="rounded-lg border-2 border-[#660099]/60 bg-gradient-to-b from-[#1a0a2e] to-black overflow-hidden">
      <p className="text-[10px] uppercase tracking-wider text-[#aa77ee]/70 px-3 pt-3 font-mono">
        Preview — how it will look on pump.fun
      </p>
      <p className="text-[10px] text-[#660099]/80 px-3 mt-0.5 font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Line breaks display on pump.fun &amp; DEXes
      </p>
      {bannerUrl && (
        <div className="mt-2 h-16 w-full overflow-hidden bg-[#660099]/20">
          <img
            src={bannerUrl}
            alt=""
            className="w-full h-full object-cover object-center"
          />
        </div>
      )}
      <div className="flex gap-3 p-3">
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#660099]/30 shrink-0 border border-[#660099]/50">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#660099] text-xl font-bold">
              {displaySymbol.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#00ff00] truncate" style={{ fontFamily: 'var(--font-pixel)' }}>
            {displayName}
          </p>
          <p className="text-xs text-[#aa77ee] font-mono">
            ${displaySymbol}
          </p>
          {contractPreview && (
            <p className="text-[10px] text-[#660099] font-mono mt-0.5">
              {contractPreview}
            </p>
          )}
        </div>
      </div>
      {description && (
        <p className="text-xs text-[#aa77ee]/90 mt-2 px-3 line-clamp-4 font-pixel-alt whitespace-pre-line" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {description.slice(0, 200)}{description.length > 200 ? '…' : ''}
        </p>
      )}
      {hasSocials && (
        <div className="flex flex-wrap gap-1.5 mt-2 px-3">
          {website && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#660099]/30 text-[10px] text-[#00ff00]">
              🌐
            </span>
          )}
          {twitter && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#660099]/30 text-[10px] text-[#00ff00]">
              𝕏
            </span>
          )}
          {telegram && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#660099]/30 text-[10px] text-[#00ff00]">
              ✈
            </span>
          )}
          {discord && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#660099]/30 text-[10px] text-[#00ff00]">
              💬
            </span>
          )}
        </div>
      )}
      <p className="text-[10px] text-[#660099] mt-2 px-3 pb-3 font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Launched on FSBD.fun
      </p>
    </div>
  )
}
