import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { supabase, hashWalletAddress } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

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
    const wa = String(body.wallet_address ?? '').trim()

    // Validate wallet_address before storing (prevents corrupted data)
    if (!wa || !BASE58.test(wa)) {
      return NextResponse.json(
        { error: 'Invalid wallet address. Please reconnect your wallet and try again.' },
        { status: 400 }
      )
    }
    try {
      new PublicKey(wa)
    } catch {
      return NextResponse.json(
        { error: 'Invalid wallet address format. Please reconnect your wallet.' },
        { status: 400 }
      )
    }

    const walletHash = hashWalletAddress(wa)
    const listingData = { ...body, wallet_address: wa, wallet_address_hash: walletHash }

    // Prefer supabaseAdmin (bypasses RLS) for reliable insert
    const client = supabaseAdmin || supabase
    if (client) {
      const { data, error } = await client
        .from('listings')
        .insert([listingData])
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    return NextResponse.json({ id: 'mock-' + Date.now(), ...listingData })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
