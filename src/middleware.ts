import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SecurityBroker } from './lib/security';

const security = SecurityBroker.getInstance();

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Rate limiting
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const isAllowed = security.rateLimit(clientIP, 100, 60000); // 100 requests per minute
  
  if (!isAllowed) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  
  // CSRF protection for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    if (origin && host && !origin.includes(host)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
