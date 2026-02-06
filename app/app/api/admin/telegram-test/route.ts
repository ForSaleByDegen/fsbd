/**
 * Admin-only: Send a test message to the Telegram channel.
 * POST { wallet }
 * Verifies TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID and sends a test post.
 */
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''

    if (!wallet) {
      return NextResponse.json({ error: 'wallet required' }, { status: 400 })
    }

    const ok = await isAdmin(wallet)
    if (!ok) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const token = process.env.TELEGRAM_BOT_TOKEN
    const channelId = process.env.TELEGRAM_CHANNEL_ID

    if (!token || !channelId) {
      return NextResponse.json({
        ok: false,
        error: 'Missing env vars',
        details: {
          hasToken: !!token,
          hasChannelId: !!channelId,
          hint: 'Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID in Vercel → Project → Settings → Environment Variables, then redeploy.',
        },
      })
    }

    const testCaption = '🧪 <b>FSBD Telegram Test</b>\n\nIf you see this, the bot is working and new listings will be posted here.'

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text: testCaption,
        parse_mode: 'HTML',
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: 'Telegram API error',
        status: res.status,
        details: data.description || data,
        hint: data.description?.includes('chat not found')
          ? 'Ensure the bot is added as an admin to the channel and TELEGRAM_CHANNEL_ID is correct (@channelname or -100xxxxx).'
          : undefined,
      })
    }

    return NextResponse.json({
      ok: true,
      message: 'Test message sent to channel. Check your Telegram channel.',
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
