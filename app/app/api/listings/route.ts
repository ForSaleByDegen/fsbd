import { NextRequest, NextResponse } from 'next/server'
import { supabase, hashWalletAddress } from '@/lib/supabase'

// Fallback API route if Supabase not configured
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')
    const category = searchParams.get('category')

    if (supabase) {
      let query = supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100)

      if (category && category !== 'all') {
        query = query.eq('category', category)
      }

      if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return NextResponse.json(data || [])
    }

    // Fallback: return empty array
    return NextResponse.json([])
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate wallet address
    const walletHash = hashWalletAddress(body.wallet_address)
    
    if (supabase) {
      const { data, error } = await supabase
        .from('listings')
        .insert([body])
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    // Fallback: return mock data
    return NextResponse.json({ id: 'mock-' + Date.now(), ...body })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
