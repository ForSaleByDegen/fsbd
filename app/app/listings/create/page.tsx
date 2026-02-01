import CreateListingForm from '@/components/CreateListingForm'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

// Force dynamic rendering - requires wallet connection
export const dynamic = 'force-dynamic'

export default function CreateListingPage() {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-2xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full relative z-10">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 font-pixel text-[#00ff00] break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
          Create New Listing
        </h1>
        <div className="relative z-10">
          <CreateListingForm />
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
