/**
 * Donate an unused vanity keypair to the pool.
 * Called when user creates listing without token but had a vanity address ready.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { encryptData } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const publicKey = typeof body.publicKey === 'string' ? body.publicKey.trim() : ''
    const secretKey = body.secretKey
    const suffix = typeof body.suffix === 'string' ? body.suffix.trim().toLowerCase().slice(0, 8) || 'pump' : 'pump'

    if (!publicKey || publicKey.length < 32) {
      return NextResponse.json({ error: 'Invalid publicKey' }, { status: 400 })
    }
    if (!Array.isArray(secretKey) || secretKey.length !== 64) {
      return NextResponse.json({ error: 'Invalid secretKey (expected 64-element array)' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const encrypted = encryptData(JSON.stringify(secretKey))
    const { error } = await supabaseAdmin.from('vanity_pool').insert({
      public_key: publicKey,
      secret_key_encrypted: encrypted,
      suffix,
    })

    if (error) {
      console.error('[vanity-pool] donate error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[vanity-pool] donate:', err)
    return NextResponse.json({ error: 'Donate failed' }, { status: 500 })
  }
}
