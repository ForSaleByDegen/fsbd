'use client'

import { useEffect, useState } from 'react'

interface Analytics {
  totalListings: number
  activeListings: number
  soldListings: number
  totalUsers: number
  totalFees: number
  totalPlatformFees: number
  listingsByCategory: Record<string, number>
  recentActivity: { id: string; title: string; status: string; created_at: string; category: string }[]
  betaSignups: number
  bugReports: number
}

interface AdminAnalyticsProps {
  adminWallet: string
}

export default function AdminAnalytics({ adminWallet }: AdminAnalyticsProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!adminWallet) {
      setLoading(false)
      return
    }
    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminWallet])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: adminWallet }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to load analytics')
      }
      const data = await res.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00ff00]"></div>
        <p className="text-purple-readable font-pixel-alt mt-2 text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Loading analytics...
        </p>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-purple-readable font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Unable to load analytics. Please check Supabase configuration.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="pixel-box bg-black border-2 border-[#660099] p-4">
          <h3 className="text-purple-readable font-pixel-alt text-xs sm:text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Total Listings
          </h3>
          <p className="text-2xl sm:text-3xl font-pixel text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel)' }}>
            {analytics.totalListings}
          </p>
        </div>

        <div className="pixel-box bg-black border-2 border-[#660099] p-4">
          <h3 className="text-purple-readable font-pixel-alt text-xs sm:text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Active Listings
          </h3>
          <p className="text-2xl sm:text-3xl font-pixel text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel)' }}>
            {analytics.activeListings}
          </p>
        </div>

        <div className="pixel-box bg-black border-2 border-[#660099] p-4">
          <h3 className="text-purple-readable font-pixel-alt text-xs sm:text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Sold
          </h3>
          <p className="text-2xl sm:text-3xl font-pixel text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel)' }}>
            {analytics.soldListings ?? 0}
          </p>
        </div>

        <div className="pixel-box bg-black border-2 border-[#660099] p-4">
          <h3 className="text-purple-readable font-pixel-alt text-xs sm:text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Total Users
          </h3>
          <p className="text-2xl sm:text-3xl font-pixel text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel)' }}>
            {analytics.totalUsers}
          </p>
        </div>

        <div className="pixel-box bg-black border-2 border-[#660099] p-4">
          <h3 className="text-purple-readable font-pixel-alt text-xs sm:text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Beta Signups
          </h3>
          <p className="text-2xl sm:text-3xl font-pixel text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel)' }}>
            {analytics.betaSignups ?? 0}
          </p>
        </div>

        <div className="pixel-box bg-black border-2 border-[#660099] p-4">
          <h3 className="text-purple-readable font-pixel-alt text-xs sm:text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Bug Reports
          </h3>
          <p className="text-2xl sm:text-3xl font-pixel text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel)' }}>
            {analytics.bugReports ?? 0}
          </p>
        </div>

        <div className="pixel-box bg-black border-2 border-[#660099] p-4">
          <h3 className="text-purple-readable font-pixel-alt text-xs sm:text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Listing Fees (SOL)
          </h3>
          <p className="text-2xl sm:text-3xl font-pixel text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel)' }}>
            {analytics.totalFees.toFixed(4)}
          </p>
        </div>

        <div className="pixel-box bg-black border-2 border-[#660099] p-4">
          <h3 className="text-purple-readable font-pixel-alt text-xs sm:text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Platform Fees (0.42%)
          </h3>
          <p className="text-2xl sm:text-3xl font-pixel text-[#ff00ff]" style={{ fontFamily: 'var(--font-pixel)' }}>
            {analytics.totalPlatformFees.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="pixel-box bg-black border-2 border-[#660099] p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-pixel text-[#00ff00] mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
          Listings by Category
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(analytics.listingsByCategory).map(([category, count]) => (
            <div key={category} className="text-center">
              <p className="text-purple-readable font-pixel-alt text-xs sm:text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                {category.replace('-', ' ')}
              </p>
              <p className="text-xl font-pixel text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel)' }}>
                {count}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="pixel-box bg-black border-2 border-[#660099] p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-pixel text-[#00ff00] mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
          Recent Activity
        </h2>
        <div className="space-y-2">
          {analytics.recentActivity.map((activity: { id: string; title: string; status: string; created_at: string; category: string }) => (
            <div
              key={activity.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 border-b border-[#660099]/30"
            >
              <div className="flex-1">
                <p className="text-[#00ff00] font-pixel-alt text-xs sm:text-sm break-words" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  {activity.title}
                </p>
                <p className="text-purple-readable font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  {activity.category} • {new Date(activity.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs font-pixel-alt px-2 py-1 ${
                activity.status === 'active' ? 'text-[#00ff00]' : 'text-purple-readable'
              }`} style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                {activity.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
