import { Suspense } from 'react'
import dynamicImport from 'next/dynamic'
import Header from '@/components/Header'
import ListingFeed from '@/components/ListingFeed'
import ExternalListingsSection from '@/components/ExternalListingsSection'
import AsciiLogo from '@/components/AsciiLogo'
import LoadingScreen from '@/components/LoadingScreen'
import Footer from '@/components/Footer'

// Force dynamic rendering - listings are fetched client-side
export const dynamic = 'force-dynamic'

const BetaLanding = dynamicImport(() => import('@/components/BetaLanding'), { ssr: false })

const isBetaMode = process.env.NEXT_PUBLIC_BETA_MODE === 'true'

export default function Home() {
  if (isBetaMode) {
    return (
      <div className="min-h-screen bg-background text-foreground w-full overflow-x-hidden">
        <Header />
        <main className="w-full">
          <BetaLanding />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground w-full overflow-x-hidden">
      <Header />
      
      <main className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full">
        <div className="mb-6 sm:mb-8 md:mb-10 text-center w-full">
          <AsciiLogo />
        </div>

        <Suspense fallback={<LoadingScreen />}>
          <ListingFeed />
        </Suspense>

        <ExternalListingsSection />
      </main>
      
      <Footer />
    </div>
  )
}
