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
    <div className="min-h-screen bg-background text-foreground w-full overflow-x-hidden">
      <Header />
      
      <main className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full">
        <DisclaimerBanner />
        
        <div className="mb-6 sm:mb-8 md:mb-10 text-center w-full">
          <AsciiLogo />
        </div>

        <Suspense fallback={<LoadingScreen />}>
          <ListingFeed />
        </Suspense>
      </main>
    </div>
  )
}
