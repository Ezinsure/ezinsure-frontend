import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/apply', '/login', '/register', '/track', '/terms-and-conditions', '/privacy-policy', '/FAQ', '/reset-password', '/verify-email-change'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Debug logs
  // console.log('Middleware processing:', pathname);
  // console.log('Cookies:', {
  //   token: request.cookies.get('ezinsure_token')?.value,
  //   user: request.cookies.get('ezinsure_user')?.value
  // });

  // Commented out - tester functionality no longer needed
  // Check tester status
  // const isTester = request.cookies.get('ezinsure-tester')?.value === 'solektraRwanda@2025';

  // Commented out - /coming-soon route no longer needed
  // Handle /coming-soon specially
  // if (pathname === '/coming-soon') {
  //   return isTester 
  //     ? NextResponse.redirect(new URL('/', request.url))
  //     : NextResponse.next();
  // }

  // Check authentication
  const token = request.cookies.get('ezinsure_token')?.value;
  const userCookie = request.cookies.get('ezinsure_user')?.value;

  if (token && userCookie) {
    try {
      const user = JSON.parse(userCookie);
      
      if (!user?.role) {
        throw new Error('Invalid user data: missing role');
      }

      const rolePrefix = `/${user.role.toLowerCase()}`;
      // console.log('Authenticated user:', user);

      // Allow access to verification page even if authenticated (user might be verifying email change)
      if (pathname === '/verify-email-change') {
        return NextResponse.next();
      }

      // Redirect authenticated users away from public routes
      if (PUBLIC_ROUTES.includes(pathname)) {
        return NextResponse.redirect(new URL(`${rolePrefix}/dashboard`, request.url));
      }

      // Ensure role-based access
      if (!pathname.startsWith(rolePrefix)) {
        return NextResponse.redirect(new URL(`${rolePrefix}/dashboard`, request.url));
      }

      // Special handling for super_admin routes
      if (user.role === 'SUPER_ADMIN' && !pathname.startsWith('/super_admin')) {
        return NextResponse.redirect(new URL('/super_admin/dashboard', request.url));
      }

      // Special handling for finance routes
      if (user.role === 'FINANCE' && !pathname.startsWith('/finance')) {
        return NextResponse.redirect(new URL('/finance/dashboard', request.url));
      }

      return NextResponse.next();
    } catch (error) {
      console.error('Authentication error:', error);
      // Clear invalid cookies
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('ezinsure_token');
      response.cookies.delete('ezinsure_user');
      return response;
    }
  }

  // Commented out - tester access no longer needed
  // Handle tester access
  // if (isTester) {
  //   if (pathname.startsWith('/admin') || pathname.startsWith('/agent')) {
  //     return NextResponse.redirect(new URL('/', request.url));
  //   }
  //   return NextResponse.next();
  // }

  // Allow access to public routes without authentication
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // For protected routes, redirect to login if not authenticated
  return NextResponse.redirect(new URL('/login', request.url));
}