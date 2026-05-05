import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SecurityBroker } from './lib/security';

const security = SecurityBroker.getInstance();

// 📊 FUNÇÃO DE AUDITORIA DE SEGURANÇA
function logSecurityEvent(event: string, data: any) {
  // Em produção, isso seria enviado para sistema de logs
  console.log(`🏛️ SB AUDIT: ${event}`, {
    ...data,
    system_mode: 'SOBERANO',
    timestamp: new Date().toISOString()
  });
}

// 🏛️ MODO PRODUÇÃO SOBERANO - CONFIGURAÇÃO CRÍTICA
const PRODUCTION_CONFIG = {
  rateLimit: {
    requests: 50, // Reduzido para produção
    windowMs: 60000, // 1 minuto
    blockDurationMs: 300000 // 5 minutos de bloqueio
  },
  security: {
    enforceHTTPS: true,
    auditMode: true,
    strictCSRF: true
  }
};

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const response = NextResponse.next();
  
  // 🛡️ HEADERS DE SEGURANÇA SOBERANOS
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';");
  
  // 🏛️ IDENTIFICAÇÃO SOBERANA
  response.headers.set('X-Powered-By', 'Security Broker SB v14.0 - Produção Soberana');
  response.headers.set('X-System-Mode', 'SOBERANO');
  response.headers.set('X-Decision-Audit', 'ENABLED');
  
  // 🚨 RATE LIMITING SOBERANO
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
    // 📊 AUDITORIA DE RATE LIMIT
    logSecurityEvent('RATE_LIMIT_BLOCKED', {
      ip: clientIP,
      path: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    });
    
    return new NextResponse('🏛️ Security Broker SB - Rate Limit Exceeded', { 
      status: 429,
      headers: {
        'Retry-After': '300',
        'X-System-Mode': 'SOBERANO'
      }
    });
  }
  
  // 🔒 CSRF PROTECTION SOBERANO PARA APIs
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const referer = request.headers.get('referer');
    
    // Validação estrita de origem em produção
    if (PRODUCTION_CONFIG.security.strictCSRF) {
      const allowedOrigins = [
        process.env.NEXT_PUBLIC_APP_URL,
        `https://${host}`,
        `https://www.${host}`
      ].filter(Boolean);
      
      const isOriginAllowed = !origin || allowedOrigins.some(allowed => 
        origin === allowed || origin.startsWith(allowed)
      );
      
      const isRefererAllowed = !referer || allowedOrigins.some(allowed => 
        referer.startsWith(allowed)
      );
      
      if (!isOriginAllowed || !isRefererAllowed) {
        logSecurityEvent('CSRF_BLOCKED', {
          ip: clientIP,
          origin,
          referer,
          host,
          path: request.nextUrl.pathname,
          timestamp: new Date().toISOString()
        });
        
        return new NextResponse('🏛️ Security Broker SB - CSRF Protection', { 
          status: 403,
          headers: {
            'X-System-Mode': 'SOBERANO',
            'X-CSRF-Blocked': 'true'
          }
        });
      }
    }
    
    // 📋 AUDITORIA DE ENDPOINTS CRÍTICOS
    const criticalEndpoints = ['/api/admin/', '/api/financeiro/', '/api/ouroboros-2-0/', '/api/system-check/'];
    const isCritical = criticalEndpoints.some(endpoint => 
      request.nextUrl.pathname.startsWith(endpoint)
    );
    
    if (isCritical) {
      logSecurityEvent('CRITICAL_ACCESS', {
        ip: clientIP,
        path: request.nextUrl.pathname,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // 📊 MÉTRICAS DE PERFORMANCE SOBERANA
  const processingTime = Date.now() - startTime;
  response.headers.set('X-Processing-Time', `${processingTime}ms`);
  response.headers.set('X-Audit-Trail', 'ENABLED');
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
