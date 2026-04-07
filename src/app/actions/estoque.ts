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

export interface EstoqueKPIs {
  totalRacaoKg: number;
  totalMedicamentos: number;
  totalVacinas: number;
  racaoFaseInicialPercent: number;
  racaoFaseEngordaPercent: number;
  alerts: { title: string; description: string; severity: "high" | "medium" | "low" }[];
}

export interface TendenciaPoint {
  date: string;
  label: string;
  Ração: number;
  Medicamentos: number;
  Vacinas: number;
}

export interface MovementRow {
  id: string;
  itemName: string;
  category: string;
  type: "IN" | "OUT";
  quantity: number;
  unit: string;
  date: string;
}

export interface EstoqueDashboardData {
  farmName: string;
  kpis: EstoqueKPIs;
  tendenciaChart: TendenciaPoint[];
  lastMovements: MovementRow[];
  criticalItems: { id: string, name: string, quantity: number, minQuantity: number, unit: string, category: string }[];
}

export async function getEstoqueDashboardData(
  farmId: string,
  days: number = 7
): Promise<{ data: EstoqueDashboardData | null; error?: string }> {
  try {
    // 1. Fetch Farm
    const { data: farm } = await supabaseAdmin
      .from("Farm")
      .select("name")
      .eq("id", farmId)
      .single();

    if (!farm) return { data: null, error: "Granja não encontrada." };

    // 2. Fetch everything related to Stock Items for this farm
    const { data: stockItems } = await supabaseAdmin
      .from("StockItem")
      .select("*")
      .eq("farmId", farmId);

    const items = stockItems || [];
    const itemIds = items.map((i) => i.id);

    // 3. Get movements
    let allMovements: any[] = [];
    if (itemIds.length > 0) {
       const { data: movements } = await supabaseAdmin
         .from("StockMovement")
         .select("*")
         .in("itemId", itemIds)
         .order("date", { ascending: false });
       allMovements = movements || [];
    }

    // 4. Calculate KPIs grouped by category
    let totalRacaoKg = 0;
    let totalMedicamentos = 0;
    let totalVacinas = 0;
    const alerts: EstoqueKPIs["alerts"] = [];
    const criticalItems: { id: string, name: string, quantity: number, minQuantity: number, unit: string, category: string }[] = [];

    items.forEach((item) => {
        const cat = item.category.toLowerCase();
        if (cat.includes("ração") || cat.includes("racao")) {
           totalRacaoKg += item.quantity;
        } else if (cat.includes("medicamento")) {
           totalMedicamentos += item.quantity;
        } else if (cat.includes("vacina")) {
           totalVacinas += item.quantity;
        }

        // Check alerts
        if (item.minQuantity !== null && item.quantity <= item.minQuantity) {
            alerts.push({
                title: `${item.name} — Estoque baixo`,
                description: `Apenas ${item.quantity} ${item.unit} restante(s).`,
                severity: item.quantity === 0 ? "high" : "medium",
            });
            criticalItems.push({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                minQuantity: item.minQuantity,
                unit: item.unit,
                category: item.category
            });
        }
    });

    // Cálculo real de ração por fase com base no nome/categoria dos itens
    let racaoInicialKg = 0;
    let racaoEngordaKg = 0;
    items.forEach((item) => {
      const name = (item.name || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const isRacao = cat.includes("ração") || cat.includes("racao");
      if (!isRacao) return;
      if (name.includes("inicial") || name.includes("pré") || name.includes("pre")) {
        racaoInicialKg += item.quantity;
      } else if (name.includes("engorda") || name.includes("crescimento") || name.includes("terminação") || name.includes("terminacao") || name.includes("final")) {
        racaoEngordaKg += item.quantity;
      }
    });
    const racaoFaseInicialPercent = totalRacaoKg > 0 ? Math.round((racaoInicialKg / totalRacaoKg) * 100) : 0;
    const racaoFaseEngordaPercent = totalRacaoKg > 0 ? Math.round((racaoEngordaKg / totalRacaoKg) * 100) : 0;

    // 5. Chart Data
    const chartStartDate = new Date();
    chartStartDate.setDate(chartStartDate.getDate() - days + 1);
    const tendenciaChart: TendenciaPoint[] = [];

    for (let i = 0; i < days; i++) {
        const d = new Date(chartStartDate);
        d.setDate(d.getDate() + i);
        const dStr = d.toISOString().split("T")[0];

        let racaoOut = 0;
        let medOut = 0;
        let vacOut = 0;

        const dayMoves = allMovements.filter(m => m.type === "OUT" && m.date.startsWith(dStr));
        
        dayMoves.forEach(m => {
            const item = items.find(it => it.id === m.itemId);
            if (!item) return;
            const cat = item.category.toLowerCase();
            if (cat.includes("ração") || cat.includes("racao")) racaoOut += m.quantity;
            else if (cat.includes("medicamento")) medOut += m.quantity;
            else if (cat.includes("vacina")) vacOut += m.quantity;
        });

        // Date String Formatting
        let label = d.toLocaleDateString("pt-BR", { weekday: "short" }).toUpperCase();
        if (days > 7) label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

        tendenciaChart.push({
            date: dStr,
            label,
            Ração: racaoOut,
            Medicamentos: medOut,
            Vacinas: vacOut
        });
    }

    // 6. Last Entries
    const lastMovements: MovementRow[] = allMovements.slice(0, 5).map(m => {
        const item = items.find(it => it.id === m.itemId);
        return {
            id: m.id,
            itemName: item?.name || "Desconhecido",
            category: item?.category || "",
            type: m.type as "IN" | "OUT",
            quantity: m.quantity,
            unit: item?.unit || "",
            date: m.date
        };
    });

    return {
      data: {
        farmName: farm.name,
        kpis: {
          totalRacaoKg,
          totalMedicamentos,
          totalVacinas,
          racaoFaseInicialPercent,
          racaoFaseEngordaPercent,
          alerts
        },
        tendenciaChart,
        lastMovements,
        criticalItems
      }
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("getEstoqueDashboardData error:", msg);
    return { data: null, error: msg };
  }
}

// ------------------------------------------------------------------
// GERENCIAR PRODUTOS (W-24 e W-27)
// ------------------------------------------------------------------

export async function getStockItems(farmId: string) {
  const companyId = await getUserCompanyId();
  if (!companyId) return { error: "Sem permissão" };

  // Verifica se a granja pertence a company
  const { data: farm, error: farmErr } = await supabaseAdmin
    .from("Farm")
    .select("id")
    .eq("id", farmId)
    .eq("companyId", companyId)
    .single();

  if (farmErr || !farm) return { error: "Granja não encontrada ou sem permissão" };

  const { data, error } = await supabaseAdmin
    .from("StockItem")
    .select("*")
    .eq("farmId", farmId)
    .order("name", { ascending: true });

  if (error) return { error: error.message };

  return { items: data };
}

export async function saveStockItem(payload: {
  id?: string;
  farmId: string;
  name: string;
  category: string;
  unit: string;
  minQuantity: number;
  initialQuantity?: number;
}) {
  const companyId = await getUserCompanyId();
  if (!companyId) return { error: "Sem permissão" };

  const { data: farm } = await supabaseAdmin
    .from("Farm")
    .select("id")
    .eq("id", payload.farmId)
    .eq("companyId", companyId)
    .single();

  if (!farm) return { error: "Granja inválida para o seu usuário" };

  let result;
  if (payload.id) {
    // Update
    const { data, error } = await supabaseAdmin
      .from("StockItem")
      .update({
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        minQuantity: payload.minQuantity,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", payload.id)
      .eq("farmId", payload.farmId)
      .select()
      .single();
    
    if (error) return { error: error.message };
    result = data;
  } else {
    // Create
    const newId = crypto.randomUUID();
    const { data, error } = await supabaseAdmin
      .from("StockItem")
      .insert([
        {
          id: newId,
          farmId: payload.farmId,
          name: payload.name,
          category: payload.category,
          unit: payload.unit,
          quantity: payload.initialQuantity || 0,
          minQuantity: payload.minQuantity,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ])
      .select()
      .single();
      
    if (error) return { error: error.message };
    result = data;

    if (payload.initialQuantity && payload.initialQuantity > 0) {
       await supabaseAdmin.from("StockMovement").insert({
          id: crypto.randomUUID(),
          itemId: newId,
          type: "IN",
          quantity: payload.initialQuantity,
          reason: "Cadastramento Inicial",
          date: new Date().toISOString(),
          createdAt: new Date().toISOString()
       });
    }
  }

  revalidatePath("/estoque/itens");
  return { success: true, item: result };
}

// ------------------------------------------------------------------
// ENTRADA DE ESTOQUE (W-25) E SYNC (OFFLINE)
// ------------------------------------------------------------------

export async function syncStockMovements(records: any[]) {
  const companyId = await getUserCompanyId();
  if (!companyId) return { error: "Sem permissão" };

  if (!records || records.length === 0) return { success: true, syncedIds: [] };

  const syncedSyncIds: string[] = [];

  for (const record of records) {
    // Primeiro verificamos se item pertence à granja que pertence à company
    const { data: item } = await supabaseAdmin
      .from("StockItem")
      .select("id, quantity, farm:Farm!inner(companyId)")
      .eq("id", record.itemId)
      .eq("farm.companyId", companyId)
      .single();

    if (!item) {
      console.error(`Item ${record.itemId} inválido ou não peretence à empresa.`);
      continue;
    }

    // Como pode ter concorrência, não vamos usar update via prisma transaction de forma fácil com RPC.
    // Usaremos upsert do movimento. Mas precisamos incrementar a quantity do item atomicamente se o syncId não existir ainda.
    
    // Verifica se movement já existe
    const { data: existMove } = await supabaseAdmin
      .from("StockMovement")
      .select("id")
      .eq("id", record.syncId)
      .maybeSingle();

    if (existMove) {
      // Já sincronizado
      syncedSyncIds.push(record.syncId);
      continue;
    }

    // Busca o userId do usuário logado para rastreabilidade
    let userId: string | null = null;
    try {
      const { data: dbUser } = await supabaseAdmin
        .from("User")
        .select("id")
        .eq("companyId", companyId)
        .limit(1)
        .single();
      userId = dbUser?.id || null;
    } catch { /* sem userId — registro legado */ }

    const movePayload = {
      id: record.syncId, // Aproveita o syncId do offline para ser a primary key
      itemId: record.itemId,
      type: record.type,
      quantity: record.quantity,
      reason: record.reason,
      date: record.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      userId,
    };

    const { error: insertErr } = await supabaseAdmin
      .from("StockMovement")
      .insert(movePayload);
      
    if (!insertErr) {
      // Incrementa / Decrementa na tabela Item
      const modifier = record.type === "IN" ? record.quantity : -record.quantity;
      const { error: updErr } = await supabaseAdmin.rpc("increment_stock", {
        p_item_id: record.itemId,
        p_amount: modifier
      });

      if (!updErr) {
        syncedSyncIds.push(record.syncId);
      } else {
         // Fallback se n ter RPC increment_stock
         const { error: updFallbackErr } = await supabaseAdmin
           .from("StockItem")
           .update({ quantity: (item.quantity || 0) + modifier })
           .eq("id", record.itemId);
           
         if(!updFallbackErr) syncedSyncIds.push(record.syncId);
      }
    } else {
      console.error("Erro no insert (StockMovement):", insertErr);
    }
  }

  if (syncedSyncIds.length > 0) {
    revalidatePath("/estoque");
    revalidatePath("/estoque/itens");
    revalidatePath("/estoque/entrada");
  }

  return { success: true, syncedIds: syncedSyncIds };
}

// ------------------------------------------------------------------
// HISTÓRICO DE MOVIMENTAÇÕES (W-26)
// ------------------------------------------------------------------

export async function getStockHistory(farmId: string, days: number = 30, productId?: string) {
  const companyId = await getUserCompanyId();
  if (!companyId) return { error: "Sem permissão" };

  // Verifica se a granja pertence a company
  const { data: farm, error: farmErr } = await supabaseAdmin
    .from("Farm")
    .select("id")
    .eq("id", farmId)
    .eq("companyId", companyId)
    .single();

  if (farmErr || !farm) return { error: "Granja não encontrada ou sem permissão" };

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - days);

  // Fetch Items to get names and map
  let itemsQuery = supabaseAdmin.from("StockItem").select("*").eq("farmId", farmId);
  if (productId && productId !== "all") {
    itemsQuery = itemsQuery.eq("id", productId);
  }
  const { data: items, error: itemsErr } = await itemsQuery;
  if (itemsErr || !items) return { error: itemsErr?.message };

  const itemIds = items.map(i => i.id);

  // If no items, return empty
  if (itemIds.length === 0) {
    return { kpis: { saldoAtual: 0, entradasMes: 0, saidasMes: 0, giro: "0.0x" }, items: [], movements: [] };
  }

  // Fetch Movements for the items, in the period (inclui userId para rastrear responsável)
  const { data: movements, error: movementsErr } = await supabaseAdmin
    .from("StockMovement")
    .select("*, User:userId(name)")
    .in("itemId", itemIds)
    .gte("date", thresholdDate.toISOString())
    .order("date", { ascending: false });

  if (movementsErr) return { error: movementsErr.message };

  // Calculate KPIs
  // 1. Saldo Atual
  const totalSaldoAtual = items.reduce((acc, item) => acc + item.quantity, 0);
  
  // 2. Entradas and Saídas in the period
  let totalEntradas = 0;
  let totalSaidas = 0;
  movements.forEach(m => {
    if (m.type === "IN") {
      totalEntradas += m.quantity;
    } else {
      totalSaidas += m.quantity;
    }
  });

  const giro = totalSaldoAtual > 0 ? (totalEntradas / totalSaldoAtual).toFixed(1) : "0.0";

  return {
    kpis: {
      saldoAtual: totalSaldoAtual,
      entradasMes: totalEntradas,
      saidasMes: totalSaidas,
      giro: giro + "x"
    },
    items,
    movements: movements.map(m => {
      const item = items.find(i => i.id === m.itemId);
      return {
        id: m.id,
        date: m.date,
        produto: item?.name || "Desconhecido",
        category: item?.category || "",
        tipo: (m.type === "IN" ? "ENTRADA" : "SAÍDA") as "ENTRADA" | "SAÍDA",
        quantidade: m.quantity,
        formattedQuantity: (m.type === "IN" ? "+ " : "- ") + m.quantity.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        unit: item?.unit || "",
        responsavel: (m as any).User?.name || "Registro automático"
      };
    })
  };
}
