/**
 * PATCH /api/profile/shipping-address
 * Save or update user's delivery address (General Delivery, PO Box, or home).
 * Body: { wallet: string, address: ShippingAddress }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function isValidAddress(addr: unknown): addr is { type: string; name: string; city: string; state: string; zip: string; street1?: string } {
  if (!addr || typeof addr !== 'object') return false
  const a = addr as Record<string, unknown>
  return (
    typeof a.type === 'string' &&
    ['general_delivery', 'po_box', 'home'].includes(a.type) &&
    typeof a.name === 'string' &&
    a.name.trim().length > 0 &&
    typeof a.city === 'string' &&
    a.city.trim().length > 0 &&
    typeof a.state === 'string' &&
    a.state.trim().length >= 2 &&
    typeof a.zip === 'string' &&
    a.zip.trim().length >= 5
  )
}

export async function PATCH(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    const address = body.address

    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }
    if (!isValidAddress(address)) {
      return NextResponse.json({ error: 'Invalid address. Need type, name, city, state, zip.' }, { status: 400 })
    }

    const walletHash = hashWalletAddress(wallet)

    const addrPayload = {
      type: address.type,
      name: String(address.name).trim(),
      city: String(address.city).trim(),
      state: String(address.state).trim().toUpperCase().slice(0, 2),
      zip: String(address.zip).trim().slice(0, 10),
      street1: address.type === 'general_delivery' ? 'GENERAL DELIVERY' : (address.street1 ? String(address.street1).trim() : undefined),
      street2: address.street2 ? String(address.street2).trim() : undefined,
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ shipping_address: addrPayload })
      .eq('wallet_address_hash', walletHash)

    if (error) {
      console.error('[shipping-address] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[shipping-address] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
