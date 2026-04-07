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

    if (error || !flock) throw new Error("Lote não encontrado");

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

