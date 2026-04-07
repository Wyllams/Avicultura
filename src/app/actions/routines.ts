"use server";

import supabaseAdmin from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ==========================================
// Ações de Sincronização (Offline → Supabase)
// ==========================================

interface OfflineMortalityLog {
  syncId: string;
  flockId: string;
  date: string;
  quantity: number;
  cause?: string;
}

export async function syncMortalityLogs(offlineLogs: OfflineMortalityLog[]) {
  try {
    let count = 0;

    for (const log of offlineLogs) {
      // Verificar se já existe pelo syncId
      const { data: existing } = await supabaseAdmin
        .from("MortalityLog")
        .select("id")
        .eq("syncId", log.syncId)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabaseAdmin.from("MortalityLog").insert({
          syncId: log.syncId,
          flockId: log.flockId,
          date: new Date(log.date).toISOString(),
          quantity: log.quantity,
          cause: log.cause || null,
        });

        if (!error) count++;
      }
    }

    revalidatePath("/mortalidade");
    return { success: true, count };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro na sincronização de mortalidade:", message);
    return { success: false, error: message };
  }
}

interface OfflineWeightLog {
  syncId: string;
  flockId: string;
  date: string;
  ageInDays: number;
  averageWeight: number;
  sampleSize?: number;
}

export async function syncWeightLogs(offlineLogs: OfflineWeightLog[]) {
  try {
    let count = 0;

    for (const log of offlineLogs) {
      const { data: existing } = await supabaseAdmin
        .from("WeightLog")
        .select("id")
        .eq("syncId", log.syncId)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabaseAdmin.from("WeightLog").insert({
          syncId: log.syncId,
          flockId: log.flockId,
          date: new Date(log.date).toISOString(),
          ageInDays: log.ageInDays,
          averageWeight: log.averageWeight,
          sampleSize: log.sampleSize ?? null,
        });

        if (!error) count++;
      }
    }

    revalidatePath("/pesagens");
    return { success: true, count };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro na sincronização de pesagens:", message);
    return { success: false, error: message };
  }
}

interface OfflineFeedLog {
  syncId: string;
  flockId: string;
  date: string;
  feedType: string;
  quantityKg: number;
}

export async function syncFeedLogs(offlineLogs: OfflineFeedLog[]) {
  try {
    let count = 0;

    for (const log of offlineLogs) {
      const { data: existing } = await supabaseAdmin
        .from("FeedLog")
        .select("id")
        .eq("syncId", log.syncId)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabaseAdmin.from("FeedLog").insert({
          syncId: log.syncId,
          flockId: log.flockId,
          date: new Date(log.date).toISOString(),
          feedType: log.feedType,
          quantityKg: log.quantityKg,
        });

        if (!error) count++;
      }
    }

    revalidatePath("/racao");
    return { success: true, count };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro na sincronização de ração:", message);
    return { success: false, error: message };
  }
}

interface OfflineVaccineLog {
  syncId: string;
  flockId: string;
  date: string;
  vaccineName: string;
  method: string;
  appliedBy?: string;
}

export async function syncVaccineLogs(offlineLogs: OfflineVaccineLog[]) {
  try {
    let count = 0;

    for (const log of offlineLogs) {
      const { data: existing } = await supabaseAdmin
        .from("VaccineLog")
        .select("id")
        .eq("syncId", log.syncId)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabaseAdmin.from("VaccineLog").insert({
          syncId: log.syncId,
          flockId: log.flockId,
          date: new Date(log.date).toISOString(),
          vaccineName: log.vaccineName,
          method: log.method,
          appliedBy: log.appliedBy || null,
        });

        if (!error) count++;
      }
    }

    revalidatePath("/sanidade");
    return { success: true, count };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro na sincronização de vacinas:", message);
    return { success: false, error: message };
  }
}
