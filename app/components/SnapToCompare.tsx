'use client'

import { useState } from 'react'
import { Button, buttonVariants } from './ui/button'
import ImageFileButton from './ImageFileButton'
import { formatPriceToken } from '@/lib/utils'
import { getCategoryLabel, getSubcategoryLabel } from '@/lib/categories'
import { getIPFSGatewayURL } from '@/lib/pinata'

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

export type SnapResult = {
  itemDescription: string
  suggestedCategory: string
  suggestedSubcategory: string
  searchKeywords: string[]
  comps: CompListing[]
}

type Props = {
  onUseComp: (comp: CompListing, itemDescription?: string) => void
  onUseSuggested?: (itemDescription: string, category: string, subcategory: string) => void
  applyingComp?: boolean
  /** Wallet address for tier-based rate limits (connect wallet for higher limits) */
  wallet?: string | null
}

type ViewMode = 'grid' | 'compare'

export default function SnapToCompare({ onUseComp, onUseSuggested, applyingComp = false, wallet }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SnapResult | null>(null)
  const [snappedPhoto, setSnappedPhoto] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [error, setError] = useState<string | null>(null)
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remaining: number
    limit: number
    resetIn: number
    tier: string
  } | null>(null)
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc.)')
      return
    }
    setError(null)
    setResult(null)
    setSnappedPhoto(null)
    setRateLimitInfo(null)
    setLoading(true)
    try {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/listings/find-comps-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          ...(wallet ? { wallet } : {}),
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.error || 'Failed to analyze image'
        const retry = data.retryAfter
        throw new Error(retry ? `${msg} Try again in ${retry} seconds.` : msg)
      }

      setResult({
        itemDescription: data.itemDescription ?? '',
        suggestedCategory: data.suggestedCategory ?? 'for-sale',
        suggestedSubcategory: data.suggestedSubcategory ?? 'other',
        searchKeywords: Array.isArray(data.searchKeywords) ? data.searchKeywords : [],
        comps: Array.isArray(data.comps) ? data.comps : [],
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
    } finally {
      setLoading(false)
    }
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
        {wallet ? (
          <span className="block mt-1 text-xs text-cyan-400/80">
            Your tier limits your lookups per minute. Hold more $FSBD for higher limits.
          </span>
        ) : (
          <span className="block mt-1 text-xs text-amber-400/80">
            Connect your wallet for tier-based limits (free tier: 3/min). Hold $FSBD for more.
          </span>
        )}
      </p>
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
          disabled={loading}
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'border-cyan-500 text-cyan-400 hover:bg-cyan-500/20' })}
        >
          <span className="pointer-events-none">
            {loading ? 'Analyzing…' : '📷 Take photo / Upload image'}
          </span>
        </ImageFileButton>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}

      {result && (
        <div className="mt-4 space-y-4">
          {/* AI-suggested description & category */}
          {(result.itemDescription || onUseSuggested) && (
            <div className="p-3 rounded-lg border border-cyan-500/40 bg-cyan-500/5">
              <p className="text-xs text-cyan-400 font-medium mb-1">AI analysis</p>
              {result.itemDescription && (
                <p className="text-sm text-muted-foreground mb-2">{result.itemDescription}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Category: {getCategoryLabel(result.suggestedCategory)} → {getSubcategoryLabel(result.suggestedCategory, result.suggestedSubcategory)}
              </p>
              {onUseSuggested && result.itemDescription && (
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
                <div className="rounded-lg border border-cyan-500/30 bg-black/30 overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(180px,1fr)_2fr] gap-0 min-h-[280px]">
                    {/* Your item (left) */}
                    <div className="p-3 border-b lg:border-b-0 lg:border-r border-cyan-500/30 flex flex-col">
                      <p className="text-xs font-medium text-cyan-400 mb-2">Your item</p>
                      {snappedPhoto ? (
                        <div className="aspect-square rounded overflow-hidden bg-muted mb-2 flex-shrink-0">
                          <img
                            src={snappedPhoto}
                            alt="Your photo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}
                      <p className="text-xs text-muted-foreground line-clamp-4 flex-1">
                        {result.itemDescription || 'No description'}
                      </p>
                    </div>
                    {/* Compare table (right) */}
                    <div className="overflow-x-auto overflow-y-auto max-h-[360px]">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-black/80 border-b border-cyan-500/30">
                          <tr>
                            <th className="px-3 py-2 font-medium text-cyan-400 w-16">Image</th>
                            <th className="px-3 py-2 font-medium text-cyan-400">Title</th>
                            <th className="px-3 py-2 font-medium text-cyan-400 whitespace-nowrap">Price</th>
                            <th className="px-3 py-2 font-medium text-cyan-400 hidden sm:table-cell">Description</th>
                            <th className="px-3 py-2 font-medium text-cyan-400 w-24">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.comps.map((comp) => (
                            <tr
                              key={comp.id}
                              className="border-b border-cyan-500/20 hover:bg-cyan-500/5"
                            >
                              <td className="px-3 py-2">
                                <div className="w-12 h-12 rounded bg-muted overflow-hidden flex-shrink-0">
                                  {imageUrl(comp) ? (
                                    <img
                                      src={imageUrl(comp)!}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                                      —
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <span className="font-medium" title={comp.title || ''}>
                                  {(comp.title || 'Untitled').slice(0, 40)}
                                  {(comp.title?.length ?? 0) > 40 ? '…' : ''}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-cyan-400 whitespace-nowrap">
                                {formatPrice(comp)}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground max-w-[200px] hidden sm:table-cell">
                                <span className="line-clamp-2">
                                  {comp.description || '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 text-xs"
                                  disabled={applyingComp}
                                  onClick={() => onUseComp(comp, result.itemDescription || undefined)}
                                >
                                  {applyingComp ? 'Applying…' : 'Use this'}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
