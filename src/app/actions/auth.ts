"use server";

import { createClient } from "@/lib/supabase/server";
import ObjectAdmin from "@/lib/supabase/admin";
const supabaseAdmin = ObjectAdmin;

export async function loginUser(dataToSubmit: { email: string; password: string }) {
  const { email, password } = dataToSubmit;

  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Verificar se o usuário já completou o onboarding
  if (data.user) {
    const { data: userInDb } = await supabaseAdmin
      .from("User")
      .select("id")
      .eq("authId", data.user.id)
      .maybeSingle();

    if (!userInDb) {
      return { success: true, redirectTo: '/onboarding' };
    }
  }

  return { success: true, redirectTo: '/dashboard' };
}

export async function registerUser(dataToSubmit: { email: string; password: string; name: string }) {
  const { email, password, name } = dataToSubmit;

  // 1. Criar usuário via Admin API com email já confirmado (sem necessidade de verificação)
  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError) {
    return { error: createError.message };
  }

  // 2. Fazer login automático após o cadastro
  const supabase = createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: `Conta criada, mas falha no login automático: ${signInError.message}` };
  }

  return {
    success: true,
    message: "Conta criada com sucesso! Bem-vindo.",
    redirectTo: "/onboarding",
  };
}

export async function logoutUser() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return { success: true };
}
