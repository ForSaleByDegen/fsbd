'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { getAssociatedTokenAddressSync, createTransferInstruction, getMint } from '@solana/spl-token'
import { BarChart3, ExternalLink } from 'lucide-react'
import { Button, buttonVariants } from './ui/button'
import { Input } from './ui/input'
import ImageFileButton from './ImageFileButton'
import CameraCapture from './CameraCapture'
import { formatPriceToken } from '@/lib/utils'
import { getCategoryLabel, getSubcategoryLabel } from '@/lib/categories'
import { getIPFSGatewayURL } from '@/lib/pinata'
import { enhanceImageForAnalysis } from '@/lib/enhance-image'
import { cleanListingText } from '@/lib/clean-listing-text'

export type CompListing = {
  id: string
  title?: string | null
  description?: string | null
  price?: number | string | null
  price_token?: string | null
  category?: string | null
  subcategory?: string | null
  images?: string[] | null
}

export type GroundingSource = { title?: string; uri?: string }

export type MarketPriceRange = { min: number; max: number; median: number; currency: string }
export type RecentSale = { price: number; date?: string }

export type SnapResult = {
  itemDescription: string
  suggestedTitle?: string
  suggestedPrice?: string
  suggestedCategory: string
  suggestedSubcategory: string
  searchKeywords: string[]
  suggestedTokenName?: string
  suggestedTokenSymbol?: string
  suggestedTokenDescription?: string
  comps: CompListing[]
  marketPriceRange?: MarketPriceRange
  recentSales?: RecentSale[]
  groundingSources?: GroundingSource[]
}

export type FullAISuggestions = {
  title: string
  description: string
  price: string
  category: string
  subcategory: string
  searchKeywords: string[]
  tokenName: string
  tokenSymbol: string
  tokenDescription: string
}

type Props = {
  onUseComp: (comp: CompListing, itemDescription?: string) => void
  onUseSuggested?: (itemDescription: string, category: string, subcategory: string) => void
  onApplyAllSuggestions?: (data: FullAISuggestions) => void
  applyingComp?: boolean
  wallet?: string | null
}

type ViewMode = 'grid' | 'compare'

function formatResetsAt(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'soon'
  const hours = Math.floor(ms / (60 * 60 * 1000))
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
  if (hours >= 24) return `in ${Math.floor(hours / 24)}d`
  if (hours > 0) return `in ${hours}h${mins > 0 ? ` ${mins}m` : ''}`
  if (mins > 0) return `in ${mins}m`
  return 'in under a minute'
}

export default function SnapToCompare({ onUseComp, onUseSuggested, onApplyAllSuggestions, applyingComp = false, wallet }: Props) {
  const { publicKey, signTransaction } = useWallet()
  const effectiveWallet = wallet ?? publicKey?.toString() ?? null
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SnapResult | null>(null)
  const [snappedPhoto, setSnappedPhoto] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [error, setError] = useState<string | null>(null)
  const [lastFailedImage, setLastFailedImage] = useState<string | null>(null)
  const [keywordFallback, setKeywordFallback] = useState('')
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remaining: number
    limit: number
    resetIn: number
    tier: string
  } | null>(null)
  const [dailyUsage, setDailyUsage] = useState<{
    usedToday: boolean
    resetsAt: string | null
    limit: number
    totalAnalyses?: number
    aiLookupFeeFsbd?: number
  } | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)

  // Fetch daily AI listing usage when effectiveWallet is present (1 per day per user)
  useEffect(() => {
    if (!effectiveWallet?.trim()) {
      setDailyUsage(null)
      return
    }
    let cancelled = false
    fetch(`/api/listings/ai-usage?wallet=${encodeURIComponent(effectiveWallet)}`)
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (cancelled) return
        setDailyUsage({
          usedToday: !!data.usedToday,
          resetsAt: data.resetsAt ?? null,
          limit: typeof data.limit === 'number' ? data.limit : 1,
          totalAnalyses: typeof data.totalAnalyses === 'number' ? data.totalAnalyses : 0,
          aiLookupFeeFsbd: typeof data.aiLookupFeeFsbd === 'number' ? data.aiLookupFeeFsbd : 0,
        })
      })
      .catch(() => {
        if (!cancelled) setDailyUsage(null)
      })
    return () => {
      cancelled = true
    }
  }, [effectiveWallet])

  const runAnalysis = async (dataUrl: string) => {
    setError(null)
    setResult(null)
    setRateLimitInfo(null)
    setLoading(true)
    try {
      let aiLookupSignature: string | null = null
      const fee = dailyUsage?.aiLookupFeeFsbd ?? 0
      if (fee > 0 && effectiveWallet && publicKey && signTransaction) {
        const cfgRes = await fetch('/api/config')
        const cfg = await cfgRes.json().catch(() => ({}))
        const fsbdMint = cfg.fsbd_token_mint
        const appWallet = process.env.NEXT_PUBLIC_APP_WALLET
        if (fsbdMint && fsbdMint !== 'FSBD_TOKEN_MINT_PLACEHOLDER' && appWallet && appWallet !== 'YOUR_WALLET_ADDRESS') {
          const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com')
          const mint = new PublicKey(fsbdMint)
          const appPubkey = new PublicKey(appWallet)
          const userAta = getAssociatedTokenAddressSync(mint, publicKey)
          const appAta = getAssociatedTokenAddressSync(mint, appPubkey)
          const mintInfo = await getMint(connection, mint)
          const amount = BigInt(Math.floor(fee * 10 ** mintInfo.decimals))
          const tx = new Transaction().add(createTransferInstruction(userAta, appAta, publicKey, amount))
          const { blockhash } = await connection.getLatestBlockhash('confirmed')
          tx.recentBlockhash = blockhash
          tx.feePayer = publicKey
          const signed = await signTransaction(tx)
          const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false })
          await connection.confirmTransaction(sig, 'confirmed')
          aiLookupSignature = sig
        } else {
          throw new Error('AI lookup payment not configured. Connect support.')
        }
      } else if (fee > 0 && (!effectiveWallet || !signTransaction)) {
        throw new Error(`Connect your wallet to pay ${fee.toLocaleString()} $FSBD for AI lookup.`)
      }
      const res = await fetch('/api/listings/find-comps-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          ...(effectiveWallet ? { wallet: effectiveWallet } : {}),
          ...(aiLookupSignature ? { aiLookupSignature } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 402) {
          throw new Error(data.error || `Pay ${(data.aiLookupFeeFsbd ?? fee).toLocaleString()} $FSBD for AI lookup. Connect wallet and try again.`)
        }
        if (res.status === 429 && effectiveWallet && (data.resetsAt ?? data.retryAfter)) {
          setDailyUsage({
            usedToday: true,
            resetsAt: data.resetsAt ?? (data.retryAfter ? new Date(Date.now() + data.retryAfter * 1000).toISOString() : null),
            limit: 1,
          })
        }
        const msg = data.error || 'Failed to analyze image'
        const retry = data.retryAfter
        throw new Error(retry ? `${msg} Try again in ${retry} seconds.` : msg)
      }
      if (effectiveWallet && data.dailyLimit) {
        setDailyUsage({
          usedToday: true,
          resetsAt: data.dailyLimit.resetsAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          limit: data.dailyLimit.limit ?? 1,
          totalAnalyses: (dailyUsage?.totalAnalyses ?? 0) + 1,
        })
        fetch(`/api/listings/ai-usage?wallet=${encodeURIComponent(effectiveWallet)}`)
          .then((r) => r.json().catch(() => ({})))
          .then((u) => setDailyUsage((prev) => prev ? {
            ...prev,
            usedToday: !!u.usedToday,
            resetsAt: u.resetsAt ?? prev.resetsAt,
            limit: typeof u.limit === 'number' ? u.limit : prev.limit,
            totalAnalyses: typeof u.totalAnalyses === 'number' ? u.totalAnalyses : prev.totalAnalyses,
          } : prev))
      }
      setLastFailedImage(null)
      setResult({
        itemDescription: data.itemDescription ?? '',
        suggestedTitle: data.suggestedTitle ?? '',
        suggestedPrice: data.suggestedPrice ?? '',
        suggestedCategory: data.suggestedCategory ?? 'for-sale',
        suggestedSubcategory: data.suggestedSubcategory ?? 'other',
        searchKeywords: Array.isArray(data.searchKeywords) ? data.searchKeywords : [],
        suggestedTokenName: data.suggestedTokenName ?? '',
        suggestedTokenSymbol: data.suggestedTokenSymbol ?? '',
        suggestedTokenDescription: data.suggestedTokenDescription ?? '',
        comps: Array.isArray(data.comps) ? data.comps : [],
        groundingSources: Array.isArray(data.groundingSources) ? data.groundingSources : undefined,
        marketPriceRange: data.marketPriceRange,
        recentSales: Array.isArray(data.recentSales) ? data.recentSales : undefined,
      })
      setSnappedPhoto(dataUrl)
      setViewMode('grid')
      if (data.rateLimit) {
        setRateLimitInfo({
          remaining: data.rateLimit.remaining ?? 0,
          limit: data.rateLimit.limit ?? 10,
          resetIn: data.rateLimit.resetIn ?? 60,
          tier: data.tier ?? 'free',
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setLastFailedImage(dataUrl)
    } finally {
      setLoading(false)
    }
  }

  const handleKeywordSearch = async () => {
    const kw = keywordFallback.trim()
    if (!kw) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/listings?q=${encodeURIComponent(kw)}&sort=newest`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Search failed')
      const listings = Array.isArray(data) ? data : data?.listings ?? []
      const comps: CompListing[] = listings.slice(0, 12).map((l: { id: string; title?: string; description?: string; price?: number; price_token?: string; category?: string; subcategory?: string; images?: string[] }) => ({
        id: l.id,
        title: l.title ?? null,
        description: l.description ?? null,
        price: l.price ?? null,
        price_token: l.price_token ?? null,
        category: l.category ?? null,
        subcategory: l.subcategory ?? null,
        images: l.images ?? null,
      }))
      setLastFailedImage(null)
      setResult({
        itemDescription: '',
        suggestedCategory: 'for-sale',
        suggestedSubcategory: 'other',
        searchKeywords: kw.split(/\s+/).filter(Boolean),
        comps,
      })
      setSnappedPhoto(null)
      setViewMode('grid')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Keyword search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleImageDataUrl = async (dataUrl: string) => {
    setSnappedPhoto(dataUrl)
    const enhanced = await enhanceImageForAnalysis(dataUrl)
    await runAnalysis(enhanced)
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc.)')
      return
    }
    setSnappedPhoto(null)
    const reader = new FileReader()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    await handleImageDataUrl(dataUrl)
  }

  const handleCameraCapture = async (dataUrl: string) => {
    setCameraOpen(false)
    await handleImageDataUrl(dataUrl)
  }

  const formatPrice = (comp: CompListing) => {
    const p = comp.price
    if (p == null || p === '') return '—'
    const num = typeof p === 'string' ? parseFloat(p) : p
    if (!Number.isFinite(num)) return '—'
    const label = formatPriceToken(comp.price_token ?? null)
    return `${num} ${label}`
  }

  const imageUrl = (comp: CompListing) => {
    const imgs = comp.images
    if (!Array.isArray(imgs) || !imgs[0]) return null
    const img = imgs[0]
    if (img.startsWith('http://') || img.startsWith('https://')) return img
    if (img.startsWith('Qm') || img.startsWith('baf')) return getIPFSGatewayURL(img)
    return getIPFSGatewayURL(img)
  }

  return (
    <div className="p-4 border-2 border-cyan-500/50 rounded-lg bg-cyan-500/5">
      <label className="block text-sm font-medium mb-2">Snap to Compare — take a photo or upload an image</label>
      <p className="text-sm text-muted-foreground mb-3">
        We&apos;ll analyze your item and find similar FSBD listings with pricing. Use a comp to prefill your listing.
        {effectiveWallet ? (
          <span className="block mt-1 text-xs text-cyan-400/80">
            Your tier limits your lookups per minute. Hold more $FSBD for higher limits.
          </span>
        ) : (
          <span className="block mt-1 text-xs text-amber-400/80">
            Connect your wallet for tier-based limits (free tier: 3/min). Hold $FSBD for more.
          </span>
        )}
      </p>
      {effectiveWallet && dailyUsage !== null && (
        <p className="text-xs text-muted-foreground mb-2">
          <span className="text-cyan-400/90 font-medium">AI listing:</span>{' '}
          {dailyUsage.usedToday ? (
            <>
              1/{dailyUsage.limit} used today
              {dailyUsage.resetsAt && (
                <span className="text-amber-400/90">
                  {' '}· resets {formatResetsAt(dailyUsage.resetsAt)}
                </span>
              )}
            </>
          ) : (
            <span className="text-[#00ff00]/90">1 remaining today</span>
          )}
          {typeof dailyUsage.totalAnalyses === 'number' && dailyUsage.totalAnalyses > 0 && (
            <span className="text-purple-muted"> · Total analyses: {dailyUsage.totalAnalyses}</span>
          )}
          {(dailyUsage.aiLookupFeeFsbd ?? 0) > 0 && (
            <span className="text-amber-400/90"> · {dailyUsage.aiLookupFeeFsbd!.toLocaleString()} $FSBD per lookup</span>
          )}
        </p>
      )}
      {rateLimitInfo && (
        <p className="text-xs text-muted-foreground mb-2">
          {rateLimitInfo.remaining} of {rateLimitInfo.limit} lookups remaining this minute
          {rateLimitInfo.tier !== 'free' && (
            <span className="text-cyan-400/80"> · {rateLimitInfo.tier} tier</span>
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <ImageFileButton
          onChange={handleFile}
          disabled={loading || (!!effectiveWallet && !!dailyUsage?.usedToday)}
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'border-cyan-500 text-cyan-400 hover:bg-cyan-500/20' })}
        >
          <span className="pointer-events-none">
            {loading ? 'Analyzing…' : effectiveWallet && dailyUsage?.usedToday ? 'Daily limit used (1/day)' : 'Take photo / Upload image'}
          </span>
        </ImageFileButton>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || (!!effectiveWallet && !!dailyUsage?.usedToday)}
          onClick={() => setCameraOpen(true)}
          className="border-cyan-500/50 text-cyan-400/80 hover:bg-cyan-500/10"
        >
          {effectiveWallet && dailyUsage?.usedToday ? 'Daily limit used' : 'Use live camera'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        In wallet apps (Backpack, Phantom), use &quot;Take photo / Upload image&quot; — it opens your camera or gallery.
      </p>

      {cameraOpen && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={() => setCameraOpen(false)}
        />
      )}

      {error && (
        <div className="mt-3 p-3 rounded-lg border border-red-500/40 bg-red-500/5 space-y-2">
          <p className="text-sm text-red-400">{error}</p>
          <div className="flex flex-wrap gap-2 items-center">
            {lastFailedImage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                disabled={loading}
                onClick={() => runAnalysis(lastFailedImage)}
              >
                Try again
              </Button>
            )}
            <span className="text-xs text-muted-foreground">or search by keywords:</span>
            <div className="flex gap-2 flex-1 min-w-[200px]">
              <Input
                type="text"
                placeholder="e.g. vintage lamp, brass"
                value={keywordFallback}
                onChange={(e) => setKeywordFallback(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleKeywordSearch()}
                className="h-8 text-sm bg-black/50 border-cyan-500/40"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 shrink-0"
                disabled={loading || !keywordFallback.trim()}
                onClick={handleKeywordSearch}
              >
                Search
              </Button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-4">
          {/* Estimated price — prominent display at top. Use suggestedPrice, or marketPriceRange, or first comp price */}
          {(() => {
            const priceLabel: string | null = result.suggestedPrice
              ? result.suggestedPrice
              : result.marketPriceRange
                ? result.marketPriceRange.min === result.marketPriceRange.max
                  ? `$${result.marketPriceRange.median}`
                  : `$${result.marketPriceRange.min}–$${result.marketPriceRange.max}`
                : result.comps?.length && typeof (result.comps[0] as { price?: number })?.price === 'number'
                  ? String((result.comps[0] as { price: number }).price)
                  : null
            return priceLabel ? (
              <div className="p-3 rounded-lg border-2 border-[#00ff00]/50 bg-[#00ff00]/10">
                <p className="text-xs text-cyan-400 font-medium mb-0.5">Estimated price</p>
                <p className="text-xl font-pixel text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {priceLabel}
                  <span className="text-sm font-pixel-alt text-purple-muted ml-1 font-normal">(USD or SOL)</span>
                </p>
              </div>
            ) : null
          })()}
          {/* AI-suggested description & category */}
          {(result.itemDescription || onUseSuggested || onApplyAllSuggestions) && (
            <div className="p-3 rounded-lg border border-cyan-500/40 bg-cyan-500/5">
              <p className="text-xs text-cyan-400 font-medium mb-1">AI analysis</p>
              {result.suggestedTitle && (
                <p className="text-sm font-medium text-foreground mb-1">{result.suggestedTitle}</p>
              )}
              {result.itemDescription && (
                <p className="text-sm text-muted-foreground mb-2">{result.itemDescription}</p>
              )}
              {(result.suggestedPrice || result.searchKeywords.length > 0) && (
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {result.suggestedPrice && (
                    <span className="text-sm text-[#00ff00] font-medium">{result.suggestedPrice} (suggested price)</span>
                  )}
                  {result.searchKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.searchKeywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-xs">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Category: {getCategoryLabel(result.suggestedCategory)} → {getSubcategoryLabel(result.suggestedCategory, result.suggestedSubcategory)}
              </p>
              {onApplyAllSuggestions && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 mr-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                  onClick={() => onApplyAllSuggestions({
                    title: result.suggestedTitle || result.searchKeywords[0] || 'Item',
                    description: cleanListingText(result.itemDescription),
                    price: result.suggestedPrice || '',
                    category: result.suggestedCategory,
                    subcategory: result.suggestedSubcategory,
                    searchKeywords: result.searchKeywords,
                    tokenName: result.suggestedTokenName || result.suggestedTitle || result.searchKeywords[0] || 'Item Token',
                    tokenSymbol: result.suggestedTokenSymbol || (result.suggestedTitle?.slice(0, 6).replace(/\s/g, '') || 'ITEM').toUpperCase(),
                    tokenDescription: result.suggestedTokenDescription || cleanListingText(result.itemDescription),
                  })}
                >
                  Apply all AI suggestions
                </Button>
              )}
              {onUseSuggested && result.itemDescription && !onApplyAllSuggestions && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                  onClick={() => onUseSuggested(result.itemDescription, result.suggestedCategory, result.suggestedSubcategory)}
                >
                  Use suggested description & category
                </Button>
              )}
            </div>
          )}

          {/* Market references from Google Search (eBay, Amazon, etc.) */}
          {result.groundingSources && result.groundingSources.length > 0 && (
            <div className="p-3 rounded-lg border border-cyan-500/30 bg-black/20">
              <p className="text-xs font-medium text-cyan-400 mb-2">Market references (Google Search)</p>
              <div className="flex flex-wrap gap-2">
                {result.groundingSources.slice(0, 8).map((src, idx) => (
                  <a
                    key={idx}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/5 text-sm text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-500/50 transition-colors"
                  >
                    <span className="truncate max-w-[180px]">{src.title || 'Link'}</span>
                    <ExternalLink size={12} className="flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Comps - multiple listings with view toggle and compare */}
          {result.comps.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-cyan-400">
                  Similar listings ({result.comps.length}) — choose one to pull into your listing
                </p>
                <div className="flex rounded-lg border border-cyan-500/40 p-0.5">
                  <button
                    type="button"
                    className={`px-2 py-1 text-xs rounded ${viewMode === 'grid' ? 'bg-cyan-500/30 text-cyan-300' : 'text-muted-foreground hover:text-cyan-400'}`}
                    onClick={() => setViewMode('grid')}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-1 text-xs rounded ${viewMode === 'compare' ? 'bg-cyan-500/30 text-cyan-300' : 'text-muted-foreground hover:text-cyan-400'}`}
                    onClick={() => setViewMode('compare')}
                  >
                    Compare
                  </button>
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[400px] overflow-y-auto pr-1">
                  {result.comps.map((comp) => (
                    <div
                      key={comp.id}
                      className="flex flex-col rounded-lg border border-cyan-500/30 bg-black/30 overflow-hidden"
                    >
                      <div className="aspect-square bg-muted flex-shrink-0">
                        {imageUrl(comp) ? (
                          <img
                            src={imageUrl(comp)!}
                            alt={comp.title || 'Comp'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-2 flex-1 flex flex-col min-w-0">
                        <p className="text-sm font-medium truncate" title={comp.title || ''}>
                          {comp.title || 'Untitled'}
                        </p>
                        <p className="text-xs text-cyan-400 mt-0.5">{formatPrice(comp)}</p>
                        {comp.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-1">
                            {comp.description}
                          </p>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                          disabled={applyingComp}
                          onClick={() => onUseComp(comp, result.itemDescription || undefined)}
                        >
                          {applyingComp ? 'Applying…' : 'Use this'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Your item (left - form area) */}
                  <div className="lg:col-span-2 p-4 rounded-2xl border border-cyan-500/30 bg-black/30">
                    <p className="text-xs font-medium text-cyan-400 mb-3">Your item</p>
                    <div className="flex gap-4">
                      {snappedPhoto ? (
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={snappedPhoto}
                            alt="Your photo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">
                          {result.itemDescription || 'No description'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {getCategoryLabel(result.suggestedCategory)} → {getSubcategoryLabel(result.suggestedCategory, result.suggestedSubcategory)}
                        </p>
                        {onApplyAllSuggestions && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-3 border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                            onClick={() => onApplyAllSuggestions({
                              title: result.suggestedTitle || result.searchKeywords[0] || 'Item',
                              description: cleanListingText(result.itemDescription),
                              price: result.suggestedPrice || '',
                              category: result.suggestedCategory,
                              subcategory: result.suggestedSubcategory,
                              searchKeywords: result.searchKeywords,
                              tokenName: result.suggestedTokenName || result.suggestedTitle || result.searchKeywords[0] || 'Item Token',
                              tokenSymbol: result.suggestedTokenSymbol || (result.suggestedTitle?.slice(0, 6).replace(/\s/g, '') || 'ITEM').toUpperCase(),
                              tokenDescription: result.suggestedTokenDescription || cleanListingText(result.itemDescription),
                            })}
                          >
                            Apply all AI suggestions
                          </Button>
                        )}
                        {onUseSuggested && !onApplyAllSuggestions && result.itemDescription && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-3 ml-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                            onClick={() => onUseSuggested(result.itemDescription, result.suggestedCategory, result.suggestedSubcategory)}
                          >
                            Use suggested
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Price comparison sidebar */}
                  <div className="lg:col-span-1 rounded-2xl border border-cyan-500/30 bg-black/30 p-4 lg:sticky lg:top-24">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                        <BarChart3 size={22} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-cyan-400">Price Comparison</p>
                        <p className="text-xs text-muted-foreground">Similar FSBD listings</p>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {result.comps.map((comp) => (
                        <div
                          key={comp.id}
                          className="group p-3 rounded-xl border border-cyan-500/20 bg-black/30 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all"
                        >
                          <div className="flex gap-3">
                            <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                              {imageUrl(comp) ? (
                                <img src={imageUrl(comp)!} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">—</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" title={comp.title || ''}>
                                {comp.title || 'Untitled'}
                              </p>
                              <p className="text-xs text-cyan-400">{formatPrice(comp)}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 text-xs"
                            disabled={applyingComp}
                            onClick={() => onUseComp(comp, result.itemDescription || undefined)}
                          >
                            {applyingComp ? 'Applying…' : 'Use this'}
                          </Button>
                        </div>
                      ))}
                    </div>
                    {result.groundingSources && result.groundingSources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-cyan-500/20">
                        <p className="text-xs font-medium text-cyan-400 mb-2">Market references</p>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                          {result.groundingSources.slice(0, 5).map((src, idx) => (
                            <a
                              key={idx}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg border border-cyan-500/20 bg-black/20 hover:bg-cyan-500/10 text-xs"
                            >
                              <ExternalLink size={12} className="flex-shrink-0 text-cyan-400" />
                              <span className="truncate">{src.title || 'Link'}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No similar listings found. You can still use the AI description above.</p>
          )}
        </div>
      )}
    </div>
  )
}
