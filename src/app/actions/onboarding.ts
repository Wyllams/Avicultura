"use server";

import { createClient } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabase/admin";
import crypto from "crypto";

/**
 * Gera um ID compatível com CUID usado pelo Prisma.
 * Usa crypto.randomUUID() como alternativa segura e nativa.
 */
function generateId(): string {
  return crypto.randomUUID();
}

export async function completeOnboarding(data: {
  empresaNome: string;
  documento: string;
  telefone: string;
  granjaNome: string;
  estado: string;
  municipio: string;
  galpaoNome: string;
  comprimento: string;
  largura: string;
}) {
  try {
    // 1. Verificar sessão do usuário autenticado
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Sua sessão é inválida ou expirou. Faça login novamente." };
    }

    // 2. Verificar se o usuário já fez onboarding
    const { data: existingUser } = await supabaseAdmin
      .from("User")
      .select("id")
      .eq("authId", user.id)
      .maybeSingle();

    if (existingUser) {
      return { error: "Este usuário já possui uma empresa vinculada." };
    }

    // 3. Calcular Área do Galpão
    const comp = parseFloat(data.comprimento.replace(',', '.'));
    const larg = parseFloat(data.largura.replace(',', '.'));

    if (isNaN(comp) || isNaN(larg) || comp <= 0 || larg <= 0) {
      return { error: "Comprimento e largura devem ser números maiores que zero." };
    }

    const area = comp * larg;
    const capacity = Math.floor(area * 12); // 12 aves/m²
    const now = new Date().toISOString();

    // 4. Criar Empresa
    const companyId = generateId();
    const { data: company, error: companyError } = await supabaseAdmin
      .from("Company")
      .insert({
        id: companyId,
        name: data.empresaNome,
        cnpj: data.documento || null,
        updatedAt: now,
      })
      .select("id")
      .single();

    if (companyError) {
      console.error("Onboarding - Company Error:", companyError);
      if (companyError.code === "23505") {
        return { error: "O Documento CNPJ/CPF já está em uso em outra empresa." };
      }
      return { error: `Erro ao criar empresa: ${companyError.message}` };
    }

    // 5. Criar Admin User
    const userId = generateId();
    const { data: adminUser, error: userError } = await supabaseAdmin
      .from("User")
      .insert({
        id: userId,
        authId: user.id,
        companyId: company.id,
        name: user.user_metadata?.name || "Admin",
        email: user.email!,
        phone: data.telefone || null,
        role: "ADMIN",
        updatedAt: now,
      })
      .select("id")
      .single();

    if (userError) {
      console.error("Onboarding - User Error:", userError);
      // Rollback: deletar a empresa criada
      await supabaseAdmin.from("Company").delete().eq("id", company.id);
      return { error: `Erro ao criar usuário: ${userError.message}` };
    }

    // 6. Criar Granja
    const farmId = generateId();
    const { data: farm, error: farmError } = await supabaseAdmin
      .from("Farm")
      .insert({
        id: farmId,
        companyId: company.id,
        name: data.granjaNome,
        state: data.estado,
        city: data.municipio,
        updatedAt: now,
      })
      .select("id")
      .single();

    if (farmError) {
      console.error("Onboarding - Farm Error:", farmError);
      // Rollback
      await supabaseAdmin.from("User").delete().eq("id", adminUser.id);
      await supabaseAdmin.from("Company").delete().eq("id", company.id);
      return { error: `Erro ao criar granja: ${farmError.message}` };
    }

    // 7. Criar Acesso do Admin à Granja
    const accessId = generateId();
    const { error: accessError } = await supabaseAdmin
      .from("UserFarmAccess")
      .insert({
        id: accessId,
        userId: adminUser.id,
        farmId: farm.id,
        level: "EDITOR",
      });

    if (accessError) {
      console.error("Onboarding - Access Error:", accessError);
      // Rollback
      await supabaseAdmin.from("Farm").delete().eq("id", farm.id);
      await supabaseAdmin.from("User").delete().eq("id", adminUser.id);
      await supabaseAdmin.from("Company").delete().eq("id", company.id);
      return { error: `Erro ao configurar acesso: ${accessError.message}` };
    }

    // 8. Criar Galpão
    const barnId = generateId();
    const { error: barnError } = await supabaseAdmin
      .from("Barn")
      .insert({
        id: barnId,
        farmId: farm.id,
        name: data.galpaoNome,
        area: area,
        capacity: capacity,
        updatedAt: now,
      });

    if (barnError) {
      console.error("Onboarding - Barn Error:", barnError);
      // Rollback
      await supabaseAdmin.from("UserFarmAccess").delete().eq("id", accessId);
      await supabaseAdmin.from("Farm").delete().eq("id", farm.id);
      await supabaseAdmin.from("User").delete().eq("id", adminUser.id);
      await supabaseAdmin.from("Company").delete().eq("id", company.id);
      return { error: `Erro ao criar galpão: ${barnError.message}` };
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Onboarding Error (catch):", message);
    return { error: `Erro interno: ${message}` };
  }
}
