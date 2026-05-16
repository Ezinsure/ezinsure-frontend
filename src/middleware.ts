import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { legacyMotorPathRedirects } from '@/shared/routing/motor-paths';

// Routes that are always accessible without authentication.
const PUBLIC_ROUTES = [
  '/',
  '/apply',
  '/login',
  '/register',
  '/track',
  '/terms-and-conditions',
  '/privacy-policy',
  '/FAQ',
  '/reset-password',
  '/verify-email-change',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for Next.js internals, API routes, and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const legacyTarget = legacyMotorPathRedirects[pathname];
  if (legacyTarget) {
    return NextResponse.redirect(new URL(legacyTarget, request.url));
  }

  const token = request.cookies.get('ezinsure_token')?.value;

  // If there is a token, consider the request authenticated at the middleware level.
  // Detailed role-based routing and redirects are handled in AuthContext on the client,
  // using /auth/me as the single source of truth for the user.
  if (token) {
    return NextResponse.next();
  }

  // No token: allow access only to public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Protected route without authentication: redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}