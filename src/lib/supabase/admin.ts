import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin client — usa a service_role_key para operações
 * que precisam bypass de RLS (Row Level Security).
 * NÃO EXPONHA este client no frontend. Apenas server actions e API routes.
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyz123.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'fake-admin-key-for-build',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default supabaseAdmin;
