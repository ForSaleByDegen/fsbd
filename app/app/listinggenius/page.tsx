'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera as CameraIcon, ShoppingBag, Search, Sparkles, CheckCircle2, Upload } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CameraCapture from '@/components/CameraCapture'
import ImageFileButton from '@/components/ImageFileButton'
import { enhanceImageForAnalysis } from '@/lib/enhance-image'

type GroundingSource = { title?: string; uri?: string }
type ListingData = { title: string; description: string; suggestedPrice: string; category: string; subcategory: string; tags: string[] }

function ListingGeniusForm({
  initialData,
  sources,
  onReset,
}: {
  initialData: ListingData
  sources: GroundingSource[]
  onReset: () => void
}) {
  const [formData, setFormData] = useState(initialData)
  const [isLaunching, setIsLaunching] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLaunching(true)
    sessionStorage.setItem('listinggenius_prefill', JSON.stringify(formData))
    router.push('/listings/create?from=listinggenius')
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-neutral-100">
            <div className="bg-blue-600 p-6 text-white flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Listing Details</h2>
                <p className="text-blue-100 mt-1 text-sm opacity-90">Review and create your FSBD listing</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Item Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Vintage Camera 1970s"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Your Price (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                    <input
                      type="text"
                      value={formData.suggestedPrice}
                      onChange={(e) => setFormData({ ...formData, suggestedPrice: e.target.value })}
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Description</label>
                <textarea
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Tell buyers about your item..."
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={onReset}
                  className="flex-1 px-6 py-4 rounded-2xl border-2 border-neutral-100 font-bold text-neutral-400 hover:bg-neutral-50"
                >
                  Start Over
                </button>
                <button
                  type="submit"
                  disabled={isLaunching}
                  className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLaunching ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    <>Create on FSBD →</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-neutral-100 h-fit sticky top-24">
            <h3 className="text-lg font-bold text-neutral-800 mb-4">Price Comparison</h3>
            <p className="text-xs text-neutral-500 mb-4">Similar listings from Google Search</p>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {sources.length > 0 ? (
                sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-xl border border-neutral-100 bg-neutral-50 hover:bg-white hover:shadow-md"
                  >
                    <span className="text-sm font-bold text-neutral-700 line-clamp-2">{src.title || 'Link'}</span>
                    <span className="text-[10px] text-blue-500 mt-1 block">View →</span>
                  </a>
                ))
              ) : (
                <p className="text-sm text-neutral-400">No market matches. Use our AI analysis above.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ListingGeniusPage() {
  const [state, setState] = useState<'idle' | 'capturing' | 'analyzing' | 'reviewing' | 'complete'>('idle')
  const [analysisData, setAnalysisData] = useState<{
    listingData: ListingData
    sources: GroundingSource[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleProcessImage = async (dataUrl: string) => {
    setState('analyzing')
    setError(null)
    try {
      const enhanced = await enhanceImageForAnalysis(dataUrl)
      const res = await fetch('/api/listings/find-comps-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: enhanced }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      const kw = Array.isArray(data.searchKeywords) ? data.searchKeywords : []
      const listingData: ListingData = {
        title: kw[0] || data.itemDescription?.slice(0, 50) || 'Item',
        description: data.itemDescription || '',
        suggestedPrice: (data.comps?.[0]?.price != null ? String(data.comps[0].price) : '') || '0',
        category: data.suggestedCategory || 'for-sale',
        subcategory: data.suggestedSubcategory || 'other',
        tags: kw,
      }
      const sources: GroundingSource[] = Array.isArray(data.groundingSources) ? data.groundingSources : []
      setAnalysisData({ listingData, sources })
      setState('reviewing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image.')
      setState('idle')
    }
  }

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => handleProcessImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const resetApp = () => {
    setAnalysisData(null)
    setState('idle')
    setError(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center w-full py-8">
        {state === 'idle' && (
          <div className="max-w-lg w-full px-6 py-12 text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold text-slate-900">
                Snap, Search, <span className="text-blue-600">Sell.</span>
              </h1>
              <p className="text-lg text-slate-600">
                Take a photo of anything. We&apos;ll find market comparisons and generate a listing.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-2xl shadow-sm border flex flex-col items-center gap-2">
                <CameraIcon className="text-blue-500" size={24} />
                <span className="text-xs font-bold text-slate-500 uppercase">Snap</span>
              </div>
              <div className="p-4 bg-white rounded-2xl shadow-sm border flex flex-col items-center gap-2">
                <Search className="text-blue-500" size={24} />
                <span className="text-xs font-bold text-slate-500 uppercase">Find</span>
              </div>
              <div className="p-4 bg-white rounded-2xl shadow-sm border flex flex-col items-center gap-2">
                <Sparkles className="text-blue-500" size={24} />
                <span className="text-xs font-bold text-slate-500 uppercase">List</span>
              </div>
            </div>
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-3">
              <ImageFileButton
                onChange={handleFile}
                className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-blue-600 text-white rounded-2xl text-xl font-bold hover:bg-blue-700"
              >
                <span className="pointer-events-none">
                  <CameraIcon size={24} className="inline mr-2" /> Take photo / Upload image
                </span>
              </ImageFileButton>
              <button
                type="button"
                onClick={() => setState('capturing')}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-700 border-2 border-slate-200 rounded-2xl font-bold hover:bg-slate-50"
              >
                <Upload size={20} /> Use live camera
              </button>
            </div>
          </div>
        )}

        {state === 'capturing' && (
          <CameraCapture onCapture={(dataUrl) => handleProcessImage(dataUrl)} onCancel={() => setState('idle')} />
        )}

        {state === 'analyzing' && (
          <div className="flex flex-col items-center gap-6 px-6 py-12 text-center">
            <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <h3 className="text-2xl font-bold text-slate-900">Analyzing your item...</h3>
            <p className="text-slate-500">Scanning marketplace listings</p>
          </div>
        )}

        {state === 'reviewing' && analysisData && (
          <ListingGeniusForm
            initialData={analysisData.listingData}
            sources={analysisData.sources}
            onReset={resetApp}
          />
        )}

        {state === 'complete' && (
          <div className="max-w-lg w-full px-6 py-12 text-center space-y-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">Listing ready!</h2>
            <Link
              href="/listings/create"
              className="block w-full px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800"
            >
              Create on FSBD
            </Link>
            <button type="button" onClick={resetApp} className="text-slate-500 hover:text-slate-700">
              Analyze another item
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
