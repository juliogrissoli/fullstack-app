import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SecurityBroker } from './lib/security';

const security = SecurityBroker.getInstance();

const RATE_LIMIT = { requests: 100, windowMs: 60_000 };

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting via SecurityBroker
  if (pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    const isAllowed = security.rateLimit(ip, RATE_LIMIT.requests, RATE_LIMIT.windowMs);
    if (!isAllowed) {
      return new NextResponse('Rate limit exceeded. Tente em 1 minuto.', {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }
  }

  // White label: domínio personalizado de Associado PRO
  const hostname = request.headers.get('host') ?? '';
  if (
    !hostname.includes('anjoimob') &&
    !hostname.includes('vercel.app') &&
    !hostname.includes('localhost')
  ) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll() } }
    );

    const { data: associado } = await supabase
      .from('brokers')
      .select('associado_slug')
      .eq('dominio_personalizado', hostname)
      .single();

    if (associado) {
      const url = request.nextUrl.clone();
      url.pathname = `/associado/${associado.associado_slug}`;
      return NextResponse.rewrite(url);
    }
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
