"use server";

import { createClient } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabase/admin";

// ==========================================
// Tipos
// ==========================================

export interface FarmOption {
  id: string;
  name: string;
  state: string | null;
  city: string | null;
}

export interface FlockRow {
  id: string;
  name: string;
  barnName: string;
  barnId: string;
  breed: string;
  housedBirds: number;
  housingDate: string;
  ageInDays: number;
  currentBirds: number;
  viability: number;
  totalFeedKg: number;
  lastWeight: number | null;
  gpd: number | null;
  ca: number | null;
  ip: number | null;
}

export interface DashboardKPIs {
  activeFlocks: number;
  totalHousedBirds: number;
  totalCurrentBirds: number;
  mortalityToday: number;
  mortalityTodayPercent: number;
  activeAlerts: number;
  alerts: { title: string; description: string; severity: "high" | "medium" | "low" }[];
}

export interface MortalityPoint {
  date: string;
  label: string;
  quantity: number;
  rate: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  flocks: FlockRow[];
  mortalityChart: MortalityPoint[];
  farmName: string;
}

// ==========================================
// 1. Granjas do Usuário (W-05)
// ==========================================

export async function getUserFarms(): Promise<{ farms: FarmOption[]; error?: string; needsOnboarding?: boolean }> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { farms: [], error: "Sessão inválida." };
    }

    // Buscar usuário interno
    const { data: dbUser } = await supabaseAdmin
      .from("User")
      .select("id, companyId")
      .eq("authId", user.id)
      .maybeSingle();

    if (!dbUser) {
      return { farms: [], error: "Usuário não encontrado na base de dados (Perfil incompleto).", needsOnboarding: true };
    }

    // Buscar granjas via UserFarmAccess
    const { data: accesses } = await supabaseAdmin
      .from("UserFarmAccess")
      .select("farmId")
      .eq("userId", dbUser.id);

    if (!accesses || accesses.length === 0) {
      // Fallback: buscar granjas da empresa do usuário
      const { data: farms } = await supabaseAdmin
        .from("Farm")
        .select("id, name, state, city")
        .eq("companyId", dbUser.companyId)
        .order("name");

      return { farms: farms || [] };
    }

    const farmIds = accesses.map((a) => a.farmId);
    const { data: farms } = await supabaseAdmin
      .from("Farm")
      .select("id, name, state, city")
      .in("id", farmIds)
      .order("name");

    return { farms: farms || [] };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("getUserFarms error:", msg);
    return { farms: [], error: msg };
  }
}

// ==========================================
// 2. Dados do Dashboard (W-04)
// ==========================================

export async function getDashboardData(
  farmId: string,
  mortalityDays: number = 7
): Promise<{ data: DashboardData | null; error?: string }> {
  try {
    // 1. Buscar info da granja
    const { data: farm } = await supabaseAdmin
      .from("Farm")
      .select("id, name")
      .eq("id", farmId)
      .single();

    if (!farm) {
      return { data: null, error: "Granja não encontrada." };
    }

    // 2. Buscar galpões da granja
    const { data: barns } = await supabaseAdmin
      .from("Barn")
      .select("id, name, area, capacity")
      .eq("farmId", farmId);

    if (!barns || barns.length === 0) {
      return {
        data: {
          farmName: farm.name,
          kpis: { activeFlocks: 0, totalHousedBirds: 0, totalCurrentBirds: 0, mortalityToday: 0, mortalityTodayPercent: 0, activeAlerts: 0, alerts: [] },
          flocks: [],
          mortalityChart: [],
        },
      };
    }

    const barnIds = barns.map((b) => b.id);
    const barnMap = new Map(barns.map((b) => [b.id, b]));

    // 3. Buscar lotes ativos
    const { data: activeFlocks } = await supabaseAdmin
      .from("Flock")
      .select("*")
      .in("barnId", barnIds)
      .eq("status", "ACTIVE");

    const flocks = activeFlocks || [];

    if (flocks.length === 0) {
      return {
        data: {
          farmName: farm.name,
          kpis: { activeFlocks: 0, totalHousedBirds: 0, totalCurrentBirds: 0, mortalityToday: 0, mortalityTodayPercent: 0, activeAlerts: 0, alerts: [] },
          flocks: [],
          mortalityChart: [],
        },
      };
    }

    const flockIds = flocks.map((f) => f.id);

    // 4. Buscar dados de mortalidade de todos os lotes
    const { data: allMortality } = await supabaseAdmin
      .from("MortalityLog")
      .select("flockId, date, quantity")
      .in("flockId", flockIds)
      .order("date", { ascending: false });

    // 5. Buscar dados de pesagem (última de cada lote)
    const { data: allWeights } = await supabaseAdmin
      .from("WeightLog")
      .select("flockId, averageWeight, ageInDays, date")
      .in("flockId", flockIds)
      .order("date", { ascending: false });

    // 6. Buscar consumo de ração
    const { data: allFeed } = await supabaseAdmin
      .from("FeedLog")
      .select("flockId, quantityKg")
      .in("flockId", flockIds);

    // 7. Buscar estoque para alertas
    const { data: stockItems } = await supabaseAdmin
      .from("StockItem")
      .select("id, name, quantity, minQuantity, category")
      .eq("farmId", farmId);

    // ========== CALCULAR MÉTRICAS ==========
    const mortalityMap = allMortality || [];
    const weightsMap = allWeights || [];
    const feedMap = allFeed || [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    let totalHousedBirds = 0;
    let totalCurrentBirds = 0;
    let mortalityToday = 0;

    const flockRows: FlockRow[] = flocks.map((flock) => {
      const barn = barnMap.get(flock.barnId);
      const flockMortality = mortalityMap.filter((m) => m.flockId === flock.id);
      const totalDead = flockMortality.reduce((sum, m) => sum + m.quantity, 0);
      const currentBirds = flock.housedBirds - totalDead;
      const viability = flock.housedBirds > 0 ? (currentBirds / flock.housedBirds) * 100 : 100;

      // Mortalidade do dia
      const todayMortality = flockMortality
        .filter((m) => m.date && m.date.toString().startsWith(todayStr))
        .reduce((sum, m) => sum + m.quantity, 0);

      mortalityToday += todayMortality;
      totalHousedBirds += flock.housedBirds;
      totalCurrentBirds += currentBirds;

      // Idade em dias
      const housingDate = new Date(flock.housingDate);
      const ageInDays = Math.floor((today.getTime() - housingDate.getTime()) / (1000 * 60 * 60 * 24));

      // Último peso
      const flockWeights = weightsMap.filter((w) => w.flockId === flock.id);
      const lastWeight = flockWeights.length > 0 ? flockWeights[0].averageWeight : null;

      // GPD (g/dia)
      const gpd = lastWeight && ageInDays > 0 ? lastWeight / ageInDays : null;

      // Total ração consumida
      const flockFeed = feedMap.filter((f) => f.flockId === flock.id);
      const totalFeedKg = flockFeed.reduce((sum, f) => sum + f.quantityKg, 0);

      // CA (Conversão Alimentar)
      const weightGainKg = lastWeight && currentBirds > 0 ? (lastWeight / 1000) * currentBirds : 0;
      const ca = weightGainKg > 0 ? totalFeedKg / weightGainKg : null;

      // IP (Índice de Produção)
      const ip = gpd && ca && ca > 0 ? (viability * gpd) / (ca * 10) : null;

      return {
        id: flock.id,
        name: flock.name,
        barnName: barn?.name || "—",
        barnId: flock.barnId,
        breed: flock.breed,
        housedBirds: flock.housedBirds,
        housingDate: flock.housingDate,
        ageInDays,
        currentBirds,
        viability: Math.round(viability * 10) / 10,
        totalFeedKg,
        lastWeight,
        gpd: gpd ? Math.round(gpd * 10) / 10 : null,
        ca: ca ? Math.round(ca * 100) / 100 : null,
        ip: ip ? Math.round(ip) : null,
      };
    });

    // ========== MORTALIDADE CHART ==========
    const chartStartDate = new Date();
    chartStartDate.setDate(chartStartDate.getDate() - mortalityDays);

    const mortalityChart: MortalityPoint[] = [];

    for (let i = 0; i < mortalityDays; i++) {
      const d = new Date(chartStartDate);
      d.setDate(d.getDate() + i + 1);
      const dStr = d.toISOString().split("T")[0];

      const dayMortality = mortalityMap
        .filter((m) => m.date && m.date.toString().startsWith(dStr))
        .reduce((sum, m) => sum + m.quantity, 0);

      const dayRate = totalHousedBirds > 0 ? (dayMortality / totalHousedBirds) * 100 : 0;

      // Label formatado
      let label: string;
      if (mortalityDays <= 7) {
        label = d.toLocaleDateString("pt-BR", { weekday: "short" });
      } else if (mortalityDays <= 30) {
        label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      } else {
        label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      }

      mortalityChart.push({
        date: dStr,
        label,
        quantity: dayMortality,
        rate: Math.round(dayRate * 1000) / 1000,
      });
    }

    // ========== ALERTAS ==========
    const alerts: DashboardKPIs["alerts"] = [];

    // Alerta: mortalidade alta (>0.5% diária)
    const mortalityPercent = totalCurrentBirds > 0 ? (mortalityToday / totalCurrentBirds) * 100 : 0;
    if (mortalityPercent > 0.5) {
      alerts.push({
        title: "Mortalidade acima de 0,5%",
        description: `${mortalityToday} aves hoje (${mortalityPercent.toFixed(2)}%)`,
        severity: "high",
      });
    }

    // Alerta: lote em idade avançada (>42 dias)
    flockRows.forEach((f) => {
      if (f.ageInDays > 42) {
        alerts.push({
          title: `${f.name} — ${f.ageInDays} dias`,
          description: "Lote acima da idade padrão de abate (42d).",
          severity: "medium",
        });
      }
    });

    // Alerta: estoque baixo
    (stockItems || []).forEach((item) => {
      if (item.minQuantity && item.quantity <= item.minQuantity) {
        alerts.push({
          title: `${item.name} — Estoque baixo`,
          description: `Apenas ${item.quantity} ${item.category} restante(s).`,
          severity: item.quantity === 0 ? "high" : "medium",
        });
      }
    });

    return {
      data: {
        farmName: farm.name,
        kpis: {
          activeFlocks: flocks.length,
          totalHousedBirds,
          totalCurrentBirds,
          mortalityToday,
          mortalityTodayPercent: Math.round(mortalityPercent * 100) / 100,
          activeAlerts: alerts.length,
          alerts,
        },
        flocks: flockRows,
        mortalityChart,
      },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("getDashboardData error:", msg);
    return { data: null, error: msg };
  }
}
