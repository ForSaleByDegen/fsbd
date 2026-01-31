import Header from '@/components/Header'
import MyListings from '@/components/MyListings'

export default function MyListingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Listings</h1>
        <MyListings />
      </main>
    </div>
  )
}
