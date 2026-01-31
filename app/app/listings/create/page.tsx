import CreateListingForm from '@/components/CreateListingForm'
import Header from '@/components/Header'
import DisclaimerBanner from '@/components/DisclaimerBanner'

export default function CreateListingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <DisclaimerBanner />
        <h1 className="text-3xl font-bold mb-6">Create New Listing</h1>
        <CreateListingForm />
      </main>
    </div>
  )
}
