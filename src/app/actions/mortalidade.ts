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

// Para a View Dashboard: Pegar mortalidade total do Lote e listagem.
export async function getMortalityHistory(flockId?: string) {
    const companyId = await getUserCompanyId();
    if (!companyId) return { error: "Sem permissão" };

    // Se flockId não for passado, pegaremos o lote ativo mais recente.
    let targetFlockId = flockId;
    
    if (!targetFlockId) {
        const { flocks: activeFlocks, error: flocksError } = await getActiveFlocks();
        if (flocksError) return { error: flocksError, needsFlock: true };
        
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
      barn:Barn!inner(name, farm:Farm!inner(name, companyId)),
      mortalityLogs:MortalityLog(id, date, quantity, cause, createdAt)
    `)
    .eq("id", targetFlockId!)
    .eq("barn.farm.companyId", companyId)
    .single();

    if (error || !flockData) return { error: "Erro ao buscar dados ou lote não pertence a você." };

    return { flock: flockData };
}

// O batch sync envia da fila local (indexeddb) para o Postgres.
export async function syncMortalityRecords(records: any[]) {
    const companyId = await getUserCompanyId();
    if (!companyId) return { error: "Sem permissão" };

    if (!records || records.length === 0) return { success: true, syncedIds: [] };

    const syncedSyncIds: string[] = [];

    // O ideal seria fazer insert em batch ignorando conflitos (on conflict do nothing) baseado no syncId.
    // Mas o Supabase REST tem o .upsert com "onConflict" ou podemos mapear.
    // Preparando o payload para Supabase:
    const payload = records.map(r => ({
        id: crypto.randomUUID(), // Ignoramos IDs do dexie se tentassem vir (o dexie usa local id)
        flockId: r.flockId,
        date: new Date(r.date).toISOString(),
        quantity: r.quantity,
        cause: r.cause || null,
        syncId: r.syncId, // UUID para proteção de duplicação
        createdAt: new Date().toISOString()
    }));

    const { data, error } = await supabaseAdmin.from("MortalityLog")
        .upsert(payload, { onConflict: 'syncId', ignoreDuplicates: true })
        .select('syncId');

    if (error) {
        console.error("Erro no sync da mortalidade:", error);
        return { error: "Falha na sincronização." };
    }

    if (data) {
        data.forEach(d => syncedSyncIds.push(d.syncId));
    }

    revalidatePath("/mortalidade");
    revalidatePath("/lotes");
    revalidatePath("/dashboard");

    return { success: true, syncedIds: syncedSyncIds };
}
