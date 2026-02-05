/**
 * POST /api/beta-signup
 * Submit wallet for beta waitlist
 * Body: { wallet: string } - base58 Solana wallet address
 */
import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'betaSignup')
  if (rateLimited) return rateLimited

  try {
    const body = await request.json().catch(() => ({}))
    const wallet = String(body.wallet ?? '').trim()

    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json(
        { error: 'Invalid wallet address. Connect your wallet and try again.' },
        { status: 400 }
      )
    }

    try {
      new PublicKey(wallet)
    } catch {
      return NextResponse.json(
        { error: 'Invalid wallet format.' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Beta signup is not configured.' },
        { status: 503 }
      )
    }

    const walletHash = hashWalletAddress(wallet)

    const { error } = await supabaseAdmin
      .from('beta_signups')
      .upsert(
        {
          wallet_address: wallet,
          wallet_address_hash: walletHash,
        },
        { onConflict: 'wallet_address_hash' }
      )

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: true, message: 'You are already on the list!' })
      }
      console.error('[beta-signup]', error)
      return NextResponse.json({ error: 'Failed to sign up. Try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "You're on the list! We'll notify you when we launch." })
  } catch (e) {
    console.error('[beta-signup]', e)
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    )
  }
}
