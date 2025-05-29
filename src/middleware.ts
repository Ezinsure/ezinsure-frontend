import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/coming-soon'];
const POST_TESTER_PUBLIC_ROUTES = ['/', '/apply', '/login', '/register', '/track'];

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
  //   user: request.cookies.get('ezinsure_user')?.value,
  //   tester: request.cookies.get('ezinsure-tester')?.value
  // });

  // Check tester status
  const isTester = request.cookies.get('ezinsure-tester')?.value === 'solektraRwanda@2025';

  // Handle /coming-soon specially
  if (pathname === '/coming-soon') {
    return isTester 
      ? NextResponse.redirect(new URL('/', request.url))
      : NextResponse.next();
  }

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

      // Redirect authenticated users away from public routes
      if (PUBLIC_ROUTES.includes(pathname) || POST_TESTER_PUBLIC_ROUTES.includes(pathname)) {
        return NextResponse.redirect(new URL(`${rolePrefix}/dashboard`, request.url));
      }

      // Ensure role-based access
      if (!pathname.startsWith(rolePrefix)) {
        return NextResponse.redirect(new URL(`${rolePrefix}/dashboard`, request.url));
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

  // Handle tester access
  if (isTester) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/agent')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Default case: redirect to coming-soon
  return NextResponse.redirect(new URL('/coming-soon', request.url));
}