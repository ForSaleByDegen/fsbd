'use client'

import Header from '@/components/Header'
import ListingDetail from '@/components/ListingDetail'
import DisclaimerBanner from '@/components/DisclaimerBanner'

// Force dynamic rendering for listing detail pages
export const dynamic = 'force-dynamic'

export default function ListingPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full relative z-10">
        <DisclaimerBanner />
        <ListingDetail listingId={params.id} />
      </main>
    </div>
  )
}
