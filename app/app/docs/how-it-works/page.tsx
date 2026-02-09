'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-[#00ff00] mb-6" style={{ fontFamily: 'var(--font-pixel)' }}>
          How It Works
        </h1>

        <div className="space-y-8 font-pixel-alt text-sm sm:text-base text-purple-muted" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {/* Overview */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Platform overview
            </h2>
            <p>
              $FSBD is a decentralized marketplace on Solana. You connect your wallet (no email, no signup). You can create listings, buy and sell with SOL/USDC or listing tokens, use encrypted chat with buyers/sellers, and optionally launch a token with your listing. Listings can be created manually or with AI assistance.
            </p>
          </section>

          {/* Creating a listing: AI vs Manual */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Creating a listing: AI vs Manual
            </h2>
            <p className="mb-3">
              On the <Link href="/listings/create" className="text-[#ff00ff] hover:text-[#00ff00] underline">Create Listing</Link> page you choose how to create:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-3">
              <li><strong className="text-cyan-400">AI Listing</strong> — We prefill the form using AI. You snap a photo (or upload an image) of your item; our AI suggests title, description, price, category, subcategory, and search keywords, and finds similar FSBD listings as comps. You review, edit if needed, then submit.</li>
              <li><strong className="text-cyan-400">Manual Listing</strong> — You fill in all fields yourself. You can still use Snap to Compare below as an optional helper for suggestions.</li>
            </ul>
            <p>
              In both modes you can also <strong className="text-[#00ff00]">Import from product URL</strong> (Amazon, eBay, Etsy, etc.) to pull title, description, price, and image. Review the preview and apply what you want.
            </p>
          </section>

          {/* How AI Listing / Snap to Compare works */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              How AI Listing (Snap to Compare) works
            </h2>
            <p className="mb-3">
              When you use <strong className="text-cyan-400">Snap to Compare</strong> (photo or upload):
            </p>
            <ol className="list-decimal pl-6 space-y-2 mb-3">
              <li><strong className="text-[#00ff00]">You provide an image</strong> — Take a photo or upload a picture of your item.</li>
              <li><strong className="text-[#00ff00]">We send it to our AI</strong> — We use Google&apos;s Gemini model. It identifies the item and can search the web for similar listings and prices (when available).</li>
              <li><strong className="text-[#00ff00]">We get suggestions</strong> — The AI returns a suggested title, description, price, category, subcategory, and search keywords. It can also suggest token name, symbol, and description if you plan to launch a token.</li>
              <li><strong className="text-[#00ff00]">We find comps</strong> — We search FSBD for active listings that match the keywords and show them as comparable listings (comps) so you can see market prices.</li>
              <li><strong className="text-[#00ff00]">You review and apply</strong> — The create form shows the AI analysis and comps. Click <strong className="text-cyan-400">Apply all AI suggestions</strong> to fill the form in one step, or pick individual comps/suggestions. Then edit any field and submit.</li>
            </ol>
            <p>
              All of this happens in your browser and our API; we do not store your photo after processing. The AI output is cleaned (no raw code or markdown) before it appears in the form.
            </p>
          </section>

          {/* Search keywords */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Search keywords on listings
            </h2>
            <p>
              Listings have an optional <strong className="text-[#00ff00]">search_keywords</strong> field — a list of short tags (e.g. &quot;vintage&quot;, &quot;lamp&quot;, &quot;brass&quot;). When you use AI Listing, we suggest keywords from the image and web search; you can add or remove them. Keywords are shown as small chips on the listing detail page and help buyers discover your item. They are stored with the listing and can be used for search and discovery.
            </p>
          </section>

          {/* Daily limit and rate limiting */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              AI listing daily limit and rate limiting
            </h2>
            <p className="mb-3">
              To keep AI costs under control until we run AI in-house, we limit how often each user can use the <strong className="text-cyan-400">image-based</strong> Snap to Compare:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-3">
              <li><strong className="text-[#00ff00]">1 AI listing per day per wallet</strong> — Each connected wallet gets one Snap-to-Compare image analysis per 24 hours. After you use it, the Snap/camera buttons are disabled until the next day. The UI shows a tracker: &quot;1/1 used today&quot; and when it resets, or &quot;1 remaining today&quot;.</li>
              <li><strong className="text-[#00ff00]">Per-minute limit (tier-based)</strong> — In addition, we limit how many Snap-to-Compare requests you can make per minute. Free tier: 3 per minute; higher $FSBD tiers get more. This prevents burst abuse.</li>
              <li><strong className="text-[#00ff00]">Keyword search does not count</strong> — In Snap to Compare you can search by keywords only (no photo). That flow does not use the AI image pipeline and does not count toward your daily limit.</li>
            </ul>
            <p>
              Usage is stored per wallet (we record the last time you used AI listing). The <strong className="text-cyan-400">GET /api/listings/ai-usage</strong> endpoint returns your status (usedToday, resetsAt, limit) so the UI can show the tracker and disable buttons when needed.
            </p>
          </section>

          {/* Where to find it */}
          <section>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Where to find AI Listing and Snap to Compare
            </h2>
            <p>
              <Link href="/listings/create" className="text-[#ff00ff] hover:text-[#00ff00] underline">Create Listing</Link> — Choose AI Listing or Manual Listing at the top; Snap to Compare is the &quot;Snap to Compare&quot; block below (take photo / upload image, or search by keywords). You can also use <Link href="/listinggenius" className="text-[#ff00ff] hover:text-[#00ff00] underline">ListingGenius</Link> (Snap, Search, Sell) for a dedicated flow that uses the same AI and comps.
            </p>
          </section>

          {/* Technical summary */}
          <section className="p-4 border border-[#660099]/50 rounded bg-black/30">
            <h2 className="text-lg sm:text-xl font-pixel text-[#ff00ff] mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
              Technical summary (for the curious)
            </h2>
            <p className="mb-3">
              <strong className="text-cyan-400">Snap to Compare</strong> sends your image to <strong className="text-[#00ff00]">POST /api/listings/find-comps-from-image</strong> with your wallet (if connected). The API checks your daily limit (stored as <code className="text-cyan-300 bg-black/50 px-1">last_ai_listing_at</code> on your profile), then calls Google Gemini to analyze the image and optionally search the web. It parses the AI response for title, description, price, category, subcategory, keywords, and token suggestions, then queries FSBD listings by keywords to return comps. On success it updates <code className="text-cyan-300 bg-black/50 px-1">last_ai_listing_at</code> so the daily limit is enforced.
            </p>
            <p className="mb-3">
              The UI fetches <strong className="text-[#00ff00]">GET /api/listings/ai-usage?wallet=...</strong> to show the daily tracker (usedToday, resetsAt, limit). When you&apos;ve used your 1/day, the Snap and camera buttons are disabled until the next 24 hours. Keyword search in Snap to Compare calls the regular listings search API and does not touch the AI or daily limit.
            </p>
            <p>
              Listings store <code className="text-cyan-300 bg-black/50 px-1">search_keywords</code> (array) in the database; the create API accepts and sanitizes them. Listing detail pages display keywords as tag chips. All of this is documented in <Link href="/docs/features" className="text-[#ff00ff] hover:text-[#00ff00] underline">Features &amp; Tiers</Link> and in the repo (FEATURES.md, migrations for <code className="text-cyan-300 bg-black/50 px-1">search_keywords</code> and <code className="text-cyan-300 bg-black/50 px-1">last_ai_listing_at</code>).
            </p>
          </section>

          {/* Links */}
          <section className="pt-4 border-t border-[#660099]/50">
            <div className="flex flex-wrap gap-3">
              <Link href="/docs/features" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Features &amp; Tiers
              </Link>
              <Link href="/docs/guides" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Guides
              </Link>
              <Link href="/docs/help" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                FAQ &amp; Help
              </Link>
              <Link href="/listings/create" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Create Listing
              </Link>
              <Link href="/listinggenius" className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099]/20 font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                ListingGenius
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
