'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { isAdmin, getAdminUser, type AdminUser } from '@/lib/admin'
import AdminDashboard from '@/components/admin/AdminDashboard'
import LoadingScreen from '@/components/LoadingScreen'

export default function AdminPage() {
  const { publicKey, connected } = useWallet()
  const router = useRouter()
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdminUser, setIsAdminUser] = useState(false)

  useEffect(() => {
    if (connected && publicKey) {
      checkAdminAccess()
    } else {
      setLoading(false)
    }
  }, [connected, publicKey])

  const checkAdminAccess = async () => {
    if (!publicKey) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const adminStatus = await isAdmin(publicKey.toString())
      setIsAdminUser(adminStatus)
      
      if (adminStatus) {
        const admin = await getAdminUser(publicKey.toString())
        setAdminUser(admin)
      } else {
        // Not an admin, redirect
        router.push('/')
      }
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background w-full overflow-x-hidden">
        <Header />
        <main className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full">
          <LoadingScreen />
        </main>
      </div>
    )
  }

  if (!connected || !isAdminUser || !adminUser) {
    return (
      <div className="min-h-screen bg-background w-full overflow-x-hidden">
        <Header />
        <main className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full">
          <div className="text-center py-16">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-[#660099] mb-4 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
              Access Denied
            </h1>
            <p className="text-[#00ff00] font-pixel-alt mb-6 text-sm sm:text-base" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
              You must be an admin to access this page.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-4 sm:px-6 py-2 sm:py-3 border-2 sm:border-4 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt transition-colors min-h-[44px] text-sm sm:text-base touch-manipulation"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              Go Home
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full relative z-10">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-pixel text-[#660099] mb-2 break-words" style={{ fontFamily: 'var(--font-pixel)' }}>
            Admin Dashboard
          </h1>
          <p className="text-[#00ff00] font-pixel-alt text-xs sm:text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Role: {adminUser.role} | Permissions: {adminUser.permissions.join(', ')}
          </p>
        </div>

        <AdminDashboard adminUser={adminUser} />
      </main>
    </div>
  )
}
