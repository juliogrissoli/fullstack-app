import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SecurityBroker } from './lib/security';

const security = SecurityBroker.getInstance();

function logSecurityEvent(event: string, data: any) {
  console.log(`🏛️ SB AUDIT: ${event}`, {
    ...data,
    system_mode: 'SOBERANO',
    timestamp: new Date().toISOString()
  });
}

const PRODUCTION_CONFIG = {
  rateLimit: {
    requests: 50,
    windowMs: 60000,
  },
  security: {
    strictCSRF: true,
  }
};

export function proxy(request: NextRequest) {
  const startTime = Date.now();
  const response = NextResponse.next();

  // Headers de segurança
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';");
  response.headers.set('X-System-Mode', 'SOBERANO');

  // Rate limiting
  const clientIP = request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown';

  const isAllowed = security.rateLimit(
    clientIP,
    PRODUCTION_CONFIG.rateLimit.requests,
    PRODUCTION_CONFIG.rateLimit.windowMs
  );

  if (!isAllowed) {
    logSecurityEvent('RATE_LIMIT_BLOCKED', { ip: clientIP, path: request.nextUrl.pathname });
    return new NextResponse('Rate Limit Exceeded', {
      status: 429,
      headers: { 'Retry-After': '300' }
    });
  }

  // CSRF para APIs
  if (request.nextUrl.pathname.startsWith('/api/') && PRODUCTION_CONFIG.security.strictCSRF) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const referer = request.headers.get('referer');

    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      `https://${host}`,
      `https://www.${host}`
    ].filter((x): x is string => !!x);

    const originStr = origin ?? '';
    const refererStr = referer ?? '';

    const isOriginAllowed = !originStr || allowedOrigins.some(a => originStr.startsWith(a));
    const isRefererAllowed = !refererStr || allowedOrigins.some(a => refererStr.startsWith(a));

    if (!isOriginAllowed || !isRefererAllowed) {
      logSecurityEvent('CSRF_BLOCKED', { ip: clientIP, origin, path: request.nextUrl.pathname });
      return new NextResponse('CSRF Protection', { status: 403 });
    }
  }

  const processingTime = Date.now() - startTime;
  response.headers.set('X-Processing-Time', `${processingTime}ms`);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
