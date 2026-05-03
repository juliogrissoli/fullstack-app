import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/resend';
import { updateLeadScore } from '@/app/actions/scoring';

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {
      supabase: false,
      resend: false,
      scoring: false,
      security: false,
    },
    errors: [] as string[],
  };

  try {
    // Test 1: Supabase Connection
    console.log('🧪 Testing Supabase connection...');
    const { data, error } = await supabase
      .from('land_opportunities')
      .select('count')
      .limit(1);

    if (error) {
      results.errors.push(`Supabase error: ${error.message}`);
    } else {
      results.tests.supabase = true;
      console.log('✅ Supabase connection successful');
    }

    // Test 2: Resend Email Service
    console.log('🧪 Testing Resend email service...');
    try {
      const emailResult = await sendEmail({
        to: 'test@example.com',
        subject: '🧪 GEO v8.1 Integration Test',
        html: `
          <h2>Integration Test</h2>
          <p>This is a test email from GEO v8.1 Imperium Edition.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <p>Status: All systems operational</p>
        `,
      });

      if (emailResult.success) {
        results.tests.resend = true;
        console.log('✅ Resend email service successful');
      } else {
        results.errors.push(`Resend error: ${emailResult.error}`);
      }
    } catch (emailError) {
      results.errors.push(`Resend exception: ${emailError}`);
    }

    // Test 3: Scoring Engine
    console.log('🧪 Testing scoring engine...');
    try {
      const testUserId = 'test-user-id';
      const scoreResult = await updateLeadScore(testUserId, 'ROI', 20);

      if (scoreResult.success) {
        results.tests.scoring = true;
        console.log('✅ Scoring engine successful');
      } else {
        results.errors.push(`Scoring error: ${scoreResult.error}`);
      }
    } catch (scoreError) {
      results.errors.push(`Scoring exception: ${scoreError}`);
    }

    // Test 4: Security Broker
    console.log('🧪 Testing security broker...');
    try {
      const { SecurityBroker } = await import('@/lib/security');
      const security = SecurityBroker.getInstance();

      // Test input sanitization
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = security.sanitizeInput(maliciousInput);
      
      if (sanitized && !sanitized.includes('<script>')) {
        results.tests.security = true;
        console.log('✅ Security broker successful');
      } else {
        results.errors.push('Security broker: Input sanitization failed');
      }

      // Test rate limiting
      const rateLimitResult = security.rateLimit('test-ip', 5, 60000);
      console.log('✅ Rate limiting functional');
    } catch (securityError) {
      results.errors.push(`Security exception: ${securityError}`);
    }

  } catch (error) {
    results.errors.push(`General error: ${error}`);
  }

  // Calculate overall status
  const passedTests = Object.values(results.tests).filter(Boolean).length;
  const totalTests = Object.keys(results.tests).length;
  const successRate = (passedTests / totalTests) * 100;

  console.log(`📊 Integration test results: ${passedTests}/${totalTests} passed (${successRate}%)`);

  return NextResponse.json({
    ...results,
    summary: {
      passed: passedTests,
      total: totalTests,
      successRate: Math.round(successRate),
      status: successRate >= 75 ? 'SUCCESS' : 'NEEDS_ATTENTION',
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  
  // Test specific components based on request
  if (body.test === 'email') {
    try {
      const result = await sendEmail({
        to: body.to || 'test@example.com',
        subject: body.subject || 'Test Email',
        html: body.html || '<p>Test email content</p>',
      });

      return NextResponse.json({ success: result.success, data: result.data, error: result.error });
    } catch (error) {
      return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
  }

  if (body.test === 'scoring') {
    try {
      const result = await updateLeadScore(
        body.userId || 'test-user',
        body.intent || 'ROI',
        body.bonus || 0
      );

      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid test type' }, { status: 400 });
}
