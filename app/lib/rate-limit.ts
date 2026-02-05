/**
 * In-memory rate limiter for API routes.
 * Uses IP (or forwarded headers) as key. Per-instance on serverless.
 */
import { NextResponse } from 'next/server'

type Window = { count: number; resetAt: number }

const store = new Map<string, Window>()
const CLEANUP_INTERVAL = 60_000 // 1 min
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  store.forEach((w, key) => {
    if (w.resetAt < now) store.delete(key)
  })
}

export interface RateLimitConfig {
  /** Max requests per window */
  max: number
  /** Window in seconds */
  windowSec: number
}

/** Default limits per route type */
export const RATE_LIMITS = {
  fetchProductInfo: { max: 10, windowSec: 60 },
  uploadImageFromUrl: { max: 10, windowSec: 60 },
  pumpIpfs: { max: 15, windowSec: 60 },
  tokenMetadata: { max: 15, windowSec: 60 },
  createListing: { max: 20, windowSec: 60 },
  betaSignup: { max: 5, windowSec: 300 },
  bugReport: { max: 5, windowSec: 300 },
  balanceCheck: { max: 30, windowSec: 60 },
  verifyAssetOwnership: { max: 20, windowSec: 60 },
  adminVerifySeller: { max: 20, windowSec: 60 },
  sellerVerifications: { max: 30, windowSec: 60 },
  verifyOAuth: { max: 15, windowSec: 60 },
  general: { max: 60, windowSec: 60 },
} as const

/**
 * Get client identifier from request (IP, x-forwarded-for, etc.)
 */
export function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnecting = request.headers.get('cf-connecting-ip')
  const ip = cfConnecting || realIp || (forwarded ? forwarded.split(',')[0].trim() : null) || 'unknown'
  return ip
}

/**
 * Check if request is rate limited. Returns { allowed: boolean, remaining: number, resetIn: number }
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
  cleanup()
  const now = Date.now()
  const windowMs = config.windowSec * 1000
  const w = store.get(key)
  if (!w) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: config.max - 1, resetIn: config.windowSec }
  }
  if (w.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: config.max - 1, resetIn: config.windowSec }
  }
  w.count++
  const remaining = Math.max(0, config.max - w.count)
  const resetIn = Math.ceil((w.resetAt - now) / 1000)
  return {
    allowed: w.count <= config.max,
    remaining,
    resetIn,
  }
}

/**
 * Check rate limit and return 429 response if exceeded. Call at start of API route.
 * Returns null if allowed, or NextResponse with 429 if rate limited.
 */
export function checkRateLimit(
  request: Request,
  routeKey: keyof typeof RATE_LIMITS
): NextResponse | null {
  const config = RATE_LIMITS[routeKey] ?? RATE_LIMITS.general
  const id = getClientId(request)
  const key = `${routeKey}:${id}`
  const result = rateLimit(key, config)
  if (!result.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.resetIn,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.resetIn),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }
  return null
}
