"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  Pill,
  DollarSign,
  TrendingUp,
  ClipboardList,
  Loader2,
  FileWarning,
  ChevronDown,
  AlertTriangle,
  Clock
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { toast } from "sonner";
import {
  getReportMedication,
  getActiveFlocksForReport,
  type MedicationReportData
} from "@/app/actions/relatorios";

const COLORS = ["#1A5E35", "#637D68", "#833C46", "#208b8b", "#B8860B", "#4A6FA5", "#8C9A9E"];

export default function W48ConsumoMedicamentosPage() {
  const [data, setData] = useState<MedicationReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flocks, setFlocks] = useState<{ id: string; name: string; barnName: string; farmName: string; status: string }[]>([]);
  const [selectedFlockId, setSelectedFlockId] = useState<string | undefined>(undefined);
  const [showFlockDropdown, setShowFlockDropdown] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (flockId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReportMedication(flockId);
      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data);
      }
    } catch {
      setError("Erro inesperado ao carregar relatório.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const flocksResult = await getActiveFlocksForReport();
      if (flocksResult.flocks) setFlocks(flocksResult.flocks);
      await fetchData();
    })();
  }, [fetchData]);

  const handleFlockChange = async (flockId: string) => {
    setSelectedFlockId(flockId);
    setShowFlockDropdown(false);
    await fetchData(flockId);
  };

  const handleShowAll = async () => {
    setSelectedFlockId(undefined);
    setShowFlockDropdown(false);
    await fetchData(undefined);
  };

  const handleDownload = () => {
    toast.loading("Gerando PDF...", { id: "pdf" });
    setTimeout(() => {
      window.print();
      toast.success("PDF pronto para impressão!", { id: "pdf" });
    }, 300);
  };

  // ===================== EMPTY STATE =====================
  if (!loading && (error || !data)) {
    return (
      <main className="flex-1 px-8 py-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full overflow-y-auto custom-scrollbar">
        <Link
          href="/relatorios"
          className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#833C46]/10 flex items-center justify-center mb-6">
            <FileWarning className="w-8 h-8 text-[#833C46]" />
          </div>
          <h2 className="text-xl font-extrabold text-[#0D2E1A] mb-2">Sem dados suficientes</h2>
          <p className="text-sm text-outline max-w-sm">
            {error || "Não há registros de medicamentos para gerar este relatório. Registre tratamentos na seção de Sanidade primeiro."}
          </p>
        </div>
      </main>
    );
  }

  // ===================== LOADING STATE =====================
  if (loading) {
    return (
      <main className="flex-1 px-8 py-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full overflow-y-auto custom-scrollbar flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#1A5E35] animate-spin" />
          <p className="text-sm font-bold text-outline">Carregando relatório de medicamentos...</p>
        </div>
      </main>
    );
  }

  // ===================== DADOS PRONTOS =====================
  const {
    totalRecords,
    totalCost,
    costPerBird,
    uniqueMedications,
    topProduct,
    rows,
    byMedication,
    byReason
  } = data!;

  // Chart data for cost by medication
  const chartData = byMedication.map((m, idx) => ({
    name: m.name.length > 18 ? m.name.slice(0, 16) + "…" : m.name,
    custo: m.totalCost,
    color: COLORS[idx % COLORS.length],
  }));

  return (
    <main
      ref={reportRef}
      className="flex-1 px-8 py-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full overflow-y-auto custom-scrollbar print:bg-white print:px-4"
    >
      {/* ==================== HEADER ==================== */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <Link
            href="/relatorios"
            className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm mb-4 print:hidden"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Link>
          <h1 className="text-3xl font-extrabold text-[#0D2E1A] tracking-tight mb-2">
            Consumo de Medicamentos
          </h1>
          <p className="text-outline text-sm font-medium w-full max-w-xl leading-relaxed">
            Análise detalhada de custos e tratamentos aplicados • Rastreabilidade PNSA
          </p>

          {/* Seletor de Lote */}
          <div className="relative mt-3 print:hidden">
            <button
              onClick={() => setShowFlockDropdown(!showFlockDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant/30 rounded-xl text-sm font-bold text-[#0D2E1A] hover:bg-outline-variant/20 transition-all"
            >
              {selectedFlockId
                ? `Lote: ${flocks.find((f) => f.id === selectedFlockId)?.name || "..."}`
                : "Todos os lotes"}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showFlockDropdown && (
              <div className="absolute top-12 left-0 w-80 bg-white border border-outline-variant/30 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto custom-scrollbar">
                <button
                  onClick={handleShowAll}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-surface-container transition-colors border-b border-outline-variant/10 ${!selectedFlockId ? "bg-[#E1EEDE] font-bold" : "font-medium"}`}
                >
                  <span className="block text-[#0D2E1A] font-bold">Todos os lotes</span>
                  <span className="text-xs text-outline">Exibir medicamentos de todos os lotes</span>
                </button>
                {flocks.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleFlockChange(f.id)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-surface-container transition-colors border-b border-outline-variant/10 last:border-b-0 ${selectedFlockId === f.id ? "bg-[#E1EEDE] font-bold" : "font-medium"}`}
                  >
                    <span className="block text-[#0D2E1A] font-bold">{f.name}</span>
                    <span className="text-xs text-outline">
                      {f.farmName} • {f.barnName} • {f.status === "ACTIVE" ? "🟢 Ativo" : "⚪ Encerrado"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center self-end md:self-auto print:hidden">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-3 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-xl transition-all shadow-md"
          >
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* ==================== KPI CARDS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border-l-4 border-l-[#1A5E35] border border-outline-variant/30 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#1A5E35]/10 text-[#1A5E35] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest">Custos</span>
          </div>
          <span className="text-sm font-medium text-outline block mb-1">Total gasto em R$</span>
          <span className="text-3xl font-extrabold text-[#0D2E1A]">
            {totalCost > 0
              ? `R$ ${totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              : "R$ 0,00"}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#1A5E35]/10 text-[#1A5E35] flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest">Tratamentos</span>
          </div>
          <span className="text-sm font-medium text-outline block mb-1">Nº de tratamentos</span>
          <span className="text-3xl font-extrabold text-[#0D2E1A]">{totalRecords}</span>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#1A5E35]/10 text-[#1A5E35] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest">Eficiência</span>
          </div>
          <span className="text-sm font-medium text-outline block mb-1">Custo médio por ave</span>
          <span className="text-3xl font-extrabold text-[#0D2E1A]">
            R$ {costPerBird.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-6 border-l-4 border-l-[#833C46] border border-outline-variant/30 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#833C46]/10 text-[#833C46] flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest">Top</span>
          </div>
          <span className="text-sm font-medium text-outline block mb-1">Produto mais utilizado</span>
          {topProduct ? (
            <>
              <span className="text-xl font-extrabold text-[#833C46] block mb-1 truncate">{topProduct.name}</span>
              <span className="text-xs font-medium text-outline">Representa {topProduct.percent}% do custo total</span>
            </>
          ) : (
            <span className="text-xl font-extrabold text-outline">—</span>
          )}
        </div>
      </div>

      {/* ==================== MAIN GRID ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

        {/* Gráfico de Custo por Medicamento (8 colunas) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-8">
          <h3 className="text-lg font-bold text-[#0D2E1A] mb-8">Custo por Medicamento</h3>

          {chartData.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#8C9A9E", fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#8C9A9E", fontSize: 12, fontWeight: 600 }}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "#F8F9FA" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #E5E7EB",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      fontWeight: "bold",
                    }}
                    formatter={(value: unknown) => [`R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Custo"]}
                  />
                  <Bar dataKey="custo" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-outline text-sm">
              Nenhum dado para exibir.
            </div>
          )}
        </div>

        {/* Sidebar: Motivos e Alertas (4 colunas) */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Card Resumo */}
          <div className="bg-[#1A5E35] rounded-3xl p-6 shadow-sm text-white relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <Pill className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-extrabold mb-2 text-white">Resumo de Tratamentos</h3>
              <p className="text-sm font-medium text-white/80 leading-relaxed mb-4">
                {uniqueMedications} medicamento{uniqueMedications !== 1 ? "s" : ""} distinto{uniqueMedications !== 1 ? "s" : ""} aplicado{uniqueMedications !== 1 ? "s" : ""} em {totalRecords} tratamento{totalRecords !== 1 ? "s" : ""}.
              </p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-extrabold">
                  R$ {totalCost > 0 ? (totalCost >= 1000 ? (totalCost / 1000).toFixed(1) + "k" : totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })) : "0"}
                </span>
                <span className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1.5">total</span>
              </div>
            </div>
          </div>

          {/* Card: Motivo de Aplicação */}
          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-6">
            <h3 className="text-sm font-bold text-[#0D2E1A] mb-4">Motivo de Aplicação</h3>
            {byReason.length > 0 ? (
              <div className="space-y-3">
                {byReason.map((r, idx) => (
                  <div key={r.reason} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#0D2E1A] truncate">{r.reason}</span>
                        <span className="text-xs font-bold text-outline ml-2">{r.count}x</span>
                      </div>
                      <div className="w-full bg-surface-container rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${r.percent}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-outline">Nenhum motivo registrado.</p>
            )}
          </div>

          {/* Card: Alerta de Carência */}
          {rows.some((r) => r.withdrawalDays && r.withdrawalDays > 0) && (
            <div className="bg-[#833C46]/5 rounded-3xl border border-[#833C46]/20 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-[#833C46]" />
                <h3 className="text-sm font-bold text-[#833C46]">Período de Carência</h3>
              </div>
              <div className="space-y-3">
                {rows
                  .filter((r) => r.withdrawalDays && r.withdrawalDays > 0)
                  .slice(0, 3)
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-[#833C46]/10">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#0D2E1A] block truncate">{r.medicationName}</span>
                        <span className="text-[10px] text-outline">{new Date(r.date).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-[#833C46]" />
                        <span className="text-sm font-extrabold text-[#833C46]">{r.withdrawalDays}d</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== TABELA DETALHADA ==================== */}
      <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-6 mb-8 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-[#0D2E1A]">Detalhamento de Aplicações</h2>
          <span className="text-xs font-bold text-outline bg-surface-container px-3 py-1.5 rounded-full">
            {totalRecords} registro{totalRecords !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="w-full overflow-x-auto custom-scrollbar flex-1">
          <div className="min-w-[900px]">
            {/* Table Headers */}
            <div className="grid grid-cols-12 gap-4 pb-3 border-b border-outline-variant/30 text-[10px] font-extrabold text-outline uppercase tracking-widest px-2">
              <div className="col-span-3">Produto</div>
              <div className="col-span-2">Motivo</div>
              <div className="col-span-2">Data / Lote</div>
              <div className="col-span-1">Dosagem</div>
              <div className="col-span-1">Via</div>
              <div className="col-span-1">Carência</div>
              <div className="col-span-2 text-right">Custo</div>
            </div>

            {/* Rows */}
            <div className="flex flex-col">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-12 gap-4 py-4 px-2 border-b border-outline-variant/10 items-center hover:bg-surface-container/50 transition-colors"
                >
                  <div className="col-span-3">
                    <span className="text-sm font-bold text-[#1A5E35] block mb-0.5">{row.medicationName}</span>
                    <span className="text-xs font-medium text-outline">{row.appliedBy || "—"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="inline-block px-2 py-1 bg-surface-container text-[#0D2E1A] text-[10px] font-bold rounded-lg uppercase tracking-wide truncate max-w-full">
                      {row.reason || "—"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm font-bold text-[#0D2E1A] block mb-0.5">
                      {new Date(row.date).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="text-xs font-medium text-outline">{row.flockName}</span>
                  </div>
                  <div className="col-span-1 text-sm font-medium text-outline truncate">
                    {row.dosage || "—"}
                  </div>
                  <div className="col-span-1">
                    <span className="text-xs font-bold text-outline truncate block">
                      {row.method ? row.method.split("|")[0].trim() : "—"}
                    </span>
                  </div>
                  <div className="col-span-1">
                    {row.withdrawalDays && row.withdrawalDays > 0 ? (
                      <span className="inline-block px-2 py-1 bg-[#833C46]/10 text-[#833C46] text-xs font-bold rounded-lg">
                        {row.withdrawalDays}d
                      </span>
                    ) : (
                      <span className="text-xs text-outline">—</span>
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-extrabold text-[#0D2E1A]">
                      {row.cost
                        ? `R$ ${row.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
