import { Suspense } from 'react'
import Header from '@/components/Header'
import ListingFeed from '@/components/ListingFeed'
import DisclaimerBanner from '@/components/DisclaimerBanner'
import AsciiLogo from '@/components/AsciiLogo'
import LoadingScreen from '@/components/LoadingScreen'

// Force dynamic rendering - listings are fetched client-side
export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <DisclaimerBanner />
        
        <div className="mb-10 text-center">
          <AsciiLogo />
        </div>

        <Suspense fallback={<LoadingScreen />}>
          <ListingFeed />
        </Suspense>
      </main>
    </div>
  )
}
