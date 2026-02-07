import Header from '@/components/Header'
import ClaimCreatorFees from '@/components/ClaimCreatorFees'

export const dynamic = 'force-dynamic'

/** Claim pump.fun creator fees. Available to any token creator. */
export default function ClaimFeesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Claim Creator Fees</h1>
        <p className="text-muted-foreground mb-6">
          Collect unclaimed creator fees from your pump.fun tokens. Connect your wallet and claim all fees in one transaction.
        </p>
        <ClaimCreatorFees />
      </main>
    </div>
  )
}
