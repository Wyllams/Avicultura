"use server";

import supabaseAdmin from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// Função utilitária para pegar o companyId
async function getUserCompanyId() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabaseAdmin.from("User").select("companyId").eq("authId", user.id).single();
  return data?.companyId;
}

export async function getActiveFlocks() {
    const companyId = await getUserCompanyId();
    if (!companyId) return { error: "Sem permissão" };
  
    const { data, error } = await supabaseAdmin.from("Flock").select(`
      id,
      name,
      housedBirds,
      housingDate,
      status,
      barn:Barn!inner (
        id,
        name,
        farm:Farm!inner (
          id,
          name,
          companyId
        )
      )
    `)
    .eq("barn.farm.companyId", companyId)
    .eq("status", "ACTIVE")
    .order("housingDate", { ascending: false });
  
    if (error) return { error: error.message };
  
    return { 
      flocks: data.map((f: any) => ({
        ...f,
        farm: Array.isArray(f.barn.farm) ? f.barn.farm[0] : f.barn.farm
      })) 
    };
  }

export async function getWeighingHistory(flockId?: string) {
    const companyId = await getUserCompanyId();
    if (!companyId) return { error: "Sem permissão" };

    let targetFlockId = flockId;
    
    if (!targetFlockId) {
        const { flocks: activeFlocks } = await getActiveFlocks();
        if (activeFlocks && activeFlocks.length > 0) {
            targetFlockId = activeFlocks[0].id;
        } else {
            return { error: "Nenhum lote ativo encontrado para a empresa.", needsFlock: true };
        }
    }

    const { data: flockData, error } = await supabaseAdmin.from("Flock").select(`
      id, 
      name,
      housedBirds,
      housingDate,
      status,
      breed,
      barn:Barn!inner(name, farm:Farm!inner(name, companyId)),
      weightLogs:WeightLog(id, date, ageInDays, averageWeight, sampleSize, createdAt)
    `)
    .eq("id", targetFlockId!)
    .eq("barn.farm.companyId", companyId)
    .single();

    if (error || !flockData) return { error: "Erro ao buscar dados ou lote não pertence a você." };

    // Ordenar os logs de pesagem de forma crescente
    if (flockData.weightLogs) {
        flockData.weightLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return { flock: flockData };
}

export async function syncWeightRecords(records: any[]) {
    const companyId = await getUserCompanyId();
    if (!companyId) return { error: "Sem permissão" };

    if (!records || records.length === 0) return { success: true, syncedIds: [] };

    const syncedSyncIds: string[] = [];

    const payload = records.map(r => ({
        id: crypto.randomUUID(), 
        flockId: r.flockId,
        date: r.date,
        ageInDays: r.ageInDays,
        averageWeight: r.averageWeight,
        sampleSize: r.sampleSize,
        syncId: r.syncId, 
        createdAt: new Date().toISOString(),
    }));

    for (const record of payload) {
        const { error } = await supabaseAdmin
            .from("WeightLog")
            .upsert(record, { onConflict: "syncId" });
        
        if (!error) {
            syncedSyncIds.push(record.syncId);
        } else {
            console.error("Erro no upsert (WeightLog):", error);
        }
    }

    if (syncedSyncIds.length > 0) {
        revalidatePath("/pesagens");
        revalidatePath("/pesagens/historico");
    }

    return { success: true, syncedIds: syncedSyncIds };
}
