import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _admin: ReturnType<typeof createClient> | null = null;

export const supabaseAdmin = new Proxy({}, {
  get(_: object, prop: string | symbol) {
    if (!_admin) {
      _admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return Reflect.get(_admin, prop);
  },
}) as SupabaseClient<any>;

export { supabase } from './supabase';
