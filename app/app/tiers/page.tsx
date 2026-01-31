import Header from '@/components/Header'
import TierDisplay from '@/components/TierDisplay'
import DisclaimerBanner from '@/components/DisclaimerBanner'

export default function TiersPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <DisclaimerBanner />
        <h1 className="text-3xl font-bold mb-6">$FSBD Access Tiers</h1>
        <TierDisplay />
      </main>
    </div>
  )
}
