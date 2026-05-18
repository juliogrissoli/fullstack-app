import { randomBytes, timingSafeEqual } from 'crypto';

export class SecurityBroker {
  private static instance: SecurityBroker;

  // WARNING: in-memory rate limit is per-process and not shared across serverless instances.
  // For production multi-instance deployments, replace with Upstash Redis or Vercel Firewall.
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  private constructor() {}

  static getInstance(): SecurityBroker {
    if (!SecurityBroker.instance) {
      SecurityBroker.instance = new SecurityBroker();
    }
    return SecurityBroker.instance;
  }

  sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // NOTE: use only for non-password hashing (checksums, fingerprints).
  // Passwords are handled exclusively by Supabase Auth (bcrypt internally).
  async hashData(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  rateLimit(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.rateLimitMap.get(identifier);

    if (!record || now > record.resetTime) {
      this.rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= limit) return false;

    record.count++;
    return true;
  }

  generateSecureToken(length: number = 32): string {
    // randomBytes is cryptographically secure (CSPRNG), unlike Math.random()
    return randomBytes(Math.ceil(length * 3 / 4)).toString('base64url').substring(0, length);
  }

  validateCSRF(token: string, sessionToken: string): boolean {
    // Use timingSafeEqual to prevent timing-oracle attacks
    if (!token || !sessionToken || token.length !== sessionToken.length) return false;
    return timingSafeEqual(Buffer.from(token), Buffer.from(sessionToken));
  }
}
