import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyz123.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fake-anon-key-for-build',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Este catch evita que o nextjs dê crash caso essas funções
            // sejam chamadas num Client Component ou num componente sem permissão de escrita
          }
        },
      },
    }
  )
}
