import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Skip auth for static files and API routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for the cookie
  const testerCookie = request.cookies.get('ezinsure-tester')

  // If trying to access coming-soon but has valid cookie, redirect to home
  if (request.nextUrl.pathname.startsWith('/coming-soon')) {
    if (testerCookie?.value === 'solektraRwanda@2025') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // For all other routes, require valid cookie
  if (!testerCookie || testerCookie.value !== 'solektraRwanda@2025') {
    return NextResponse.redirect(new URL('/coming-soon', request.url))
  }

  return NextResponse.next()
}