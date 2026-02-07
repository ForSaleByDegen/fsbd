/**
 * Proxy for PumpPortal collectCreatorFee. Returns serialized transaction for client to sign and send.
 * PumpPortal restricts claims to wallets that are token creators; others receive empty/no-op txs.
 * For pump.fun: claims all creator fees at once (no mint param).
 * For Meteora: pass pool='meteora-dbc' and mint for a specific token.
 */
import { NextResponse } from 'next/server'

const PUMP_TRADE_LOCAL = 'https://pumpportal.fun/api/trade-local'

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const publicKey = typeof body.publicKey === 'string' ? body.publicKey.trim() : ''
    if (!publicKey || !BASE58_REGEX.test(publicKey)) {
      return NextResponse.json({ error: 'Invalid publicKey.' }, { status: 400 })
    }

    const priorityFee = typeof body.priorityFee === 'number' && body.priorityFee >= 0
      ? body.priorityFee
      : 0.000001

    const payload: Record<string, unknown> = {
      publicKey,
      action: 'collectCreatorFee',
      priorityFee,
    }

    if (body.pool === 'meteora-dbc' && typeof body.mint === 'string' && BASE58_REGEX.test(body.mint.trim())) {
      payload.pool = 'meteora-dbc'
      payload.mint = body.mint.trim()
    } else {
      payload.pool = 'pump'
    }

    const res = await fetch(PUMP_TRADE_LOCAL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        { error: `PumpPortal error: ${errText}` },
        { status: res.status === 400 ? 400 : 502 }
      )
    }

    const txBytes = await res.arrayBuffer()
    const base64 = Buffer.from(txBytes).toString('base64')
    return NextResponse.json({ txBase64: base64 })
  } catch (e) {
    console.error('[claim-creator-fee]', e)
    return NextResponse.json({ error: 'Failed to build claim transaction.' }, { status: 500 })
  }
}
