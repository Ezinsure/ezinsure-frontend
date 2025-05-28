import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/', '/apply', '/login', '/register', '/track', '/coming-soon'];

export function middleware(request: NextRequest) {
  // Skip auth for static files and API routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for the tester cookie first
  const testerCookie = request.cookies.get('ezinsure-tester');

  // If trying to access coming-soon but has valid cookie, redirect to home
  if (request.nextUrl.pathname.startsWith('/coming-soon')) {
    if (testerCookie?.value === 'solektraRwanda@2025') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // For all other non-public routes, require valid tester cookie
  if (!publicRoutes.includes(request.nextUrl.pathname) && 
      (!testerCookie || testerCookie.value !== 'solektraRwanda@2025')) {
    return NextResponse.redirect(new URL('/coming-soon', request.url));
  }

  // Check for authentication for protected routes
  if (!publicRoutes.includes(request.nextUrl.pathname)) {
    const token = request.cookies.get('ezinsure_token');
    const user = request.cookies.get('ezinsure_user');

    // If no token or user, redirect to login
    if (!token || !user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const userData = JSON.parse(user.value);
      const rolePrefix = `/${userData.role.toLowerCase()}`;

      // Check if user is trying to access a route that matches their role
      if (!request.nextUrl.pathname.startsWith(rolePrefix)) {
        return NextResponse.redirect(new URL(`${rolePrefix}/dashboard`, request.url));
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}