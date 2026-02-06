'use client'

import { useState } from 'react'
import { type AdminUser } from '@/lib/admin'
import ListingManagement from './ListingManagement'
import UserManagement from './UserManagement'
import AdminAnalytics from './AdminAnalytics'
import PlatformConfig from './PlatformConfig'
import ProtectionClaimsAdmin from './ProtectionClaimsAdmin'
import EscrowAdmin from './EscrowAdmin'
import ListerAirdropAdmin from './ListerAirdropAdmin'

interface AdminDashboardProps {
  adminUser: AdminUser
}

export default function AdminDashboard({ adminUser }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'listings' | 'users' | 'config' | 'claims' | 'escrow' | 'airdrop'>('analytics')

  const tabs = [
    { id: 'analytics' as const, label: 'Analytics', permission: 'view_analytics' as const },
    { id: 'listings' as const, label: 'Listings', permission: 'manage_listings' as const },
    { id: 'users' as const, label: 'Users', permission: 'manage_users' as const },
    { id: 'escrow' as const, label: 'Escrow', permission: 'manage_listings' as const },
    { id: 'claims' as const, label: 'Protection Claims', permission: 'view_analytics' as const },
    { id: 'airdrop' as const, label: 'Lister Airdrop', permission: 'view_analytics' as const },
    { id: 'config' as const, label: 'Platform Config', permission: 'view_analytics' as const },
  ]

  const availableTabs = tabs.filter(tab => 
    adminUser.role === 'admin' || adminUser.permissions.includes(tab.permission)
  )

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b-2 border-[#660099] pb-2">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 border-2 font-pixel-alt text-sm sm:text-base min-h-[44px] touch-manipulation transition-colors ${
              activeTab === tab.id
                ? 'border-[#00ff00] text-[#00ff00] bg-black/50'
                : 'border-[#660099] text-[#660099] hover:border-[#00ff00] hover:text-[#00ff00]'
            }`}
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="w-full">
        {activeTab === 'analytics' && <AdminAnalytics adminWallet={adminUser.wallet_address} />}
        {activeTab === 'listings' && <ListingManagement />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'claims' && <ProtectionClaimsAdmin adminWallet={adminUser.wallet_address} />}
        {activeTab === 'escrow' && <EscrowAdmin adminWallet={adminUser.wallet_address} />}
        {activeTab === 'airdrop' && <ListerAirdropAdmin adminWallet={adminUser.wallet_address} />}
        {activeTab === 'config' && <PlatformConfig />}
      </div>
    </div>
  )
}
