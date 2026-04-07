"use server";

import supabaseAdmin from "@/lib/supabase/admin";
import { getUserFarms as getAuthUserFarms } from "./dashboard";
import { revalidatePath } from "next/cache";

// Type inference from Supabase Admin (we use the manual approach)
export type FarmData = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  status: "ATIVO" | "INATIVO";
  _count: {
    barns: number;
    activeFlocks?: number;
  };
  totalArea: number;
};

// Helper: Get user's companyId
async function getUserCompanyId() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabaseAdmin.from("User").select("companyId").eq("authId", user.id).single();
  return data?.companyId;
}

export async function getFarms(): Promise<FarmData[]> {
  try {
    const companyId = await getUserCompanyId();
    const { farms: authorizedFarms, error: authFarmsError } = await getAuthUserFarms(); // Returns array of user's farm options
    
    if (!companyId) return [];

    let query = supabaseAdmin.from("Farm").select(`
      id, name, city, state, status,
      barns:Barn(id, area, status, flocks:Flock(id, status))
    `).eq("companyId", companyId);

    // Filter by authorized farms 
    if (authorizedFarms && authorizedFarms.length > 0) {
       query = query.in("id", authorizedFarms.map((f: any) => f.id));
    }

    const { data: farms, error } = await query;

    if (error) {
      console.error("Error fetching farms:", error);
      return [];
    }

    // Process data to aggregate barns and areas
    return farms.map((farm: any) => {
      let totalArea = 0;
      let activeFlocksCount = 0;
      
      const activeBarns = farm.barns?.filter((b: any) => b.status === "EM_OPERACAO") || [];
      farm.barns?.forEach((barn: any) => {
         totalArea += barn.area || 0;
         const hasActiveFlock = barn.flocks?.some((f: any) => f.status === "ATIVO");
         if (hasActiveFlock) activeFlocksCount++;
      });

      return {
        id: farm.id,
        name: farm.name,
        city: farm.city,
        state: farm.state,
        status: farm.status,
        _count: {
          barns: activeBarns.length,
          activeFlocks: activeFlocksCount,
        },
        totalArea,
      };
    });

  } catch (error) {
    console.error("Server API Error getting farms", error);
    return [];
  }
}

export async function createFarm(data: { name: string; city?: string; state?: string }) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const { data: dbUser } = await supabaseAdmin.from("User").select("id, companyId").eq("authId", user.id).single();
    if (!dbUser || !dbUser.companyId) throw new Error("Usuário não autenticado ou sem empresa vinculada");

    const newFarmId = crypto.randomUUID();
    
    const { error } = await supabaseAdmin.from("Farm").insert({
      id: newFarmId,
      companyId: dbUser.companyId,
      name: data.name,
      city: data.city || null,
      state: data.state || null,
      status: "ATIVO",
      updatedAt: new Date().toISOString(),
    });

    if (error) {
      console.error("Supabase Error creating farm:", error);
      throw error;
    }

    // Vincular permissão automática para o usuário que criou
    await supabaseAdmin.from("UserFarmAccess").insert({
      id: crypto.randomUUID(),
      userId: dbUser.id,
      farmId: newFarmId,
    });

    revalidatePath("/granjas");
    revalidatePath("/dashboard");
    return { success: true, farmId: newFarmId };

  } catch (error) {
    console.error("Error creating farm:", error);
    throw error;
  }
}

export async function getFarmDetails(farmId: string) {
  try {
    const { data: farm, error } = await supabaseAdmin.from("Farm").select(`
      id, name, city, state, status,
      barns:Barn(id, name, area, capacity, status, flocks:Flock(id, name, status, housingDate, housedBirds))
    `).eq("id", farmId).single();

    if (error || !farm) {
       console.error("Error fetching farm details:", error);
       return null;
    }

    return farm;
  } catch(e) {
    console.error("Server API Error getting farm details:", e);
    return null;
  }
}

export async function updateFarm(farmId: string, data: { name: string; city?: string; state?: string; status?: "ATIVO" | "INATIVO" }) {
  try {
    const { error } = await supabaseAdmin.from("Farm").update({
      name: data.name,
      city: data.city || null,
      state: data.state || null,
      status: data.status,
      updatedAt: new Date().toISOString(),
    }).eq("id", farmId);

    if (error) throw error;
    revalidatePath("/granjas");
    revalidatePath(`/granjas/${farmId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating farm:", error);
    throw error;
  }
}

export async function toggleFarmStatus(farmId: string, newStatus: "ATIVO" | "INATIVO") {
  try {
    const { error } = await supabaseAdmin.from("Farm").update({
      status: newStatus,
      updatedAt: new Date().toISOString()
    }).eq("id", farmId);

    if (error) throw error;
    revalidatePath("/granjas");
    revalidatePath(`/granjas/${farmId}`);
    return { success: true };
  } catch (error) {
    console.error("Error toggling farm status:", error);
    return { error: "Não foi possível alterar o status." };
  }
}

export async function deleteFarm(farmId: string) {
  try {
    // Para evitar violação de Foreign Key, precisamos excluir as entidades dependentes manualmente
    // (já que o ON DELETE CASCADE talvez não esteja configurado no Supabase para todas as tabelas)
    
    // 1. Galpões (Barns)
    const { data: barns } = await supabaseAdmin.from("Barn").select("id").eq("farmId", farmId);
    const barnIds = barns?.map(b => b.id) || [];

    let flockIds: string[] = [];
    if (barnIds.length > 0) {
      const { data: flocks } = await supabaseAdmin.from("Flock").select("id").in("barnId", barnIds);
      flockIds = flocks?.map(f => f.id) || [];
    }

    if (flockIds.length > 0) {
      // Deletar registros dependentes dos Lotes (Flocks)
      await supabaseAdmin.from("MortalityLog").delete().in("flockId", flockIds);
      await supabaseAdmin.from("WeightLog").delete().in("flockId", flockIds);
      await supabaseAdmin.from("FeedLog").delete().in("flockId", flockIds);
      await supabaseAdmin.from("VaccineLog").delete().in("flockId", flockIds);
      await supabaseAdmin.from("VisitLog").delete().in("flockId", flockIds);
      await supabaseAdmin.from("MedicationLog").delete().in("flockId", flockIds);
      await supabaseAdmin.from("Task").delete().in("flockId", flockIds);
    }

    if (barnIds.length > 0) {
      // Deletar Lotes e depois Galpões
      await supabaseAdmin.from("Flock").delete().in("barnId", barnIds);
      await supabaseAdmin.from("Barn").delete().eq("farmId", farmId);
    }

    // 2. Estoque (StockItems) e Movimentações
    const { data: stockItems } = await supabaseAdmin.from("StockItem").select("id").eq("farmId", farmId);
    const stockItemIds = stockItems?.map(s => s.id) || [];
    if (stockItemIds.length > 0) {
       await supabaseAdmin.from("StockMovement").delete().in("itemId", stockItemIds);
    }
    
    // 3. Deletar dependências diretas da Granja
    await supabaseAdmin.from("StockItem").delete().eq("farmId", farmId);
    await supabaseAdmin.from("UserFarmAccess").delete().eq("farmId", farmId);
    await supabaseAdmin.from("PnsaAudit").delete().eq("farmId", farmId);

    // 4. Finalmente, deletar a Granja
    const { error, data } = await supabaseAdmin.from("Farm").delete().eq("id", farmId);

    if (error) {
      console.error("Supabase Error deleting farm:", JSON.stringify(error, null, 2));
      throw error;
    }
    
    revalidatePath("/granjas");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting farm:", error);
    return { error: `Erro ao excluir: ${error?.message || error?.details || JSON.stringify(error)}` };
  }
}

export async function getBarnDetails(barnId: string) {
  try {
    const { data: barn, error } = await supabaseAdmin.from("Barn").select(`
      id, farmId, name, area, capacity, status,
      flocks:Flock(id, name, status, housedBirds, housingDate)
    `).eq("id", barnId).single();

    if (error || !barn) return null;
    return barn;
  } catch(e) {
    return null;
  }
}

export async function createBarn(farmId: string, data: { name: string; area: number; capacity: number }) {
  try {
    const newId = crypto.randomUUID();
    const { error } = await supabaseAdmin.from("Barn").insert({
      id: newId,
      farmId,
      name: data.name,
      area: data.area,
      capacity: data.capacity,
      status: "EM_OPERACAO",
      updatedAt: new Date().toISOString(),
    });

    if (error) throw error;
    revalidatePath(`/granjas/${farmId}`);
    return { success: true, barnId: newId };
  } catch (error) {
    console.error("Error creating barn:", error);
    throw error;
  }
}

export async function updateBarn(barnId: string, data: { name: string; area: number; capacity: number; status?: "EM_OPERACAO" | "MANUTENCAO" | "INATIVO" }) {
  try {
    const { error } = await supabaseAdmin.from("Barn").update({
      name: data.name,
      area: data.area,
      capacity: data.capacity,
      status: data.status,
      updatedAt: new Date().toISOString(),
    }).eq("id", barnId);

    if (error) throw error;
    // We should revalidate the farm details page
    // but we don't have farmId directly in the arg, we can just revalidate '/granjas' completely or fetch the farmId if needed.
    revalidatePath(`/granjas`); 
    return { success: true };
  } catch (error) {
    console.error("Error updating barn:", error);
    throw error;
  }
}

