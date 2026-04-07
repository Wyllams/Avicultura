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

export async function getFeedHistory(loteId?: string) {
    const companyId = await getUserCompanyId();
    if (!companyId) return { error: "Sem permissão" };

    let targetFlockId = loteId;
    
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
      feedLogs:FeedLog(id, syncId, date, feedType, quantityKg),
      mortalityLogs:MortalityLog(quantity),
      weightLogs:WeightLog(averageWeight)
    `)
    .eq("id", targetFlockId!)
    .eq("barn.farm.companyId", companyId)
    .single();

    if (error || !flockData) return { error: "Erro ao buscar dados ou lote não pertence a você." };

    // Ordenar os logs de pesagem de forma crescente
    if (flockData.feedLogs) {
        flockData.feedLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    
    // Sort weights desc so we can get the latest if we need it (Supabase standard ordering via JS)
    if (flockData.weightLogs) {
        flockData.weightLogs.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }

    return { flock: flockData };
}

export async function syncFeedRecords(records: any[]) {
    const companyId = await getUserCompanyId();
    if (!companyId) return { error: "Sem permissão" };

    if (!records || records.length === 0) return { success: true, syncedIds: [] };

    const syncedSyncIds: string[] = [];

    const payload = records.map(r => ({
        id: crypto.randomUUID(), 
        flockId: r.flockId,
        date: r.date,
        feedType: r.feedType,
        quantityKg: Number(r.quantityKg),
        syncId: r.syncId, 
    }));

    for (const record of payload) {
        const { error } = await supabaseAdmin
            .from("FeedLog")
            .upsert(record, { onConflict: "syncId" });
        
        if (!error) {
            syncedSyncIds.push(record.syncId);
        } else {
            console.error("Erro no upsert (FeedLog):", error);
        }
    }

    if (syncedSyncIds.length > 0) {
        revalidatePath("/racao");
    }

    return { success: true, syncedIds: syncedSyncIds };
}
