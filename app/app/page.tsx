import { Suspense } from 'react'
import Header from '@/components/Header'
import ListingFeed from '@/components/ListingFeed'
import DisclaimerBanner from '@/components/DisclaimerBanner'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <DisclaimerBanner />
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">For Sale By Degen</h1>
          <p className="text-muted-foreground mb-6">
            Anonymous decentralized marketplace. No tracking. No data sharing. Wallet-only.
          </p>
        </div>

        <Suspense fallback={<div className="text-center py-12">Loading listings...</div>}>
          <ListingFeed />
        </Suspense>
      </main>
    </div>
  )
}
