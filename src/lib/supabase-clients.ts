// 🏛️ SECURITY BROKER SB - SECURE SUPABASE CLIENTS
// Proper client separation for security compliance

import { createClient } from '@supabase/supabase-js';

// Environment validation - CRITICAL for security
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

// Public client with ANON key - respects RLS policies
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// Admin client with SERVICE ROLE key - server-side only
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

// Helper function to validate user context
export async function validateUserContext(token: string) {
  if (!token) {
    throw new Error('Authentication token is required');
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid or expired authentication token');
  }

  return user;
}

// Helper function to check user permissions
export async function checkUserPermission(userId: string, resource: string, action: string) {
  // TODO: Implement proper permission checking based on user roles
  // This should integrate with your user management system
  
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role, permissions')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  // Basic permission check - customize based on your needs
  const hasPermission = profile.permissions?.includes(`${resource}:${action}`);
  
  if (!hasPermission) {
    throw new Error('Insufficient permissions for this operation');
  }

  return profile;
}

// Audit logging helper
export async function logSecurityEvent(
  userId: string,
  action: string,
  resource: string,
  details: any,
  ipAddress?: string
) {
  try {
    await supabaseAdmin
      .from('security_audit_logs')
      .insert({
        user_id: userId,
        action,
        resource,
        details,
        ip_address: ipAddress || 'unknown',
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
    // Don't throw error to avoid breaking main flow
  }
}

export default {
  supabaseClient,
  supabaseAdmin,
  validateUserContext,
  checkUserPermission,
  logSecurityEvent
};
