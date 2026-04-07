"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Loader2,
  FileWarning,
  Package,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toast } from "sonner";
import {
  getReportMovements,
  type MovementsReportData,
} from "@/app/actions/relatorios";

export default function W51GiroInsumosPage() {
  const [data, setData] = useState<MovementsReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReportMovements();
      if (result.error) { setError(result.error); setData(null); }
      else { setData(result.data); }
    } catch { setError("Erro inesperado."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExportPDF = () => {
    toast.loading("Gerando PDF...", { id: "pdf" });
    setTimeout(() => { window.print(); toast.success("PDF pronto!", { id: "pdf" }); }, 300);
  };

  // ===================== EMPTY STATE =====================
  if (!loading && (error || !data)) {
    return (
      <main className="flex-1 px-8 py-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full overflow-y-auto custom-scrollbar">
        <Link href="/relatorios" className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm mb-6">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#833C46]/10 flex items-center justify-center mb-6">
            <FileWarning className="w-8 h-8 text-[#833C46]" />
          </div>
          <h2 className="text-xl font-extrabold text-[#0D2E1A] mb-2">Sem dados de movimentação</h2>
          <p className="text-sm text-outline max-w-sm">{error || "Nenhuma movimentação registrada."}</p>
        </div>
      </main>
    );
  }

  // ===================== LOADING =====================
  if (loading) {
    return (
      <main className="flex-1 px-8 py-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full overflow-y-auto custom-scrollbar flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#1A5E35] animate-spin" />
          <p className="text-sm font-bold text-outline">Carregando movimentações...</p>
        </div>
      </main>
    );
  }

  // ===================== DADOS =====================
  const { totalIn, totalOut, totalMovements, movements, topMoved, emissionDate } = data!;
  const saldo = totalIn - totalOut;

  // Dados para gráfico: agrupar movimentações por mês
  const monthMap = new Map<string, { entradas: number; saidas: number }>();
  movements.forEach((m) => {
    // date is in pt-BR format "dd/mm/yyyy"
    const parts = m.date.split("/");
    const monthKey = `${parts[1]}/${parts[2]}`; // MM/YYYY
    const existing = monthMap.get(monthKey) || { entradas: 0, saidas: 0 };
    if (m.type === "IN") existing.entradas += m.quantity;
    else existing.saidas += m.quantity;
    monthMap.set(monthKey, existing);
  });

  const MONTH_NAMES: Record<string, string> = {
    "01": "JAN", "02": "FEV", "03": "MAR", "04": "ABR",
    "05": "MAI", "06": "JUN", "07": "JUL", "08": "AGO",
    "09": "SET", "10": "OUT", "11": "NOV", "12": "DEZ",
  };

  const chartData = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, val]) => ({
      name: MONTH_NAMES[key.split("/")[0]] || key,
      entradas: val.entradas,
      saidas: val.saidas,
    }));

  return (
    <main className="flex-1 px-8 py-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full overflow-y-auto custom-scrollbar print:bg-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 border-b border-outline-variant/30 pb-6">
        <div>
          <Link href="/relatorios" className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm mb-4 print:hidden">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Link>
          <h1 className="text-3xl font-extrabold text-[#0D2E1A] tracking-tight mb-2">Relatório de Movimentação</h1>
          <p className="text-outline text-sm font-medium w-full max-w-xl leading-relaxed">
            Análise detalhada do fluxo de entrada e saída de materiais. Emitido em {emissionDate}.
          </p>
        </div>
        <div className="flex flex-col justify-end pt-5 print:hidden">
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-5 py-2.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-xl transition-all shadow-md h-[38px]">
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Entradas */}
        <div className="bg-white rounded-2xl p-6 border-b-4 border-b-[#1A5E35] border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#1A5E35]/10 flex items-center justify-center text-[#1A5E35]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest block mb-2">Total de Entradas</span>
            <span className="text-3xl font-extrabold text-[#0D2E1A] block">{totalIn.toLocaleString("pt-BR")}</span>
          </div>
        </div>

        {/* Saídas */}
        <div className="bg-white rounded-2xl p-6 border-b-4 border-b-[#833C46] border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#833C46]/10 flex items-center justify-center text-[#833C46]">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest block mb-2">Total de Saídas</span>
            <span className="text-3xl font-extrabold text-[#0D2E1A] block">{totalOut.toLocaleString("pt-BR")}</span>
          </div>
        </div>

        {/* Saldo */}
        <div className="bg-white rounded-2xl p-6 border-b-4 border-b-[#8C9A9E] border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-outline">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest block mb-2">Saldo do Período</span>
            <span className={`text-3xl font-extrabold block ${saldo >= 0 ? "text-[#1A5E35]" : "text-[#833C46]"}`}>
              {saldo >= 0 ? "+" : ""}{saldo.toLocaleString("pt-BR")}
            </span>
          </div>
        </div>

        {/* N Movimentações */}
        <div className="bg-white rounded-2xl p-6 border-b-4 border-b-[#8C9A9E] border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-outline">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest block mb-2">Nº de Movimentações</span>
            <span className="text-3xl font-extrabold text-[#0D2E1A] block">{totalMovements}</span>
          </div>
        </div>
      </div>

      {/* Chart + Top Moved */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Bar Chart */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-8">
          <h3 className="text-xl font-bold text-[#0D2E1A] mb-8">Entradas vs Saídas por Mês</h3>
          {chartData.length > 0 ? (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C9A9E', fontSize: 11, fontWeight: 700 }} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C9A9E', fontSize: 11, fontWeight: 600 }} />
                  <RechartsTooltip
                    cursor={{ fill: '#F8F9FA' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ top: -30, fontSize: '12px', fontWeight: 'bold', color: '#0D2E1A' }} />
                  <Bar dataKey="entradas" name="Entradas" fill="#1A5E35" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="saidas" name="Saídas" fill="#833C46" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[320px] flex items-center justify-center">
              <p className="text-sm font-bold text-outline">Sem dados para o gráfico</p>
            </div>
          )}
        </div>

        {/* Top Moved */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-8 flex flex-col">
          <h3 className="text-xl font-bold text-[#0D2E1A] mb-1">Produtos mais movimentados</h3>
          <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest block mb-6">Baseado no volume de saídas</span>
          {topMoved.length > 0 ? (
            <div className="flex-1 flex flex-col justify-center space-y-6">
              {topMoved.map((item, i) => {
                const maxQty = topMoved[0].totalQty;
                const pct = maxQty > 0 ? (item.totalQty / maxQty) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-bold text-[#1A5E35]">{item.name}</span>
                      <span className="text-sm font-medium text-outline">{item.totalQty.toLocaleString("pt-BR")} {item.unit}</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-[#1A5E35] rounded-full transition-all" style={{ width: `${Math.max(pct, 5)}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm font-bold text-outline">Nenhuma saída registrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Movimentações */}
      <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-6 overflow-hidden">
        <h2 className="text-xl font-bold text-[#0D2E1A] mb-6">Movimentações do Período</h2>

        {movements.length > 0 ? (
          <div className="w-full overflow-x-auto custom-scrollbar">
            <div className="min-w-[900px]">
              {/* Headers */}
              <div className="grid grid-cols-12 gap-4 pb-3 border-b border-outline-variant/30 text-[10px] font-extrabold text-outline uppercase tracking-widest px-2">
                <div className="col-span-1">Data</div>
                <div className="col-span-3">Produto</div>
                <div className="col-span-2">Categoria</div>
                <div className="col-span-2 text-center">Tipo</div>
                <div className="col-span-2 text-center">Quantidade</div>
                <div className="col-span-2">Motivo</div>
              </div>
              {movements.slice(0, 50).map((m) => (
                <div key={m.id} className="grid grid-cols-12 gap-4 py-4 px-2 border-b border-outline-variant/10 items-center hover:bg-surface-container/50 transition-colors">
                  <div className="col-span-1">
                    <span className="text-sm font-bold text-[#0D2E1A]">{m.date}</span>
                  </div>
                  <div className="col-span-3">
                    <span className={`text-sm font-bold block ${m.type === "IN" ? "text-[#1A5E35]" : "text-[#833C46]"}`}>{m.itemName}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs font-medium text-outline">{m.category}</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`inline-block px-3 py-1 text-white text-[10px] font-extrabold rounded-md uppercase tracking-widest ${m.type === "IN" ? "bg-[#1A5E35]" : "bg-[#833C46]"}`}>
                      {m.type === "IN" ? "Entrada" : "Saída"}
                    </span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-medium text-[#0D2E1A]">{m.quantity.toLocaleString("pt-BR")} {m.unit}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs font-medium text-outline">{m.reason || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <ArrowRightLeft className="w-12 h-12 text-outline-variant/40 mb-4" />
            <p className="text-sm font-bold text-outline">Nenhuma movimentação registrada</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 py-6 px-2 border-t border-outline-variant/20 flex justify-between items-center text-[9px] font-extrabold text-outline uppercase tracking-widest">
        <span>Avicultura — Relatório de Movimentação • {emissionDate}</span>
        <span className="text-[#833C46]">Confidencial</span>
      </div>
    </main>
  );
}
