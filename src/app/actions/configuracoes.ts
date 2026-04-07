"use server";

import { createClient } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabase/admin";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Retorna o authId do usuário logado via Supabase Auth */
async function getAuthUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");
  return user;
}

/** Retorna o registro do User na tabela pública a partir do authId */
async function getDbUser() {
  const authUser = await getAuthUser();
  const { data, error } = await supabaseAdmin
    .from("User")
    .select("id, companyId, name, email, phone, role")
    .eq("authId", authUser.id)
    .single();

  if (error || !data) throw new Error("Usuário não encontrado no banco");
  return { ...data, authId: authUser.id };
}

// ─────────────────────────────────────────────────────────────
// 1. PERFIL DO USUÁRIO
// ─────────────────────────────────────────────────────────────

export async function getUserProfile() {
  try {
    const user = await getDbUser();
    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateUserProfile(data: {
  name: string;
  phone: string;
}) {
  try {
    const user = await getDbUser();

    const { error } = await supabaseAdmin
      .from("User")
      .update({
        name: data.name,
        phone: data.phone,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) throw new Error(error.message);

    // Atualiza também o metadata no Supabase Auth
    await supabaseAdmin.auth.admin.updateUserById(user.authId, {
      user_metadata: { name: data.name },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  try {
    const authUser = await getAuthUser();

    // Verificar a senha atual tentando um sign-in
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: authUser.email!,
      password: data.currentPassword,
    });

    if (verifyError) {
      return { success: false, error: "Senha atual incorreta" };
    }

    // Atualizar a senha via Admin API
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: data.newPassword,
      });

    if (updateError) throw new Error(updateError.message);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// 2. CONFIGURAÇÕES DA EMPRESA
// ─────────────────────────────────────────────────────────────

export async function getCompanyDetails() {
  try {
    const user = await getDbUser();

    const { data, error } = await supabaseAdmin
      .from("Company")
      .select("id, name, cnpj")
      .eq("id", user.companyId)
      .single();

    if (error || !data) throw new Error("Empresa não encontrada");

    return {
      success: true,
      data: {
        id: data.id,
        companyName: data.name,
        document: data.cnpj || "",
        email: user.email, // Email do admin logado (somente leitura)
        phone: user.phone || "", // Telefone do admin logado
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateCompanyDetails(data: {
  companyName: string;
  document: string;
}) {
  try {
    const user = await getDbUser();

    // Apenas admins podem alterar dados da empresa
    if (user.role !== "ADMIN") {
      return { success: false, error: "Sem permissão para alterar dados da empresa" };
    }

    const { error } = await supabaseAdmin
      .from("Company")
      .update({
        name: data.companyName,
        cnpj: data.document || null,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", user.companyId);

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// 3. GERENCIAR USUÁRIOS
// ─────────────────────────────────────────────────────────────

export async function getCompanyUsers() {
  try {
    const user = await getDbUser();

    const { data: users, error } = await supabaseAdmin
      .from("User")
      .select("id, authId, name, email, phone, role, createdAt")
      .eq("companyId", user.companyId)
      .order("createdAt", { ascending: true });

    if (error) throw new Error(error.message);

    // Buscar granjas vinculadas (UserFarmAccess) com nomes
    const { data: allAccess } = await supabaseAdmin
      .from("UserFarmAccess")
      .select("userId, farmId, level")
      .in(
        "userId",
        (users || []).map((u) => u.id)
      );

    const { data: farms } = await supabaseAdmin
      .from("Farm")
      .select("id, name")
      .eq("companyId", user.companyId);

    const farmMap = new Map((farms || []).map((f) => [f.id, f.name]));

    const usersWithFarms = (users || []).map((u) => {
      const userAccess = (allAccess || []).filter((a) => a.userId === u.id);
      const farmNames =
        u.role === "ADMIN"
          ? ["Todas"]
          : userAccess
              .filter((a) => a.level !== "NONE")
              .map((a) => farmMap.get(a.farmId) || "Desconhecida");

      return {
        id: u.id,
        authId: u.authId,
        name: u.name,
        email: u.email,
        phone: u.phone || "",
        role: u.role,
        farms: farmNames.length > 0 ? farmNames : ["Nenhuma"],
      };
    });

    // Contagens
    const total = usersWithFarms.length;
    const operadores = usersWithFarms.filter((u) => u.role === "OPERADOR").length;
    const veterinarios = usersWithFarms.filter((u) => u.role === "VETERINARIO").length;
    const admins = usersWithFarms.filter((u) => u.role === "ADMIN").length;

    return {
      success: true,
      data: {
        users: usersWithFarms,
        total,
        operadores,
        veterinarios,
        admins,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createUser(data: {
  name: string;
  email: string;
  phone: string;
  role: string;
}) {
  try {
    const currentUser = await getDbUser();

    if (currentUser.role !== "ADMIN") {
      return { success: false, error: "Sem permissão" };
    }

    // Gerar uma senha temporária
    const tempPassword = `Avi${Date.now().toString(36)}!`;

    // 1. Criar no Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: data.name },
      });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return { success: false, error: "Este e-mail já está cadastrado no sistema" };
      }
      throw new Error(authError.message);
    }

    // 2. Inserir na tabela User
    const roleMap: Record<string, string> = {
      Admin: "ADMIN",
      Operador: "OPERADOR",
      "Veterinário": "VETERINARIO",
    };

    const { error: dbError } = await supabaseAdmin.from("User").insert({
      authId: authData.user.id,
      companyId: currentUser.companyId,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      role: roleMap[data.role] || "OPERADOR",
    });

    if (dbError) {
      // Rollback: deletar o auth user se falhar a inserção
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(dbError.message);
    }

    return { success: true, tempPassword };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateUser(
  userId: string,
  data: { name: string; phone: string; role: string }
) {
  try {
    const currentUser = await getDbUser();
    if (currentUser.role !== "ADMIN") {
      return { success: false, error: "Sem permissão" };
    }

    const roleMap: Record<string, string> = {
      Admin: "ADMIN",
      Operador: "OPERADOR",
      "Veterinário": "VETERINARIO",
      ADMIN: "ADMIN",
      OPERADOR: "OPERADOR",
      VETERINARIO: "VETERINARIO",
    };

    const { error } = await supabaseAdmin
      .from("User")
      .update({
        name: data.name,
        phone: data.phone || null,
        role: roleMap[data.role] || "OPERADOR",
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteUser(userId: string) {
  try {
    const currentUser = await getDbUser();
    if (currentUser.role !== "ADMIN") {
      return { success: false, error: "Sem permissão" };
    }

    // Não permitir deletar a si mesmo
    if (currentUser.id === userId) {
      return { success: false, error: "Você não pode remover seu próprio acesso" };
    }

    // Buscar authId do usuário alvo
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from("User")
      .select("authId")
      .eq("id", userId)
      .single();

    if (fetchError || !targetUser) {
      return { success: false, error: "Usuário não encontrado" };
    }

    // 1. Remover acessos de granja
    await supabaseAdmin
      .from("UserFarmAccess")
      .delete()
      .eq("userId", userId);

    // 2. Remover do banco
    const { error: dbError } = await supabaseAdmin
      .from("User")
      .delete()
      .eq("id", userId);

    if (dbError) throw new Error(dbError.message);

    // 3. Deletar do Supabase Auth
    await supabaseAdmin.auth.admin.deleteUser(targetUser.authId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// 4. CONFIGURAÇÕES DE ALERTAS
// ─────────────────────────────────────────────────────────────

export async function getAlertConfig() {
  try {
    const user = await getDbUser();

    const { data, error } = await supabaseAdmin
      .from("AlertConfig")
      .select("*")
      .eq("companyId", user.companyId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    // Retorna defaults se não existir config
    return {
      success: true,
      data: data || {
        mortalityLimit: 0.5,
        feedStockTons: 2.5,
        medsStockUnits: 10,
        ipMin: 380,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveAlertConfig(config: {
  mortalityLimit: number;
  feedStockTons: number;
  medsStockUnits: number;
  ipMin: number;
}) {
  try {
    const user = await getDbUser();

    // Upsert: inserir ou atualizar
    const { data: existing } = await supabaseAdmin
      .from("AlertConfig")
      .select("id")
      .eq("companyId", user.companyId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("AlertConfig")
        .update({
          ...config,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("AlertConfig").insert({
        companyId: user.companyId,
        ...config,
      });

      if (error) throw new Error(error.message);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
