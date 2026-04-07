"use server";

import supabaseAdmin from "@/lib/supabase/admin";
import * as z from "zod";

async function getUserCompanyId() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabaseAdmin.from("User").select("companyId").eq("authId", user.id).single();
  return data?.companyId;
}

export interface Breed {
  id: string;
  name: string;
  supplier: string;
  targetGmd: number;
  targetCa: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const formSchema = z.object({
  nome: z.string().min(3),
  fornecedor: z.string().min(3),
  metaGmd: z.string().min(1),
  metaCa: z.string().min(1),
  padrao: z.boolean(),
});

export async function getBreeds(): Promise<{ data: Breed[] | null; error?: string }> {
  try {
    const companyId = await getUserCompanyId();
    if (!companyId) return { data: null, error: "Usuário não autenticado." };

    const { data, error } = await supabaseAdmin
      .from("Breed")
      .select("*")
      .eq("companyId", companyId)
      .order("isDefault", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("getBreeds error:", error);
      return { data: null, error: "Erro ao buscar linhagens." };
    }

    return { data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("getBreeds exception:", msg);
    return { data: null, error: msg };
  }
}

export async function createBreed(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const companyId = await getUserCompanyId();
    if (!companyId) return { success: false, error: "Usuário não autenticado." };

    const rawData = {
      nome: formData.get("nome") as string,
      fornecedor: formData.get("fornecedor") as string,
      metaGmd: formData.get("metaGmd") as string,
      metaCa: formData.get("metaCa") as string,
      padrao: formData.get("padrao") === "true",
    };

    const parsed = formSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: "Dados inválidos." };
    }

    const { nome, fornecedor, metaGmd, metaCa, padrao } = parsed.data;

    const gmd = parseFloat(metaGmd.replace(",", "."));
    const ca = parseFloat(metaCa.replace(",", "."));

    if (isNaN(gmd) || isNaN(ca)) {
      return { success: false, error: "Valores numéricos inválidos." };
    }

    // Se for padrão, precisa remover o padrão atual
    if (padrao) {
      await supabaseAdmin
        .from("Breed")
        .update({ isDefault: false, updatedAt: new Date().toISOString() })
        .eq("companyId", companyId)
        .eq("isDefault", true);
    }

    const { error } = await supabaseAdmin
      .from("Breed")
      .insert({
        companyId,
        name: nome,
        supplier: fornecedor,
        targetGmd: gmd,
        targetCa: ca,
        isDefault: padrao,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    if (error) {
      console.error("createBreed error:", error);
      return { success: false, error: "Falha ao criar linhagem." };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("createBreed exception:", msg);
    return { success: false, error: msg };
  }
}

export async function deleteBreed(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const companyId = await getUserCompanyId();
    if (!companyId) return { success: false, error: "Usuário não autenticado." };

    // Verificar se existe
    const { data: breed } = await supabaseAdmin
      .from("Breed")
      .select("id, isDefault")
      .eq("id", id)
      .eq("companyId", companyId)
      .single();

    if (!breed) {
      return { success: false, error: "Linhagem não encontrada." };
    }

    const { error } = await supabaseAdmin
      .from("Breed")
      .delete()
      .eq("id", id)
      .eq("companyId", companyId);

    if (error) {
       console.error("deleteBreed error:", error);
       return { success: false, error: "Falha ao excluir. Pode estar em uso." };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("deleteBreed exception:", msg);
    return { success: false, error: msg };
  }
}
