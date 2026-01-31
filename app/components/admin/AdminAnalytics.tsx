'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Analytics {
  totalListings: number
  activeListings: number
  totalUsers: number
  totalFees: number
  totalPlatformFees: number // Platform fees from sales (0.42%)
  listingsByCategory: Record<string, number>
  recentActivity: any[]
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Get total listings
      const { count: totalListings } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })

      // Get active listings
      const { count: activeListings } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Get total listing fees (from token launches)
      const { data: feesData } = await supabase
        .from('listings')
        .select('fee_paid')

      const totalFees = feesData?.reduce((sum, listing) => sum + (listing.fee_paid || 0), 0) || 0

      // Get total platform fees (0.42% from sales)
      const { data: platformFeesData } = await supabase
        .from('listings')
        .select('platform_fee')
        .eq('status', 'sold')

      const totalPlatformFees = platformFeesData?.reduce((sum, listing) => sum + (listing.platform_fee || 0), 0) || 0

      // Get listings by category
      const { data: categoryData } = await supabase
        .from('listings')
        .select('category')

      const listingsByCategory: Record<string, number> = {}
      categoryData?.forEach(listing => {
        listingsByCategory[listing.category] = (listingsByCategory[listing.category] || 0) + 1
      })

      // Get recent activity (last 10 listings)
      const { data: recentActivity } = await supabase
        .from('listings')
        .select('id, title, status, created_at, category')
        .order('created_at', { ascending: false })
        .limit(10)

      setAnalytics({
        totalListings: totalListings || 0,
        activeListings: activeListings || 0,
        totalUsers: totalUsers || 0,
        totalFees,
        totalPlatformFees,
        listingsByCategory,
        recentActivity: recentActivity || []
      })
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
        <p className="text-[#660099] font-pixel-alt mt-2 text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Loading analytics...
        </p>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-[#660099] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
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
          <h3 className="text-[#660099] font-pixel-alt text-xs sm:text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Total Listings
          </h3>
          <p className="text-2xl sm:text-3xl font-pixel text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel)' }}>
            {analytics.totalListings}
          </p>
        </div>

        <div className="pixel-box bg-black border-2 border-[#660099] p-4">
          <h3 className="text-[#660099] font-pixel-alt text-xs sm:text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Active Listings
          </h3>
          <p className="text-2xl sm:text-3xl font-pixel text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel)' }}>
            {analytics.activeListings}
          </p>
        </div>

        <div className="pixel-box bg-black border-2 border-[#660099] p-4">
          <h3 className="text-[#660099] font-pixel-alt text-xs sm:text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Total Users
          </h3>
          <p className="text-2xl sm:text-3xl font-pixel text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel)' }}>
            {analytics.totalUsers}
          </p>
        </div>

        <div className="pixel-box bg-black border-2 border-[#660099] p-4">
          <h3 className="text-[#660099] font-pixel-alt text-xs sm:text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Listing Fees (SOL)
          </h3>
          <p className="text-2xl sm:text-3xl font-pixel text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel)' }}>
            {analytics.totalFees.toFixed(4)}
          </p>
        </div>

        <div className="pixel-box bg-black border-2 border-[#660099] p-4">
          <h3 className="text-[#660099] font-pixel-alt text-xs sm:text-sm mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
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
              <p className="text-[#660099] font-pixel-alt text-xs sm:text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
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
          {analytics.recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 border-b border-[#660099]/30"
            >
              <div className="flex-1">
                <p className="text-[#00ff00] font-pixel-alt text-xs sm:text-sm break-words" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  {activity.title}
                </p>
                <p className="text-[#660099] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  {activity.category} • {new Date(activity.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs font-pixel-alt px-2 py-1 ${
                activity.status === 'active' ? 'text-[#00ff00]' : 'text-[#660099]'
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
