import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/resend';
import { SecurityBroker } from '@/lib/security';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    supabase: ServiceStatus;
    resend: ServiceStatus;
    security: ServiceStatus;
    database: ServiceStatus;
    stripe: ServiceStatus;
  };
  metrics: {
    responseTime: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
  alerts: string[];
}

interface ServiceStatus {
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  message: string;
  details?: unknown;
}

function requireHealthCheckSecret(request: NextRequest) {
  const expectedSecret = process.env.HEALTH_CHECK_SECRET ?? process.env.SYSTEM_CHECK_SECRET;

  if (!expectedSecret) {
    return process.env.NODE_ENV === 'production'
      ? NextResponse.json({ error: 'HEALTH_CHECK_SECRET nao configurado' }, { status: 503 })
      : null;
  }

  const authToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const headerToken = request.headers.get('x-health-check-secret');

  if (authToken !== expectedSecret && headerToken !== expectedSecret) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const unauthorizedResponse = requireHealthCheckSecret(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  const startTime = Date.now();
  const health: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      supabase: { status: 'fail', message: 'Not tested' },
      resend: { status: 'fail', message: 'Not tested' },
      security: { status: 'fail', message: 'Not tested' },
      database: { status: 'fail', message: 'Not tested' },
      stripe: { status: 'fail', message: 'Not tested' },
    },
    metrics: {
      responseTime: 0,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    },
    alerts: [],
  };

  // Test 1: Supabase Connection
  try {
    const supabaseStart = Date.now();
    const { data, error } = await supabase
      .from('land_opportunities')
      .select('count')
      .limit(1);
    
    const supabaseTime = Date.now() - supabaseStart;

    if (error) {
      health.services.supabase = {
        status: 'fail',
        responseTime: supabaseTime,
        message: `Database error: ${error.message}`,
        details: { error: error.message, code: error.code }
      };
      health.alerts.push('❌ Supabase connection failed');
    } else {
      health.services.supabase = {
        status: 'pass',
        responseTime: supabaseTime,
        message: 'Database connection successful',
        details: { recordCount: data?.length || 0 }
      };
    }
  } catch (error) {
    health.services.supabase = {
      status: 'fail',
      message: `Exception: ${error}`,
    };
    health.alerts.push('❌ Supabase exception occurred');
  }

  // Test 2: Resend Email Service
  try {
    const resendStart = Date.now();
    const emailResult = process.env.HEALTH_CHECK_SEND_EMAIL === 'true' ? await sendEmail({
      to: 'health-check@geo-imperium.com',
      subject: '🛡️ GEO v8.1 Health Check',
      html: `
        <h2>System Health Check</h2>
        <p>Timestamp: ${new Date().toISOString()}</p>
        <p>Status: All systems operational</p>
        <p>This is an automated health check email.</p>
      `,
    }) : {
      success: Boolean(process.env.RESEND_API_KEY),
      data: undefined,
      error: 'RESEND_API_KEY nao configurada',
    };
    
    const resendTime = Date.now() - resendStart;

    if (emailResult.success) {
      health.services.resend = {
        status: 'pass',
        responseTime: resendTime,
        message: 'Email service operational',
        details: { messageId: emailResult.data?.id }
      };
    } else {
      health.services.resend = {
        status: 'fail',
        responseTime: resendTime,
        message: `Email error: ${emailResult.error}`,
        details: { error: emailResult.error }
      };
      health.alerts.push('❌ Resend email service failed');
    }
  } catch (error) {
    health.services.resend = {
      status: 'fail',
      message: `Exception: ${error}`,
    };
    health.alerts.push('❌ Resend exception occurred');
  }

  // Test 3: Security Broker
  try {
    const securityStart = Date.now();
    const security = SecurityBroker.getInstance();
    
    // Test input sanitization
    const maliciousInput = '<script>alert("xss")</script>';
    const sanitized = security.sanitizeInput(maliciousInput);
    
    // Test rate limiting
    const rateLimitWorking = security.rateLimit('health-check-test', 10, 60000);
    
    // Test token generation
    const token = security.generateSecureToken(16);
    
    const securityTime = Date.now() - securityStart;

    if (sanitized && !sanitized.includes('<script>') && token && token.length === 16) {
      health.services.security = {
        status: 'pass',
        responseTime: securityTime,
        message: 'Security systems operational',
        details: { 
          sanitizationWorking: true,
          rateLimitWorking: rateLimitWorking,
          tokenGenerationWorking: true,
          testToken: token.substring(0, 8) + '...'
        }
      };
    } else {
      health.services.security = {
        status: 'fail',
        responseTime: securityTime,
        message: 'Security systems compromised',
        details: { 
          sanitizationWorking: !sanitized.includes('<script>'),
          tokenGenerated: token?.length === 32
        }
      };
      health.alerts.push('❌ Security broker issues detected');
    }
  } catch (error) {
    health.services.security = {
      status: 'fail',
      message: `Exception: ${error}`,
    };
    health.alerts.push('❌ Security broker exception occurred');
  }

  // Test 4: Database Schema Validation
  try {
    const dbStart = Date.now();
    
    // Check if critical tables exist and are accessible
    const tables = ['land_opportunities', 'lead_behavior_scoring', 'lead_views', 'audit_logs'];
    const tableResults: Record<string, boolean> = {};
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('count').limit(1);
        tableResults[table] = !error;
      } catch {
        tableResults[table] = false;
      }
    }
    
    const dbTime = Date.now() - dbStart;
    const allTablesValid = Object.values(tableResults).every(Boolean);

    if (allTablesValid) {
      health.services.database = {
        status: 'pass',
        responseTime: dbTime,
        message: 'All database tables accessible',
        details: { tables: tableResults }
      };
    } else {
      health.services.database = {
        status: 'fail',
        responseTime: dbTime,
        message: 'Missing or inaccessible database tables',
        details: { tables: tableResults }
      };
      health.alerts.push('❌ Database schema issues detected');
    }
  } catch (error) {
    health.services.database = {
      status: 'fail',
      message: `Exception: ${error}`,
    };
    health.alerts.push('❌ Database schema issues detected');
  }

  // Test 5: Stripe Integration
  try {
    const stripeStart = Date.now();
    const stripeTime = Date.now() - stripeStart;
    const hasStripeKey = Boolean(process.env.STRIPE_SECRET_KEY);
    const hasStripeWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET);

    if (hasStripeKey) {
      health.services.stripe = {
        status: 'pass',
        responseTime: stripeTime,
        message: 'Stripe configured',
        details: {
          apiVersion: '2026-04-22.dahlia',
          secretKeyConfigured: true,
          webhookSecretConfigured: hasStripeWebhookSecret
        }
      };
    } else {
      health.services.stripe = {
        status: 'fail',
        responseTime: stripeTime,
        message: 'STRIPE_SECRET_KEY nao configurada',
        details: { secretKeyConfigured: false, webhookSecretConfigured: hasStripeWebhookSecret }
      };
      health.alerts.push('❌ Stripe API not configured');
    }
  } catch (error) {
    health.services.stripe = {
      status: 'fail',
      message: `Stripe exception: ${error}`,
    };
    health.alerts.push('❌ Stripe API exception occurred');
  }

  // Calculate overall health status
  const serviceStatuses = Object.values(health.services);
  const failedServices = serviceStatuses.filter(s => s.status === 'fail').length;
  
  if (failedServices > 0) {
    health.status = failedServices >= 2 ? 'unhealthy' : 'degraded';
  } else if (serviceStatuses.filter(s => s.status === 'warn').length > 0) {
    health.status = 'degraded';
  }

  health.metrics.responseTime = Date.now() - startTime;

  // Add performance alerts
  if (health.metrics.responseTime > 5000) {
    health.alerts.push('⚠️ Slow response time detected');
  }
  
  if (health.metrics.memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
    health.alerts.push('⚠️ High memory usage detected');
  }

  // Return appropriate HTTP status
  const httpStatus = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, { 
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

export async function POST(request: NextRequest) {
  const unauthorizedResponse = requireHealthCheckSecret(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  const body = await request.json();

  if (body.test === 'nexo_causal') {
    // Pure computation test — no DB writes
    const { createHash } = await import('crypto');
    const input = JSON.stringify({ user_id: 'hc', ts: new Date().toISOString() });
    const hash = createHash('sha256').update(input).digest('hex');
    return NextResponse.json({ success: true, hash, message: 'SHA-256 operational' });
  }

  if (body.test === 'rls_protection') {
    // Check that unauthenticated clients cannot read leads (should be empty or error)
    const { createClient } = await import('@supabase/supabase-js');
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await anonClient.from('leads').select('id').limit(1);
    const isProtected = !!error || !data || data.length === 0;
    return NextResponse.json({
      success: true,
      protected: isProtected,
      message: isProtected ? 'RLS ativo — acesso anon bloqueado' : 'ATENÇÃO: RLS pode estar desativado',
    });
  }

  if (body.test === 'email_performance') {
    // Note: address is fixed — never accept arbitrary addresses from body
    const startTime = Date.now();
    const result = await sendEmail({
      to: process.env.HEALTH_CHECK_EMAIL ?? 'health@anjoimob.com',
      subject: 'Health Check — Performance Test',
      html: '<p>Automated health check.</p>',
    });
    return NextResponse.json({
      success: result.success,
      responseTime: Date.now() - startTime,
      message: result.success ? 'Email sent' : `Failed: ${result.error}`,
    });
  }

  return NextResponse.json({ error: 'test inválido. Use: nexo_causal | rls_protection | email_performance' }, { status: 400 });
}
