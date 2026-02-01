import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * When NEXT_PUBLIC_BETA_MODE=true, lock down marketplace routes.
 * Users see the beta landing and can only sign up for access.
 * Public pages (why, terms, privacy, admin) remain accessible.
 */
const BETA_LOCKED_PATHS = [
  '/listings',
  '/profile',
  '/seller',
  '/tiers',
  '/report',
]

function isBetaLockedPath(pathname: string): boolean {
  return BETA_LOCKED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export function middleware(request: NextRequest) {
  const isBetaMode = process.env.NEXT_PUBLIC_BETA_MODE === 'true'
  if (!isBetaMode) return NextResponse.next()

  const { pathname } = request.nextUrl
  if (isBetaLockedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('locked', '1')
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/listings/:path*', '/profile', '/profile/:path*', '/seller', '/seller/:path*', '/tiers', '/tiers/:path*', '/report', '/report/:path*'],
}
