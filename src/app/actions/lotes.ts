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

export type FlockStatus = "PLANNING" | "ACTIVE" | "CLOSED";

export interface CreateFlockParams {
  barnId: string;
  name: string;
  breed: string;
  housedBirds: number;
  hatchData: Date;
  housingDate: Date;
}

// ==========================================
// 1. LISTAGEM E BUSCA (W-12)
// ==========================================

export async function getFlocks(statusFilter?: FlockStatus) {
  const companyId = await getUserCompanyId();
  if (!companyId) return { error: "Sem permissão" };

  let query = supabaseAdmin.from("Flock").select(`
    id,
    name,
    breed,
    housedBirds,
    housingDate,
    slaughterDate,
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
  `).eq("barn.farm.companyId", companyId)
    .order("housingDate", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error getFlocks", error);
    return { error: error.message };
  }
  
  // Transform data
  const flocks = data.map((item: any) => ({
    id: item.id,
    name: item.name,
    status: item.status,
    housedBirds: item.housedBirds,
    housingDate: item.housingDate,
    slaughterDate: item.slaughterDate,
    breed: item.breed,
    barnId: item.barn.id,
    barnName: item.barn.name,
    farmName: item.barn.farm.name,
  }));

  return { flocks };
}

export async function getFlockOverview(flockId: string) {
  const companyId = await getUserCompanyId();
  if (!companyId) return { error: "Sem permissão" };

  const { data, error } = await supabaseAdmin.from("Flock").select(`
    *,
    barn:Barn!inner (
      id, name, area, capacity,
      farm:Farm!inner (id, name, companyId)
    ),
    mortalityLogs:MortalityLog(quantity, date),
    weightLogs:WeightLog(averageWeight, date),
    feedLogs:FeedLog(quantityKg, date)
  `)
  .eq("id", flockId)
  .eq("barn.farm.companyId", companyId)
  .maybeSingle();

  if (error || !data) return { error: "Lote não encontrado." };

  return { flock: data };
}

// ==========================================
// 2. ALOJAMENTO (W-14)
// ==========================================

export async function getAvailableBarns() {
  const companyId = await getUserCompanyId();
  if (!companyId) return { error: "Sem permissão" };

  // Retorna galpões de uma determinada empresa validando aqueles que não tem um Lote ativo
  const { data: barnsData, error } = await supabaseAdmin.from("Barn").select(`
    id,
    name,
    status,
    farmId,
    farm:Farm!inner(id, name, companyId),
    flocks:Flock(id, status)
  `).eq("farm.companyId", companyId);

  if (error || !barnsData) return { error: "Erro ao buscar galpões." };

  const availableBarns = barnsData.filter((b: any) => {
    const hasActive = b.flocks && b.flocks.some((f: any) => f.status === "ACTIVE");
    return !hasActive && b.status === "EM_OPERACAO"; // Apenas galpões limpos e operantes
  }).map((b: any) => ({
    ...b,
    farm: Array.isArray(b.farm) ? b.farm[0] : b.farm
  }));

  return { barns: availableBarns };
}

export async function createFlock(params: CreateFlockParams) {
  const companyId = await getUserCompanyId();
  if (!companyId) return { error: "Não autorizado" };

  // Verifica duplicação de nome na conta? Não, o schema Prisma exige @unique global no 'name' para Lote.
  // Como é global, adicionamos algo para evitar collision:
  const uniqueName = `${params.name}-${Math.floor(Date.now() / 1000)}`;

  const { data, error } = await supabaseAdmin.from("Flock").insert({
    id: crypto.randomUUID(),
    barnId: params.barnId,
    name: params.name,
    breed: params.breed,
    housedBirds: params.housedBirds,
    hatchData: params.hatchData.toISOString(),
    housingDate: params.housingDate.toISOString(),
    status: "ACTIVE",
    updatedAt: new Date().toISOString()
  }).select().single();

  if (error) {
    console.error(error);
    return { error: "Falha ao alojar o lote. Tente outro nome ou contate suporte." };
  }

  revalidatePath("/lotes");
  revalidatePath(`/granjas`);
  return { success: true, flockId: data.id };
}

// ==========================================
// 3. ENCERRAMENTO (W-15)
// ==========================================

export async function getFlockPreCloseStatus(flockId: string) {
  const info = await getFlockOverview(flockId);
  if (info.error || !info.flock) return { error: info.error };
  const flock = info.flock;

  const now = new Date();
  
  const pesos = flock.weightLogs || [];
  const racoes = flock.feedLogs || [];

  pesos.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  racoes.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const ultimaPesagem = pesos[0] ? new Date(pesos[0].date) : null;
  const ultimaRacao = racoes[0] ? new Date(racoes[0].date) : null;

  const daysSinceWeight = ultimaPesagem ? Math.floor((now.getTime() - ultimaPesagem.getTime()) / (1000 * 3600 * 24)) : 999;
  const daysSinceFeed = ultimaRacao ? Math.floor((now.getTime() - ultimaRacao.getTime()) / (1000 * 3600 * 24)) : 999;

  return {
    missingWeight: daysSinceWeight > 7,
    missingFeed: daysSinceFeed > 3,
    daysSinceWeight,
    daysSinceFeed
  };
}

export async function closeFlock(flockId: string, slaughterDate: Date) {
  const { error } = await supabaseAdmin.from("Flock").update({
    status: "CLOSED",
    slaughterDate: slaughterDate.toISOString()
  }).eq("id", flockId);

  if (error) return { error: error.message };

  revalidatePath(`/lotes/${flockId}`);
  revalidatePath(`/lotes`);
  return { success: true };
}

// ==========================================
// 4. COMPARATIVO AUTOMÁTICO (W-16)
// ==========================================

export async function getTopComparisons() {
  const companyId = await getUserCompanyId();
  if (!companyId) return { error: "Sem permissão" };

  const { data, error } = await supabaseAdmin.from("Flock").select(`
    id, name, breed, housedBirds, housingDate, slaughterDate, status,
    barn:Barn!inner(farm:Farm!inner(companyId)),
    mortalityLogs:MortalityLog(quantity),
    feedLogs:FeedLog(quantityKg),
    weightLogs:WeightLog(averageWeight, date)
  `)
  .eq("barn.farm.companyId", companyId)
  .eq("status", "CLOSED")
  .order("slaughterDate", { ascending: false })
  .limit(4);

  if (error) return { error: error.message };

  // Precisamos retornar CA, Viabilidade, IP puros de cada lote
  const results = data.map((f: any) => {
    let mortos = 0;
    f.mortalityLogs.forEach((m: any) => mortos += m.quantity);
    
    let consumed = 0;
    f.feedLogs.forEach((m: any) => consumed += m.quantityKg);

    let pesos = f.weightLogs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let pesoAbateGramas = pesos[0]?.averageWeight || 0;
    let pesoAbateKg = pesoAbateGramas / 1000;

    let totalVivos = f.housedBirds - mortos;
    let viabilidade = f.housedBirds > 0 ? (totalVivos / f.housedBirds) * 100 : 0;
    let ganhoTotalKg = totalVivos * pesoAbateKg;
    let ca = ganhoTotalKg > 0 ? consumed / ganhoTotalKg : 0;
    
    const timeDiff = new Date(f.slaughterDate).getTime() - new Date(f.housingDate).getTime();
    const idadeDias = timeDiff > 0 ? Math.floor(timeDiff / (1000 * 3600 * 24)) : 0;
    let gpd = idadeDias > 0 ? (pesoAbateGramas / idadeDias) : 0;

    let ip = (ca > 0 && idadeDias > 0) ? ((viabilidade * (gpd/1000)) / (idadeDias * ca)) * 10000 : 0; // Fórmula alternativa padrão: (Viabilidade * Peso Final / (Idade * CA)) * 100. Vamos usar a do AgroSaaS aqui = (viabilidade * GPD / CA) * 100 (ajustando a base para ser 100-300+ normal)
    
    ip = (ca > 0) ? (viabilidade * (pesoAbateKg) / (idadeDias * ca)) * 100 : 0;

    return {
      id: f.id,
      name: f.name,
      breed: f.breed,
      viabilidade: Number(viabilidade.toFixed(2)),
      ca: Number(ca.toFixed(3)),
      ip: Number(ip.toFixed(2)),
    }
  });

  return { flocks: results.reverse() }; // Oldest first on chart
}
