import { Suspense } from 'react'
import Header from '@/components/Header'
import ListingFeed from '@/components/ListingFeed'
import DisclaimerBanner from '@/components/DisclaimerBanner'

// Force dynamic rendering - listings are fetched client-side
export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <DisclaimerBanner />
        
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            For Sale By Degen
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Anonymous decentralized marketplace on Solana. No tracking. No data sharing. Wallet-only. 
            Buy, sell, and trade with crypto payments.
          </p>
        </div>

        <Suspense fallback={<div className="text-center py-12">Loading listings...</div>}>
          <ListingFeed />
        </Suspense>
      </main>
    </div>
  )
}
