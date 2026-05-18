import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SecurityBroker } from './lib/security';

const security = SecurityBroker.getInstance();

const RATE_LIMIT = { requests: 100, windowMs: 60_000 };

// In-memory LRU cache for white-label domain resolution.
// TTL prevents stale entries; Map evicts oldest when over capacity.
// Safe for Edge runtime: avoids one Supabase round-trip per static asset.
const domainCache = new Map<string, { slug: string | null; expiresAt: number }>();
const DOMAIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DOMAIN_CACHE_MAX = 500;

function getCachedDomain(hostname: string) {
  const entry = domainCache.get(hostname);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { domainCache.delete(hostname); return undefined; }
  return entry;
}

function setCachedDomain(hostname: string, slug: string | null) {
  if (domainCache.size >= DOMAIN_CACHE_MAX) {
    domainCache.delete(domainCache.keys().next().value!);
  }
  domainCache.set(hostname, { slug, expiresAt: Date.now() + DOMAIN_CACHE_TTL_MS });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting (in-memory, per-instance — see security.ts warning for production)
  if (pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    if (!security.rateLimit(ip, RATE_LIMIT.requests, RATE_LIMIT.windowMs)) {
      return new NextResponse('Rate limit exceeded. Tente em 1 minuto.', {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }
  }

  // White label: custom domain → /associado/:slug rewrite
  const hostname = request.headers.get('host') ?? '';
  const isOwnDomain =
    hostname.includes('anjoimob') ||
    hostname.includes('vercel.app') ||
    hostname.includes('localhost');

  if (!isOwnDomain) {
    const cached = getCachedDomain(hostname);
    let slug: string | null = cached?.slug ?? null;

    if (cached === undefined) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => request.cookies.getAll() } }
      );
      const { data } = await supabase
        .from('brokers')
        .select('associado_slug')
        .eq('dominio_personalizado', hostname)
        .single();
      slug = data?.associado_slug ?? null;
      setCachedDomain(hostname, slug);
    }

    if (slug) {
      const url = request.nextUrl.clone();
      url.pathname = `/associado/${slug}`;
      return NextResponse.rewrite(url);
    }
  }

  // Security headers are set globally in next.config.ts.
  // Only add headers that need request-time context here.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
