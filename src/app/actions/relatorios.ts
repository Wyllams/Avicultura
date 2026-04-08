"use server";

import supabaseAdmin from "@/lib/supabase/admin";

export async function getReportFilters() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabaseClient = createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: userData } = await supabaseAdmin
      .from("User")
      .select("companyId")
      .eq("authId", user.id)
      .single();

    if (!userData) return { error: "Usuário não encontrado" };

    // Fetching from Supabase via HTTP client avoids direct IPv4 connection issues common to Prisma dev connections
    const { data: farms } = await supabaseAdmin
      .from("Farm")
      .select("id, name")
      .eq("companyId", userData.companyId)
      .eq("status", "ATIVO");

    const farmIds = (farms || []).map(f => f.id);
    let flocks: any[] = [];

    if (farmIds.length > 0) {
      // 1. Puxar galpões dessas granjas
      const { data: barns } = await supabaseAdmin
        .from("Barn")
        .select("id, farmId")
        .in("farmId", farmIds);

      const barnIds = (barns || []).map(b => b.id);

      // 2. Puxar lotes desses galpões
      if (barnIds.length > 0) {
        const { data: dbFlocks } = await supabaseAdmin
          .from("Flock")
          .select("id, name, status, barnId, createdAt")
          .in("barnId", barnIds)
          .order("createdAt", { ascending: false });

        flocks = (dbFlocks || []).map(flock => {
          const barn = barns?.find(b => b.id === flock.barnId);
          return {
            id: flock.id,
            name: flock.name,
            status: flock.status,
            barn: { farmId: barn?.farmId }
          };
        });
      }
    }

    return { farms: farms || [], flocks };
  } catch (err: any) {
    console.error("Erro em getReportFilters:", err);
    return { error: err.message || "Erro interno." };
  }
}

export async function getDesempenhoData(flockId: string) {
  try {
    const { data: flock, error } = await supabaseAdmin
      .from("Flock")
      .select("name, housedBirds, housingDate, MortalityLog(quantity), FeedLog(quantityKg), WeightLog(averageWeight, ageInDays), Barn(name, Farm(name))")
      .eq("id", flockId)
      .single();

    if (error || !flock) throw new Error("Lote não encontrado");

    const totalHoused = flock.housedBirds || 0;
    const mortalityLogs = flock.MortalityLog || [];
    const feedLogs = flock.FeedLog || [];
    const weightLogs = (flock.WeightLog || []).sort((a: any, b: any) => a.ageInDays - b.ageInDays);

    const totalDead = mortalityLogs.reduce((acc: any, log: any) => acc + log.quantity, 0);
    const aliveBirds = totalHoused - totalDead;
    const viabilidade = totalHoused > 0 ? ((aliveBirds / totalHoused) * 100) : 0;

    const totalFeedConsumedKg = feedLogs.reduce((acc: any, log: any) => acc + log.quantityKg, 0);
    
    let currentWeightGrams = 0;
    let ageInDays = 0;
    if (weightLogs.length > 0) {
      const lastWeight = weightLogs[weightLogs.length - 1];
      currentWeightGrams = lastWeight.averageWeight;
      ageInDays = lastWeight.ageInDays;
    } else {
       const msDiff = new Date().getTime() - new Date(flock.housingDate || new Date()).getTime();
       ageInDays = Math.floor(msDiff / (1000 * 60 * 60 * 24));
       if (ageInDays < 0) ageInDays = 0;
    }

    const currentWeightKg = currentWeightGrams / 1000;
    
    const totalLivingWeightKg = aliveBirds * currentWeightKg;
    const initialWeightKg = totalHoused * 0.04;
    const weightGain = totalLivingWeightKg - initialWeightKg;
    
    const conversaoAlimentar = weightGain > 0 ? (totalFeedConsumedKg / weightGain) : 0;
    const gpd = ageInDays > 0 ? (currentWeightGrams / ageInDays) : 0;

    let iep = 0;
    if (conversaoAlimentar > 0 && ageInDays > 0) {
       iep = (viabilidade * currentWeightKg) / (conversaoAlimentar * ageInDays) * 100;
    }

    const barn: any = Array.isArray(flock.Barn) ? flock.Barn[0] : flock.Barn;
    const farm: any = barn ? (Array.isArray(barn.Farm) ? barn.Farm[0] : barn.Farm) : null;

    return { 
      data: {
        flockName: flock.name,
        barnName: barn?.name || "Desconhecido",
        farmName: farm?.name || "Desconhecida",
        viabilidade: viabilidade.toFixed(2),
        conversaoAlimentar: conversaoAlimentar.toFixed(3),
        gpd: gpd.toFixed(2),
        iep: iep.toFixed(0),
        ageInDays,
        totalDead,
        aliveBirds,
        housedBirds: totalHoused,
        currentWeightKg: currentWeightKg.toFixed(3),
        totalFeedConsumedKg: totalFeedConsumedKg.toFixed(0)
      } 
    };

  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getBoletimSanitarioData(flockId: string) {
  try {
    const { data: flock, error } = await supabaseAdmin
      .from("Flock")
      .select("name, breed, housingDate, housedBirds, VaccineLog(*), VisitLog(*), MortalityLog(quantity), Barn(name, Farm(name))")
      .eq("id", flockId)
      .single();

    if (error || !flock) throw new Error("Lote não encontrado");

    const totalDead = (flock.MortalityLog || []).reduce((acc: any, log: any) => acc + log.quantity, 0);

    const barn: any = Array.isArray(flock.Barn) ? flock.Barn[0] : flock.Barn;
    const farm: any = barn ? (Array.isArray(barn.Farm) ? barn.Farm[0] : barn.Farm) : null;

    return { 
      data: {
        flockName: flock.name,
        breed: flock.breed,
        housingDate: flock.housingDate,
        housedBirds: flock.housedBirds,
        totalDead,
        farmName: farm?.name || "Desconhecida",
        vaccines: flock.VaccineLog || [],
        visits: flock.VisitLog || []
      }
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getEstoqueReportData(farmId: string, startDate?: string, endDate?: string) {
  try {
    const { data: items } = await supabaseAdmin
      .from("StockItem")
      .select("id")
      .eq("farmId", farmId);

    const itemIds = (items || []).map(i => i.id);
    if(itemIds.length === 0) return { data: [] };

    let query = supabaseAdmin
      .from("StockMovement")
      .select("*, item:StockItem(*)")
      .in("itemId", itemIds)
      .order("date", { ascending: false });

    if (startDate && endDate) {
      query = query.gte("date", new Date(startDate).toISOString()).lte("date", new Date(endDate).toISOString());
    }

    const { data: movements, error } = await query;
    if (error) throw error;

    return { data: movements || [] };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getMortalidadeData(flockId: string) {
  try {
    const { data: flock, error } = await supabaseAdmin
      .from("Flock")
      .select("name, housedBirds, housingDate, MortalityLog(*), Barn(name, Farm(name))")
      .eq("id", flockId)
      .single();

    if (error || !flock) throw new Error("Lote não encontrado");

    const barn: any = Array.isArray(flock.Barn) ? flock.Barn[0] : flock.Barn;

    return { 
      data: {
        flockName: flock.name,
        barnName: barn?.name || "Desconhecido",
        housedBirds: flock.housedBirds,
        housingDate: flock.housingDate,
        mortalityLogs: flock.MortalityLog || []
      }
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getSanidadeData(flockId: string) {
  try {
    const { data: flock, error } = await supabaseAdmin
      .from("Flock")
      .select("name, VisitLog(*), MedicationLog(*)")
      .eq("id", flockId)
      .single();

    if (error) throw new Error(`Erro Supabase: ${JSON.stringify(error)}`);
    if (!flock) throw new Error("Lote não encontrado");

    return { 
      data: {
        flockName: flock.name,
        visits: flock.VisitLog || [],
        medications: flock.MedicationLog || []
      }
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

// Stub implementations to fix build errors for UI pages that aren't hooked up yet
export interface VaccinationReportData {
    totalRecords: number;
    uniqueVaccines: number;
    flocksVaccinated: number;
    totalBirdsCovered: number;
    rows: any[];
    byVaccine: { name: string; count: number; percent: number }[];
    byMethod: { method: string; count: number; percent: number }[];
    timeline: { month: string; count: number }[];
}

export async function getReportVaccination(flockId?: string) {
  try {
    const filters = await getReportFilters();
    if (filters.error) throw new Error(filters.error);
    
    const validFlockIds = (filters.flocks || []).map(f => f.id);
    if (validFlockIds.length === 0) return { error: "Nenhum lote encontrado na empresa." };

    let query = supabaseAdmin
      .from("VaccineLog")
      .select("*, Flock(name, housedBirds, Barn(name, Farm(name)))")
      .order("date", { ascending: false });

    if (flockId) {
      if (!validFlockIds.includes(flockId)) throw new Error("Acesso negado ao lote.");
      query = query.eq("flockId", flockId);
    } else {
      // Limite Supabase URIs can be long if we pass 1000 IDs, maybe chunk or just use farmId
      // For simplicity in MVP, we pass the array
      query = query.in("flockId", validFlockIds);
    }

    const { data: logs, error } = await query;
    if (error) throw error;

    const rows = (logs || []).map((log: any) => {
       const flock = log.Flock;
       const barn = Array.isArray(flock?.Barn) ? flock.Barn[0] : flock.Barn;
       const farm = barn ? (Array.isArray(barn.Farm) ? barn.Farm[0] : barn.Farm) : null;
       return {
         id: log.id,
         vaccineName: log.vaccineName,
         date: log.date,
         method: log.method,
         appliedBy: log.appliedBy,
         flockName: flock?.name || "Desconhecido",
         barnName: barn?.name || "Desconhecido",
         farmName: farm?.name || "Desconhecida",
         housedBirds: flock?.housedBirds || 0
       };
    });

    const totalRecords = rows.length;
    const vaccineCounts: Record<string, number> = {};
    const methodCounts: Record<string, number> = {};
    const monthlyCounts: Record<string, number> = {};
    const uniqueFlocks = new Set<string>();
    let totalBirdsCovered = 0;

    rows.forEach(r => {
      vaccineCounts[r.vaccineName] = (vaccineCounts[r.vaccineName] || 0) + 1;
      methodCounts[r.method] = (methodCounts[r.method] || 0) + 1;
      uniqueFlocks.add(r.flockName);
      
      const monthStr = new Date(r.date).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).toUpperCase();
      monthlyCounts[monthStr] = (monthlyCounts[monthStr] || 0) + 1;
    });

    // We can't sum housedBirds directly from rows because multiple vaccines can apply to the same flock.
    // Let's sum housing of uniquely vaccinated flocks.
    const flockBirdsMap = new Map<string, number>();
    rows.forEach(r => {
      if (!flockBirdsMap.has(r.flockName)) {
         flockBirdsMap.set(r.flockName, r.housedBirds);
         totalBirdsCovered += r.housedBirds;
      }
    });

    const uniqueVaccines = Object.keys(vaccineCounts).length;
    const flocksVaccinated = uniqueFlocks.size;

    const byVaccine = Object.entries(vaccineCounts)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / totalRecords) * 100) }))
      .sort((a, b) => b.count - a.count);

    const byMethod = Object.entries(methodCounts)
      .map(([method, count]) => ({ method, count, percent: Math.round((count / totalRecords) * 100) }))
      .sort((a, b) => b.count - a.count);

    // timeline reverse chronological order naturally? Map entries are insertion order, let's just reverse month strings manually or use array
    const monthKeys = Object.keys(monthlyCounts).sort((a, b) => {
       const [mA, yA] = a.split(" de ");
       const [mB, yB] = b.split(" de ");
       // lazy sort
       return 0; 
    });

    const timeline = Object.entries(monthlyCounts).map(([month, count]) => ({ month, count }));
    // In revert chronological or chronological
    timeline.reverse();

    return {
      data: {
        totalRecords,
        uniqueVaccines,
        flocksVaccinated,
        totalBirdsCovered,
        rows,
        byVaccine,
        byMethod,
        timeline
      }
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export interface MedicationReportData {
    totalRecords: number;
    totalCost: number;
    costPerBird: number;
    uniqueMedications: number;
    topProduct: { name: string; percent: number } | null;
    rows: any[];
    byMedication: { name: string; totalCost: number; count: number }[];
    byReason: { reason: string; count: number; percent: number }[];
}

export async function getReportMedication(flockId?: string) {
  try {
    const filters = await getReportFilters();
    if (filters.error) throw new Error(filters.error);
    
    const validFlockIds = (filters.flocks || []).map(f => f.id);
    if (validFlockIds.length === 0) return { error: "Nenhum lote encontrado na empresa." };

    let query = supabaseAdmin
      .from("MedicationLog")
      .select("*, Flock(name, housedBirds, Barn(name, Farm(name)))")
      .order("date", { ascending: false });

    if (flockId) {
      if (!validFlockIds.includes(flockId)) throw new Error("Acesso negado ao lote.");
      query = query.eq("flockId", flockId);
    } else {
      query = query.in("flockId", validFlockIds);
    }

    const { data: logs, error } = await query;
    if (error) throw error;

    let totalCost = 0;
    const medStats: Record<string, { count: number, cost: number }> = {};
    const reasonStats: Record<string, number> = {};
    let totalBirdsCovered = 0;
    const flockBirdsMap = new Map<string, number>();

    const rows = (logs || []).map((log: any) => {
       const flock = log.Flock;
       const barn = Array.isArray(flock?.Barn) ? flock.Barn[0] : flock.Barn;
       const farm = barn ? (Array.isArray(barn.Farm) ? barn.Farm[0] : barn.Farm) : null;
       
       const cost = log.cost || 0;
       totalCost += cost;

       const medName = log.medicationName || "Desconhecido";
       if (!medStats[medName]) medStats[medName] = { count: 0, cost: 0 };
       medStats[medName].count += 1;
       medStats[medName].cost += cost;

       const reason = log.reason || "Tratamento";
       reasonStats[reason] = (reasonStats[reason] || 0) + 1;

       const fName = flock?.name || "Desconhecido";
       if (!flockBirdsMap.has(fName)) {
         flockBirdsMap.set(fName, flock?.housedBirds || 0);
         totalBirdsCovered += (flock?.housedBirds || 0);
       }

       return {
         id: log.id,
         medicationName: medName,
         date: log.date,
         method: log.method,
         dosage: log.dosage,
         reason,
         withdrawalDays: log.withdrawalDays,
         cost,
         appliedBy: log.appliedBy,
         flockName: fName,
         barnName: barn?.name || "Desconhecido",
         farmName: farm?.name || "Desconhecida",
       };
    });

    const totalRecords = rows.length;
    const uniqueMedications = Object.keys(medStats).length;
    const costPerBird = totalBirdsCovered > 0 ? totalCost / totalBirdsCovered : 0;

    const byMedication = Object.entries(medStats)
      .map(([name, stats]) => ({ name, totalCost: stats.cost, count: stats.count }))
      .sort((a, b) => b.totalCost - a.totalCost);

    let topProduct = null;
    if (byMedication.length > 0 && totalCost > 0) {
      topProduct = {
        name: byMedication[0].name,
        percent: Math.round((byMedication[0].totalCost / totalCost) * 100)
      };
    }

    const byReason = Object.entries(reasonStats)
      .map(([reason, count]) => ({ reason, count, percent: Math.round((count / totalRecords) * 100) }))
      .sort((a, b) => b.count - a.count);

    return {
      data: {
        totalRecords,
        totalCost,
        costPerBird,
        uniqueMedications,
        topProduct,
        rows,
        byMedication,
        byReason
      }
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export interface MovementsReportData {
  totalIn: number;
  totalOut: number;
  totalMovements: number;
  movements: any[];
  topMoved: { name: string; totalQty: number; unit: string; }[];
  emissionDate: string;
}

export async function getReportMovements() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabaseClient = createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: userData } = await supabaseAdmin
      .from("User")
      .select("companyId")
      .eq("authId", user.id)
      .single();

    if (!userData) return { error: "Usuário não encontrado" };

    const { data: logs, error } = await supabaseAdmin
      .from("InventoryMovement")
      .select("id, date, type, quantity, reason, InventoryItem!inner(name, category, unit, Farm!inner(companyId))")
      .eq("InventoryItem.Farm.companyId", userData.companyId)
      .order("date", { ascending: false });

    if (error) throw error;

    let totalIn = 0;
    let totalOut = 0;
    const totalMovements = logs ? logs.length : 0;
    
    const usedQtyMap: Record<string, { qty: number, unit: string }> = {};

    const movements = (logs || []).map((m: any) => {
      const type = m.type; // "IN" | "OUT"
      if (type === "IN") totalIn += m.quantity;
      if (type === "OUT") {
         totalOut += m.quantity;
         const itemName = m.InventoryItem?.name || "Desconhecido";
         if (!usedQtyMap[itemName]) usedQtyMap[itemName] = { qty: 0, unit: m.InventoryItem?.unit || "" };
         usedQtyMap[itemName].qty += m.quantity;
      }
      
      return {
        id: m.id,
        date: new Date(m.date).toLocaleDateString("pt-BR"),
        itemName: m.InventoryItem?.name || "Desconhecido",
        category: m.InventoryItem?.category || "Outros",
        type,
        quantity: m.quantity,
        unit: m.InventoryItem?.unit || "",
        reason: m.reason
      };
    });

    const topMoved = Object.entries(usedQtyMap)
      .map(([name, data]) => ({ name, totalQty: data.qty, unit: data.unit }))
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);

    return {
      data: {
        totalIn,
        totalOut,
        totalMovements,
        movements,
        topMoved,
        emissionDate: new Date().toLocaleDateString("pt-BR")
      }
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export interface UniformityWeighing {
  id: string;
  date: string;
  ageInDays: number;
  averageWeight: number;
  sampleSize: number;
}

export interface UniformityReportData {
  flock: {
    farmName: string;
    barnName: string;
    breed: string | null;
    housedBirds: number;
  };
  weighings: UniformityWeighing[];
  latestWeight: number | null;
  averageOfAverages: number | null;
  emissionDate: string;
}

export async function getReportUniformity(flockId: string) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabaseClient = createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: userData } = await supabaseAdmin
      .from("User")
      .select("companyId")
      .eq("authId", user.id)
      .single();

    if (!userData) return { error: "Usuário não encontrado" };

    const { data: flock, error } = await supabaseAdmin
      .from("Flock")
      .select("id, breed, housedBirds, WeightLog(*), Barn(name, Farm(companyId, name))")
      .eq("id", flockId)
      .single();

    if (error || !flock) throw new Error("Lote não encontrado");

    const barn: any = Array.isArray(flock.Barn) ? flock.Barn[0] : flock.Barn;
    const farm: any = barn ? (Array.isArray(barn.Farm) ? barn.Farm[0] : barn.Farm) : null;
    if (farm?.companyId !== userData.companyId) throw new Error("Acesso negado");

    const dbWeighings = flock.WeightLog || [];
    dbWeighings.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()); // descending

    const weighings: UniformityWeighing[] = dbWeighings.map((w: any) => ({
      id: w.id,
      date: new Date(w.date).toLocaleDateString("pt-BR"),
      ageInDays: w.ageInDays,
      averageWeight: w.averageWeight,
      sampleSize: w.sampleSize || 0
    }));

    const latestWeight = weighings.length > 0 ? weighings[0].averageWeight : null;
    
    let sum = 0;
    dbWeighings.forEach((w: any) => sum += w.averageWeight);
    const averageOfAverages = dbWeighings.length > 0 ? Math.round(sum / dbWeighings.length) : null;

    return {
      data: {
        flock: {
          farmName: farm?.name || "Desconhecida",
          barnName: barn?.name || "Desconhecido",
          breed: flock.breed,
          housedBirds: flock.housedBirds || 0
        },
        weighings,
        latestWeight,
        averageOfAverages,
        emissionDate: new Date().toLocaleDateString("pt-BR")
      }
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
export async function getReportGrowth(flockId?: string) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabaseClient = createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: userData } = await supabaseAdmin
      .from("User")
      .select("companyId")
      .eq("authId", user.id)
      .single();

    if (!userData) return { error: "Usuário não encontrado" };

    let targetFlockId = flockId;
    if (!targetFlockId) {
      // Pega o primeiro flock ativo
      const { data: activeFlocks } = await supabaseAdmin
        .from("Flock")
        .select("id, Barn!inner(Farm!inner(companyId))")
        .eq("status", "ACTIVE")
        .eq("Barn.Farm.companyId", userData.companyId)
        .order("createdAt", { ascending: false })
        .limit(1);

      if (!activeFlocks || activeFlocks.length === 0) {
        return { error: "Nenhum lote ativo encontrado para gerar o gráfico." };
      }
      targetFlockId = activeFlocks[0].id;
    }

    const { data: flock, error } = await supabaseAdmin
      .from("Flock")
      .select("id, name, breed, housingDate, WeightLog(date, ageInDays, averageWeight, sampleSize), Barn(name, Farm(name, companyId))")
      .eq("id", targetFlockId)
      .single();

    if (error || !flock) throw new Error("Lote não encontrado");

    // Segurança contra cross-tenant se flockId for manipulado
    const barn: any = Array.isArray(flock.Barn) ? flock.Barn[0] : flock.Barn;
    const farm: any = barn ? (Array.isArray(barn.Farm) ? barn.Farm[0] : barn.Farm) : null;
    if (farm?.companyId !== userData.companyId) throw new Error("Acesso negado");

    const weightLogs = (flock.WeightLog || []).sort((a: any, b: any) => a.ageInDays - b.ageInDays);
    
    let ageInDays = 0;
    if (weightLogs.length > 0) {
      ageInDays = weightLogs[weightLogs.length - 1].ageInDays;
    } else {
       const msDiff = new Date().getTime() - new Date(flock.housingDate || new Date()).getTime();
       ageInDays = Math.floor(msDiff / (1000 * 60 * 60 * 24));
       if (ageInDays < 0) ageInDays = 0;
    }

    const points = [];
    let bestGain = null;
    let worstGain = null;
    let sumGpd = 0;
    let prevWeight = 0; // Starts from 0 or ~40g, let's assume 40g housing weight for GPD math
    const HOUSING_WEIGHT = 40; 
    let lastAge = 0;

    for (let i = 0; i < weightLogs.length; i++) {
       const log = weightLogs[i];
       const currentWeight = log.averageWeight;
       const weightDiff = currentWeight - (i === 0 ? HOUSING_WEIGHT : prevWeight);
       const daysDiff = log.ageInDays - (i === 0 ? 0 : lastAge);
       
       let gpd = 0;
       if (daysDiff > 0) gpd = Math.round(weightDiff / daysDiff);

       points.push({
         day: log.ageInDays,
         date: new Date(log.date).toLocaleDateString("pt-BR"),
         weight: currentWeight,
         gpd,
         sampleSize: log.sampleSize || 0
       });

       if (!bestGain || gpd > bestGain.gpd) bestGain = { day: log.ageInDays, gpd };
       if (!worstGain || gpd < worstGain.gpd) worstGain = { day: log.ageInDays, gpd };
       
       sumGpd += gpd;
       prevWeight = currentWeight;
       lastAge = log.ageInDays;
    }

    const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].averageWeight : 0;
    const averageGpd = points.length > 0 ? Math.round(sumGpd / points.length) : null;

    return {
      data: {
        flock: {
          id: flock.id,
          name: flock.name,
          barnName: barn?.name || "Desconhecido",
          farmName: farm?.name || "Desconhecida",
          breed: flock.breed
        },
        ageInDays,
        currentWeight,
        totalWeighings: points.length,
        bestGain,
        worstGain,
        averageGpd,
        points
      }
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
export interface SanitaryTimelineEvent {
  id: string;
  type: "VACCINATION" | "VISIT" | "AUDIT" | "MEDICATION";
  date: string;
  title: string;
  details: Record<string, any>;
  status: "OK" | "ALERT" | "PENDING";
  notes?: string;
}

export interface SanitaryHistoryData {
  totalVaccinations: number;
  totalVisits: number;
  totalAudits: number;
  lastAuditScore: number | null;
  complianceStatus: "CONFORME" | "PENDENTE" | "NAO_CONFORME";
  timeline: SanitaryTimelineEvent[];
  teamMembers: { name: string; role: string }[];
  pnsaChecklist: { item: string; ok: boolean }[];
}

export async function getReportSanitaryHistory(flockId?: string) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabaseClient = createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: userData } = await supabaseAdmin
      .from("User")
      .select("companyId")
      .eq("authId", user.id)
      .single();

    if (!userData) return { error: "Usuário não encontrado" };

    let targetFlockId = flockId;
    if (!targetFlockId) {
      // Pega o primeiro flock ativo
      const { data: activeFlocks } = await supabaseAdmin
        .from("Flock")
        .select("id, Barn!inner(Farm!inner(companyId))")
        .eq("status", "ACTIVE")
        .eq("Barn.Farm.companyId", userData.companyId)
        .order("createdAt", { ascending: false })
        .limit(1);

      if (!activeFlocks || activeFlocks.length === 0) {
        return { error: "Nenhum lote ativo encontrado para a granja." };
      }
      targetFlockId = activeFlocks[0].id;
    }

    const { data: flock, error } = await supabaseAdmin
      .from("Flock")
      .select(`
        id, 
        name, 
        Barn(id, farmId, Farm(id, companyId, PnsaAudit(*))),
        VaccineLog(*),
        VisitLog(*),
        MedicationLog(*)
      `)
      .eq("id", targetFlockId)
      .single();

    if (error || !flock) throw new Error("Lote não encontrado");

    const barn: any = Array.isArray(flock.Barn) ? flock.Barn[0] : flock.Barn;
    const farm: any = barn ? (Array.isArray(barn.Farm) ? barn.Farm[0] : barn.Farm) : null;
    if (farm?.companyId !== userData.companyId) throw new Error("Acesso negado");

    const vaccines = flock.VaccineLog || [];
    const visits = flock.VisitLog || [];
    const medications = flock.MedicationLog || [];
    const audits = farm?.PnsaAudit || [];

    const timeline: SanitaryTimelineEvent[] = [];

    vaccines.forEach((v: any) => {
      timeline.push({
        id: v.id,
        type: "VACCINATION",
        date: new Date(v.date).toISOString(),
        title: v.vaccineName,
        details: { Método: v.method, Responsável: v.appliedBy || "Equipe" },
        status: "OK",
        notes: "Vacinação registrada no diário do lote."
      });
    });

    visits.forEach((v: any) => {
      timeline.push({
        id: v.id,
        type: "VISIT",
        date: new Date(v.date).toISOString(),
        title: "Registro de Visita",
        details: { Veterinário: v.veterinarian },
        status: v.report?.toLowerCase().includes("problema") || v.report?.toLowerCase().includes("alerta") ? "ALERT" : "OK",
        notes: v.report
      });
    });

    medications.forEach((m: any) => {
       timeline.push({
         id: m.id,
         type: "MEDICATION",
         date: new Date(m.date).toISOString(),
         title: m.medicationName,
         details: { Dosagem: m.dosage, Método: m.method, Motivo: m.reason || "Tratamento" },
         status: "OK",
         notes: m.withdrawalDays ? `Carência: ${m.withdrawalDays} dias` : undefined
       });
    });

    audits.forEach((a: any) => {
      timeline.push({
        id: a.id,
        type: "AUDIT",
        date: new Date(a.visitDate).toISOString(),
        title: "Auditoria PNSA",
        details: { Auditor: a.auditor, Nota: `${a.complianceScore}%` },
        status: a.complianceScore >= 90 ? "OK" : "ALERT",
        notes: a.notes || undefined
      });
    });

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const lastAuditScore = audits.length > 0 
      ? audits.sort((a: any, b: any) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())[0].complianceScore 
      : null;

    let complianceStatus: SanitaryHistoryData["complianceStatus"] = "PENDENTE";
    if (lastAuditScore !== null) {
       complianceStatus = lastAuditScore >= 90 ? "CONFORME" : "NAO_CONFORME";
    }

    // Identificar membros da equipe (Veterinários de visitas + Aplicadores)
    const teamSet = new Set<string>();
    const teamMembers: {name: string; role: string}[] = [];
    
    visits.forEach((v: any) => {
      if (v.veterinarian && !teamSet.has(v.veterinarian)) {
        teamSet.add(v.veterinarian);
        teamMembers.push({ name: v.veterinarian, role: "Veterinário RT" });
      }
    });

    vaccines.forEach((v: any) => {
      if (v.appliedBy && !teamSet.has(v.appliedBy)) {
        teamSet.add(v.appliedBy);
        teamMembers.push({ name: v.appliedBy, role: "Operador Sanitário" });
      }
    });

    return {
      data: {
        totalVaccinations: vaccines.length,
        totalVisits: visits.length,
        totalAudits: audits.length,
        lastAuditScore,
        complianceStatus,
        timeline,
        teamMembers,
        pnsaChecklist: [
          { item: "Vacinação Atualizada", ok: vaccines.length > 0 },
          { item: "Supervisão Técnica Ativa", ok: visits.length > 0 },
          { item: "Auditoria Recente", ok: audits.length > 0 }
        ]
      }
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
export async function getActiveFlocksForReport() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabaseClient = createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: userData } = await supabaseAdmin
      .from("User")
      .select("companyId")
      .eq("authId", user.id)
      .single();

    if (!userData) return { error: "Usuário não encontrado" };

    const { data: flocks, error } = await supabaseAdmin
      .from("Flock")
      .select("id, name, status, breed, Barn(name, Farm(companyId, name))")
      .eq("status", "ACTIVE")
      .order("createdAt", { ascending: false });

    if (error) throw error;

    // Filter logic manual porque o Prisma tem facilidade com nested where mas o supabase-js puro tem limites em joins textuais
    const mappedFlocks = (flocks || [])
      .filter((f: any) => {
         const barn = Array.isArray(f.Barn) ? f.Barn[0] : f.Barn;
         const farm = barn ? (Array.isArray(barn.Farm) ? barn.Farm[0] : barn.Farm) : null;
         return farm?.companyId === userData.companyId;
      })
      .map((f: any) => {
         const barn = Array.isArray(f.Barn) ? f.Barn[0] : f.Barn;
         const farm = barn ? (Array.isArray(barn.Farm) ? barn.Farm[0] : barn.Farm) : null;
         return {
            id: f.id,
            name: f.name,
            status: f.status,
            breed: f.breed,
            barnName: barn?.name || "Sem Galpão",
            farmName: farm?.name || "Sem Granja",
         };
      });

    return { flocks: mappedFlocks };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getFlocksByCompany() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabaseClient = createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: userData } = await supabaseAdmin
      .from("User")
      .select("companyId")
      .eq("authId", user.id)
      .single();

    if (!userData) return { error: "Usuário não encontrado" };

    const { data: flocks, error } = await supabaseAdmin
      .from("Flock")
      .select("id, name, status, breed, Barn(name, Farm(companyId, name))")
      .order("createdAt", { ascending: false });

    if (error) throw error;

    const mappedFlocks = (flocks || [])
      .filter((f: any) => {
         const barn = Array.isArray(f.Barn) ? f.Barn[0] : f.Barn;
         const farm = barn ? (Array.isArray(barn.Farm) ? barn.Farm[0] : barn.Farm) : null;
         return farm?.companyId === userData.companyId;
      })
      .map((f: any) => {
         const barn = Array.isArray(f.Barn) ? f.Barn[0] : f.Barn;
         const farm = barn ? (Array.isArray(barn.Farm) ? barn.Farm[0] : barn.Farm) : null;
         return {
            id: f.id,
            name: f.name,
            status: f.status,
            breed: f.breed,
            barnName: barn?.name || "Sem Galpão",
            farmName: farm?.name || "Sem Granja",
         };
      });

    return { flocks: mappedFlocks };
  } catch (err: any) {
    return { error: err.message };
  }
}
