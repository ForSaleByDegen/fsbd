/**
 * GET /api/listings/activity
 * Returns recently sold listings (public, for Activity tab)
 * Uses service role when available to bypass RLS
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Prefer admin to read sold listings (RLS may restrict anon to active only)
    const client = supabaseAdmin ?? supabase
    if (!client) {
      return NextResponse.json([])
    }

    const { data, error } = await client
      .from('listings')
      .select('*')
      .eq('status', 'sold')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[listings/activity]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (e) {
    console.error('[listings/activity]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    )
  }
}
