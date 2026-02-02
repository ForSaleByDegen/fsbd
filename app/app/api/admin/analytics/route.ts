/**
 * Admin-only: fetch platform analytics
 * Body: { wallet: string } - admin wallet for verification
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin, hasPermission } from '@/lib/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const wallet = String(body?.wallet ?? '').trim()
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
    }

    const isAdminUser = await isAdmin(wallet)
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const canView = await hasPermission(wallet, 'view_analytics')
    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const [
      { count: totalListings },
      { count: activeListings },
      { count: totalUsers },
      { data: feesData },
      { data: platformFeesData },
      { data: categoryData },
      { data: recentActivity },
      { count: betaSignups },
      { count: bugReports },
      { count: soldListings },
    ] = await Promise.all([
      supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('listings').select('fee_paid'),
      supabaseAdmin.from('listings').select('platform_fee').eq('status', 'sold'),
      supabaseAdmin.from('listings').select('category'),
      supabaseAdmin
        .from('listings')
        .select('id, title, status, created_at, category')
        .order('created_at', { ascending: false })
        .limit(10),
      supabaseAdmin.from('beta_signups').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('bug_reports').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
    ])

    const totalFees = feesData.reduce((sum: number, r: { fee_paid?: number }) => sum + (r.fee_paid || 0), 0)
    const totalPlatformFees = platformFeesData.reduce((sum: number, r: { platform_fee?: number }) => sum + (r.platform_fee || 0), 0)

    const listingsByCategory: Record<string, number> = {}
    categoryData.forEach((r: { category?: string }) => {
      const cat = r.category || 'other'
      listingsByCategory[cat] = (listingsByCategory[cat] || 0) + 1
    })

    return NextResponse.json({
      totalListings,
      activeListings,
      soldListings,
      totalUsers,
      totalFees,
      totalPlatformFees,
      listingsByCategory,
      recentActivity,
      betaSignups,
      bugReports,
    })
  } catch (e) {
    console.error('Admin analytics error:', e)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
