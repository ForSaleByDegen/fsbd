/**
 * GET /api/validators
 * Returns list of active validators for find-comps routing.
 * Used server-side by find-comps-from-image. No auth required.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ validators: [], totalValidators: 0, totalStaked: 0 })
    }

    const { data, error } = await supabaseAdmin
      .from('ai_validators')
      .select('endpoint_url, stake_amount, last_health_at')
      .eq('status', 'active')
      .order('last_health_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('[validators] fetch error:', error)
      return NextResponse.json({ validators: [], totalValidators: 0, totalStaked: 0 })
    }

    const validators = (data || []) as { endpoint_url: string; stake_amount: number; last_health_at: string | null }[]
    const totalStaked = validators.reduce((sum, v) => sum + Number(v.stake_amount || 0), 0)

    return NextResponse.json({
      validators,
      totalValidators: validators.length,
      totalStaked,
    })
  } catch (e) {
    console.error('[validators]', e)
    return NextResponse.json({ validators: [], totalValidators: 0, totalStaked: 0 })
  }
}
