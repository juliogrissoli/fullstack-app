// 🏛️ SECURITY BROKER SB - SECURE SUPABASE CLIENTS
// Proper client separation for security compliance

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _public: ReturnType<typeof createClient> | null = null;
let _admin: ReturnType<typeof createClient> | null = null;

export const supabaseClient = new Proxy({}, {
  get(_: object, prop: string | symbol) {
    if (!_public) _public = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: true, autoRefreshToken: true } }
    );
    return Reflect.get(_public, prop);
  },
}) as SupabaseClient<any>;

export const supabaseAdmin = new Proxy({}, {
  get(_: object, prop: string | symbol) {
    if (!_admin) _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    return Reflect.get(_admin, prop);
  },
}) as SupabaseClient<any>;

export async function validateUserContext(token: string) {
  if (!token) throw new Error('Authentication token is required');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error('Invalid or expired authentication token');
  return user;
}

export async function checkUserPermission(userId: string, resource: string, action: string) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role, permissions')
    .eq('id', userId)
    .single();
  if (error || !profile) throw new Error('User profile not found');
  const hasPermission = (profile as any).permissions?.includes(`${resource}:${action}`);
  if (!hasPermission) throw new Error('Insufficient permissions for this operation');
  return profile;
}

export async function logSecurityEvent(
  userId: string, action: string, resource: string, details: any, ipAddress?: string
) {
  try {
    await supabaseAdmin.from('security_audit_logs').insert({
      user_id: userId, action, resource, details,
      ip_address: ipAddress || 'unknown',
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

export default { supabaseClient, supabaseAdmin, validateUserContext, checkUserPermission, logSecurityEvent };
