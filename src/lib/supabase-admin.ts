import { createClient } from '@supabase/supabase-js';

// Client with service role for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Re-export the regular client for public operations
export { supabase } from './supabase';
