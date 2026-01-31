'use client'

import Header from '@/components/Header'
import ListingDetail from '@/components/ListingDetail'
import DisclaimerBanner from '@/components/DisclaimerBanner'

export default function ListingPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <DisclaimerBanner />
        <ListingDetail listingId={params.id} />
      </main>
    </div>
  )
}
