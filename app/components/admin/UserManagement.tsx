'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  wallet_address_hash: string
  tier: string
  listings_count: number
  total_fees_paid: number
  total_listings_sold: number
  created_at: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, wallet_address_hash, tier, listings_count, total_fees_paid, total_listings_sold, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    searchQuery === '' ||
    user.wallet_address_hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.tier.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00ff00]"></div>
        <p className="text-purple-readable font-pixel-alt mt-2 text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Loading users...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by wallet hash or tier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-black/30 border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-sm placeholder:text-purple-readable focus:border-[#00ff00] focus:outline-none"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        />
      </div>

      {/* Users Table */}
      <div className="pixel-box bg-black border-2 border-[#660099] p-4 overflow-x-auto">
        <div className="min-w-full">
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-purple-readable font-pixel-alt py-8" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                No users found
              </p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border-b border-[#660099]/30 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[#00ff00] font-pixel-alt text-xs sm:text-sm break-all" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                      {user.wallet_address_hash.substring(0, 16)}...
                    </p>
                    <p className="text-purple-readable font-pixel-alt text-xs mt-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                      Tier: {user.tier} • Joined: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs sm:text-sm">
                    <div className="text-center">
                      <p className="text-purple-readable font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>Listings</p>
                      <p className="text-[#00ff00] font-pixel" style={{ fontFamily: 'var(--font-pixel)' }}>{user.listings_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-purple-readable font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>Sold</p>
                      <p className="text-[#00ff00] font-pixel" style={{ fontFamily: 'var(--font-pixel)' }}>{user.total_listings_sold || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-purple-readable font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>Fees Paid</p>
                      <p className="text-[#00ff00] font-pixel" style={{ fontFamily: 'var(--font-pixel)' }}>{user.total_fees_paid.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="text-purple-readable font-pixel-alt text-xs text-center" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Showing {filteredUsers.length} of {users.length} users
      </p>
    </div>
  )
}
