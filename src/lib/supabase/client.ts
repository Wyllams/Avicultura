import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Apenas roda no browser, acessa os cookies disponíveis no documento
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
