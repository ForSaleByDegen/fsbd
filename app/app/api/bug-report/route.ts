/**
 * Bug report submission - stores in DB and emails forsalebydegen.proton.me
 * Body: { description, error_message?, tx_signature?, screenshot_urls?: string[], wallet? }
 * Or multipart: description, error_message, tx_signature, screenshots (files), wallet
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'

const BUG_REPORT_EMAIL = 'forsalebydegen.proton.me'

async function sendBugReportEmail(subject: string, body: string, screenshotUrls?: string[]) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set - skipping bug report email')
    return
  }
  try {
    const screenshotLinks = screenshotUrls?.length
      ? '\n\nScreenshots:\n' + screenshotUrls.map((u, i) => `${i + 1}. ${u}`).join('\n')
      : ''
    const html = `<pre style="font-family:sans-serif;white-space:pre-wrap">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}${screenshotLinks}</pre>`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FSBD Bug Reports <onboarding@resend.dev>',
        to: [BUG_REPORT_EMAIL],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('Resend error:', err)
    }
  } catch (e) {
    console.error('Bug report email failed:', e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let description = ''
    let errorMessage = ''
    let txSignature = ''
    let screenshotUrls: string[] = []
    let wallet = ''
    let pageUrl = ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      description = String(formData.get('description') || '').trim()
      errorMessage = String(formData.get('error_message') || '').trim()
      txSignature = String(formData.get('tx_signature') || '').trim()
      wallet = String(formData.get('wallet') || '').trim()
      pageUrl = String(formData.get('page_url') || '').trim()
      const urls = formData.get('screenshot_urls')
      if (typeof urls === 'string') {
        try {
          const arr = JSON.parse(urls)
          if (Array.isArray(arr)) screenshotUrls = arr.filter((u): u is string => typeof u === 'string')
        } catch {
          // ignore
        }
      }
    } else {
      const body = await request.json().catch(() => ({}))
      description = String(body.description || '').trim()
      errorMessage = String(body.error_message || '').trim()
      txSignature = String(body.tx_signature || '').trim()
      wallet = String(body.wallet || '').trim()
      pageUrl = String(body.page_url || '').trim()
      if (Array.isArray(body.screenshot_urls)) {
        screenshotUrls = body.screenshot_urls.filter((u: unknown): u is string => typeof u === 'string')
      }
    }

    if (!description || description.length < 10) {
      return NextResponse.json({ error: 'Please provide a description (at least 10 characters)' }, { status: 400 })
    }

    const walletHash = wallet ? hashWalletAddress(wallet) : null

    const insertData = {
      wallet_address_hash: walletHash,
      description,
      error_message: errorMessage || null,
      tx_signature: txSignature || null,
      screenshot_urls: screenshotUrls.length ? screenshotUrls : null,
      page_url: pageUrl || null,
      status: 'new',
    }

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('bug_reports')
        .insert([insertData])
        .select('id, created_at')
        .single()

      if (error) {
        console.error('Bug report insert error:', error)
        return NextResponse.json({ error: 'Failed to save bug report' }, { status: 500 })
      }

      const subject = `[FSBD Bug] ${description.slice(0, 50)}${description.length > 50 ? '...' : ''}`
      const body = [
        `Description: ${description}`,
        errorMessage ? `Error: ${errorMessage}` : null,
        txSignature ? `TX: ${txSignature}` : null,
        pageUrl ? `Page: ${pageUrl}` : null,
        wallet ? `Wallet: ${wallet.slice(0, 8)}...` : null,
        `Report ID: ${data.id}`,
        `Created: ${data.created_at}`,
      ]
        .filter(Boolean)
        .join('\n')

      await sendBugReportEmail(subject, body, screenshotUrls.length ? screenshotUrls : undefined)

      return NextResponse.json({ ok: true, id: data.id })
    }

    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  } catch (e) {
    console.error('Bug report error:', e)
    return NextResponse.json({ error: 'Failed to submit bug report' }, { status: 500 })
  }
}
