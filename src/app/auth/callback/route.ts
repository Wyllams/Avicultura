import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // se houver 'next', a rota manda pra lá dps que autenticar
  const next = searchParams.get('next') ?? '/onboarding'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    } else {
        console.error('Auth Callback Erro:', error)
    }
  }

  // Falha na verificação ou falta de código, redireciona para login
  return NextResponse.redirect(`${origin}/login?error=O+Link+Expirou+ou+é+Inválido`)
}
