"use server";

import { revalidatePath } from "next/cache";
import supabaseAdmin from "@/lib/supabase/admin";

// Função utilitária para pegar o companyId
async function getUserCompanyId() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabaseAdmin.from("User").select("companyId").eq("authId", user.id).single();
  return data?.companyId;
}

export async function syncVaccinations(records: any[]) {
    const companyId = await getUserCompanyId();
    if (!companyId) return { error: "Sem permissão" };

    if (!records || records.length === 0) return { success: true, syncedIds: [] };

    const syncedSyncIds: string[] = [];

    const payload = records.map(r => ({
        id: crypto.randomUUID(),
        flockId: r.flockId,
        date: new Date(r.date).toISOString(),
        vaccineName: r.vaccineName,
        method: r.method || "Desconhecido",
        appliedBy: r.appliedBy || null,
        syncId: r.syncId,
        createdAt: new Date().toISOString()
    }));

    const { data, error } = await supabaseAdmin.from("VaccineLog")
        .upsert(payload, { onConflict: 'syncId', ignoreDuplicates: true })
        .select('syncId');

    if (error) {
        console.error("Erro no sync da vacinação:", error);
        return { error: "Falha na sincronização." };
    }

    if (data) {
        data.forEach(d => syncedSyncIds.push(d.syncId));
    }

    revalidatePath("/sanidade");
    revalidatePath("/sanidade/vacinacao/historico");

    return { success: true, syncedIds: syncedSyncIds };
}

export async function getVaccineHistory(farmId?: string) {
  const companyId = await getUserCompanyId();
  if (!companyId) return { error: "Sem permissão" };

  let query = supabaseAdmin.from("VaccineLog").select(`
    id,
    date,
    vaccineName,
    method,
    appliedBy,
    flock:Flock!inner (
       id,
       name,
       housedBirds,
       housingDate,
       barn:Barn!inner(farm:Farm!inner(id, companyId))
    )
  `)
  .eq("flock.barn.farm.companyId", companyId)
  .order("date", { ascending: false });

  if (farmId) {
     query = query.eq("flock.barn.farm.id", farmId);
  }

  const { data, error } = await query;
  
  if (error) {
     console.error("Error fetching vaccine history", error);
     return { error: "Erro ao buscar histórico" };
  }

  return { logs: data || [] };
}

export async function syncVisits(records: any[]) {
    const companyId = await getUserCompanyId();
    if (!companyId) return { error: "Sem permissão" };

    if (!records || records.length === 0) return { success: true, syncedIds: [] };

    const syncedSyncIds: string[] = [];

    for (const record of records) {
        // Verifica se já não existe
        const { data: existMove } = await supabaseAdmin
          .from("VisitLog")
          .select("id")
          .eq("syncId", record.syncId)
          .maybeSingle();

        if (existMove) {
          syncedSyncIds.push(record.syncId);
          continue;
        }

        let pdfUrl = null;

        // Se houver PDF no formato Base64 ou Blob (iremos simular Base64 dataURL no Dexie)
        if (record.pdfBlob) {
            try {
               // Record.pdfBlob is expected to be a base64 DataURL or ArrayBuffer if we convert it in the client before DB insertion
               // Usualmente armazenamos como Base64 string no indexedDB para simplificar sync JSON-friendly.
               // Supondo que "pdfBlob" seja uma string em Base64 (data:application/pdf;base64,.....)
               const base64Data = record.pdfBlob.split(',')[1];
               const buffer = Buffer.from(base64Data || record.pdfBlob, 'base64');
               const filename = `${record.flockId}/${record.syncId}.pdf`;

               // Garante que o bucket "sanidade-docs" existe ou falha silenciosamente gravando sem anexo
               const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
                  .from("sanidade-docs")
                  .upload(filename, buffer, {
                     contentType: 'application/pdf',
                     upsert: true
                  });

               if (!uploadErr && uploadData) {
                  const { data: publicUrl } = supabaseAdmin.storage.from("sanidade-docs").getPublicUrl(filename);
                  pdfUrl = publicUrl.publicUrl;
               }
            } catch (e: any) {
               console.warn("Erro ao fazer upload do PDF offline no Sync background:", e);
            }
        }

        const { error } = await supabaseAdmin.from("VisitLog").insert({
            id: crypto.randomUUID(),
            flockId: record.flockId,
            date: new Date(record.date).toISOString(),
            veterinarian: record.veterinarian,
            report: record.report,
            pdfUrl: pdfUrl,
            syncId: record.syncId,
            createdAt: record.createdAt || new Date().toISOString()
        });

        if (!error) {
            syncedSyncIds.push(record.syncId);
        }
    }

    revalidatePath("/sanidade");
    revalidatePath("/sanidade/visitas/historico");

    return { success: true, syncedIds: syncedSyncIds };
}

export async function getVisitLogs(farmId?: string) {
  const companyId = await getUserCompanyId();
  if (!companyId) return { error: "Sem permissão" };

  let query = supabaseAdmin.from("VisitLog").select(`
    id,
    date,
    veterinarian,
    report,
    pdfUrl,
    flock:Flock!inner (
       id,
       name,
       barn:Barn!inner(farm:Farm!inner(id, companyId, name))
    )
  `)
  .eq("flock.barn.farm.companyId", companyId)
  .order("date", { ascending: false });

  if (farmId) {
     query = query.eq("flock.barn.farm.id", farmId);
  }

  const { data, error } = await query;
  
  if (error) {
     console.error("Error fetching visit history", error);
     return { error: "Erro ao buscar histórico" };
  }

  return { logs: data || [] };
}

// ==========================================
// PNSA AUDIT
// ==========================================

export async function registerPnsaAudit(payload: {
  farmId: string;
  visitDate: string;
  auditor: string;
  waterQuality: string;
  birdNets: string;
  sanitaryBarrier: string;
  pestControl: string;
  compostBin: string;
  traceability: string;
  vehicleRegistry: string;
  complianceScore: number;
  notes?: string;
  nonConformReasons?: Record<string, string>;
}) {
  const companyId = await getUserCompanyId();
  if (!companyId) return { error: "Sem permissão" };

  // Verificar se a granja pertence à empresa do usuário
  const { data: farm } = await supabaseAdmin
    .from("Farm")
    .select("id")
    .eq("id", payload.farmId)
    .eq("companyId", companyId)
    .single();

  if (!farm) return { error: "Granja não encontrada ou sem permissão." };

  const { error } = await supabaseAdmin.from("PnsaAudit").insert({
    id: crypto.randomUUID(),
    farmId: payload.farmId,
    visitDate: new Date(payload.visitDate).toISOString(),
    auditor: payload.auditor,
    waterQuality: payload.waterQuality,
    birdNets: payload.birdNets,
    sanitaryBarrier: payload.sanitaryBarrier,
    pestControl: payload.pestControl,
    compostBin: payload.compostBin,
    traceability: payload.traceability,
    vehicleRegistry: payload.vehicleRegistry,
    complianceScore: payload.complianceScore,
    notes: payload.notes || null,
    nonConformReasons: payload.nonConformReasons || {},
    createdAt: new Date().toISOString(),
  });

  if (error) {
    console.error("Erro ao registrar PnsaAudit:", error);
    return { error: error.message };
  }

  revalidatePath("/sanidade/protocolos");
  return { success: true };
}

export async function getPnsaAudits(farmId?: string) {
  const companyId = await getUserCompanyId();
  if (!companyId) return { error: "Sem permissão" };

  let query = supabaseAdmin
    .from("PnsaAudit")
    .select(`
      id,
      visitDate,
      auditor,
      waterQuality,
      birdNets,
      sanitaryBarrier,
      pestControl,
      compostBin,
      traceability,
      vehicleRegistry,
      complianceScore,
      notes,
      nonConformReasons,
      createdAt,
      farm:Farm!inner(id, name, companyId)
    `)
    .eq("farm.companyId", companyId)
    .order("visitDate", { ascending: false });

  if (farmId) {
    query = query.eq("farmId", farmId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar PnsaAudits:", error);
    return { error: "Erro ao buscar auditorias." };
  }

  return { audits: data || [] };
}
