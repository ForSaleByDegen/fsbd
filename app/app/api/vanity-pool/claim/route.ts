/**
 * Claim a vanity keypair from the pool.
 * Returns one available keypair and deletes it (first-in-first-out by created_at).
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { decryptData } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const suffix = request.nextUrl.searchParams.get('suffix')?.trim().toLowerCase().slice(0, 8) || 'pump'

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { data: rows, error } = await supabaseAdmin
      .from('vanity_pool')
      .select('id, public_key, secret_key_encrypted')
      .eq('suffix', suffix)
      .order('created_at', { ascending: true })
      .limit(1)

    if (error) {
      console.error('[vanity-pool] claim error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!rows?.length) {
      return NextResponse.json({ claimed: false })
    }

    const row = rows[0]
    let secretKey: number[]
    try {
      secretKey = JSON.parse(decryptData(row.secret_key_encrypted))
    } catch {
      console.error('[vanity-pool] decrypt failed for', row.id)
      await supabaseAdmin.from('vanity_pool').delete().eq('id', row.id)
      return NextResponse.json({ claimed: false })
    }

    await supabaseAdmin.from('vanity_pool').delete().eq('id', row.id)
    return NextResponse.json({
      claimed: true,
      publicKey: row.public_key,
      secretKey,
    })
  } catch (err) {
    console.error('[vanity-pool] claim:', err)
    return NextResponse.json({ error: 'Claim failed' }, { status: 500 })
  }
}
