import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyz123.supabase.co';
  if (supabaseUrl && !supabaseUrl.startsWith('http') && supabaseUrl.trim() !== '') {
    supabaseUrl = 'https://' + supabaseUrl;
  }
  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    supabaseUrl = 'https://xyz123.supabase.co';
  }

  // Apenas roda no browser, acessa os cookies disponíveis no documento
  return createBrowserClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fake-anon-key-for-build'
  )
}
