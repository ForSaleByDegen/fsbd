/**
 * Admin-only: validator pool stats and monitoring
 * GET ?wallet=xxx - returns validator counts, job counts, recent jobs
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin } from '@/lib/admin'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
    }

    const isAdminUser = await isAdmin(wallet)
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Validator counts
    const { count: totalValidators } = await supabaseAdmin
      .from('ai_validators')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { data: validatorsByType } = await supabaseAdmin
      .from('ai_validators')
      .select('validator_type')
      .eq('status', 'active')

    const browserCount = validatorsByType?.filter((v) => (v as { validator_type?: string }).validator_type === 'browser').length ?? 0
    const endpointCount = (totalValidators ?? 0) - browserCount

    // Job counts by status
    const statuses = ['pending', 'claimed', 'completed', 'timeout'] as const
    const jobCounts: Record<string, number> = {}
    for (const s of statuses) {
      const { count } = await supabaseAdmin
        .from('validator_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', s)
      jobCounts[s] = count ?? 0
    }

    const totalJobs = Object.values(jobCounts).reduce((a, b) => a + b, 0)
    const completedJobs = jobCounts.completed ?? 0
    const successRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0

    // Recent jobs (last 20)
    const { data: recentJobs } = await supabaseAdmin
      .from('validator_jobs')
      .select('id, status, validator_wallet, created_at, claimed_at, completed_at')
      .order('created_at', { ascending: false })
      .limit(20)

    // Rewards summary
    let totalPendingRewards = 0
    let totalPaidRewards = 0
    try {
      const { data: pending } = await supabaseAdmin
        .from('validator_rewards_ledger')
        .select('amount')
        .eq('status', 'pending')
      const { data: paid } = await supabaseAdmin
        .from('validator_rewards_ledger')
        .select('amount')
        .eq('status', 'paid')
      totalPendingRewards = pending?.reduce((s, r) => s + (Number((r as { amount: number }).amount) || 0), 0) ?? 0
      totalPaidRewards = paid?.reduce((s, r) => s + (Number((r as { amount: number }).amount) || 0), 0) ?? 0
    } catch {
      // Table may not exist yet
    }

    return NextResponse.json({
      validators: {
        total: totalValidators ?? 0,
        browser: browserCount,
        endpoint: endpointCount,
      },
      jobs: {
        total: totalJobs,
        pending: jobCounts.pending ?? 0,
        claimed: jobCounts.claimed ?? 0,
        completed: completedJobs,
        timeout: jobCounts.timeout ?? 0,
        success_rate_percent: successRate,
      },
      rewards: {
        total_pending: totalPendingRewards,
        total_paid: totalPaidRewards,
      },
      recent_jobs: (recentJobs ?? []).map((j) => ({
        id: (j as { id: string }).id,
        status: (j as { status: string }).status,
        validator_wallet: (j as { validator_wallet: string | null }).validator_wallet ?? null,
        created_at: (j as { created_at: string }).created_at,
        claimed_at: (j as { claimed_at: string | null }).claimed_at ?? null,
        completed_at: (j as { completed_at: string | null }).completed_at ?? null,
      })),
    })
  } catch (e) {
    console.error('[admin/validator-stats]', e)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
