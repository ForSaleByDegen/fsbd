import Header from '@/components/Header'
import ClaimCreatorFees from '@/components/ClaimCreatorFees'

export const dynamic = 'force-dynamic'

/** Admin-only: Claim pump.fun creator fees. Non-admins see access denied. */
export default function ClaimFeesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Claim Creator Fees</h1>
        <p className="text-muted-foreground mb-6">
          Admin-only. Collect unclaimed creator fees from pump.fun tokens. Pump.fun claims all fees in one transaction.
        </p>
        <ClaimCreatorFees />
      </main>
    </div>
  )
}
