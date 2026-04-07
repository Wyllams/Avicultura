"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  ClipboardList,
  CheckCircle2,
  Syringe,
  Users,
  Loader2,
  FileWarning,
  ChevronDown
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { toast } from "sonner";
import {
  getReportVaccination,
  getActiveFlocksForReport,
  type VaccinationReportData
} from "@/app/actions/relatorios";

/** Cores do sistema */
const COLORS = ["#1A5E35", "#637D68", "#833C46", "#208b8b", "#B8860B", "#4A6FA5"];

function getMethodColor(method: string): string {
  const lower = method.toLowerCase();
  if (lower.includes("água") || lower.includes("agua") || lower.includes("water")) return "bg-blue-500/10 text-blue-600";
  if (lower.includes("spray") || lower.includes("asper")) return "bg-purple-500/10 text-purple-600";
  if (lower.includes("ocular") || lower.includes("gota")) return "bg-teal-500/10 text-teal-600";
  if (lower.includes("ovo") || lower.includes("in ovo")) return "bg-amber-500/10 text-amber-600";
  if (lower.includes("inject") || lower.includes("subcutane") || lower.includes("intra")) return "bg-red-500/10 text-red-600";
  return "bg-[#1A5E35]/10 text-[#1A5E35]";
}

export default function W47VacinacaoRelatorioPage() {
  const [data, setData] = useState<VaccinationReportData | null>(null);
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
      const result = await getReportVaccination(flockId);
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
            {error || "Não há registros de vacinação para gerar este relatório. Registre vacinas na seção de Sanidade primeiro."}
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
          <p className="text-sm font-bold text-outline">Carregando relatório de vacinação...</p>
        </div>
      </main>
    );
  }

  // ===================== DADOS PRONTOS =====================
  const {
    totalRecords,
    uniqueVaccines,
    flocksVaccinated,
    totalBirdsCovered,
    rows,
    byVaccine,
    byMethod,
    timeline
  } = data!;

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
            Cronograma de Vacinação
          </h1>
          <p className="text-outline text-sm font-medium leading-relaxed">
            Relatório de vacinações registradas • PNSA — Programa Nacional de Sanidade Avícola
          </p>

          {/* Seletor de Lote */}
          <div className="relative mt-3 print:hidden">
            <button
              onClick={() => setShowFlockDropdown(!showFlockDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant/30 rounded-xl text-sm font-bold text-[#0D2E1A] hover:bg-outline-variant/20 transition-all"
            >
              {selectedFlockId ? `Lote: ${flocks.find(f => f.id === selectedFlockId)?.name || "..."}` : "Todos os lotes"}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showFlockDropdown && (
              <div className="absolute top-12 left-0 w-80 bg-white border border-outline-variant/30 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto custom-scrollbar">
                <button
                  onClick={handleShowAll}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-surface-container transition-colors border-b border-outline-variant/10 ${!selectedFlockId ? "bg-[#E1EEDE] font-bold" : "font-medium"}`}
                >
                  <span className="block text-[#0D2E1A] font-bold">Todos os lotes</span>
                  <span className="text-xs text-outline">Exibir vacinações de todos os lotes</span>
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

        <div className="flex items-center gap-3 self-end md:self-auto print:hidden">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-3 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-xl transition-all shadow-md"
          >
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* ==================== KPI CARDS ==================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 border-b-4 border-b-[#1A5E35] border border-outline-variant/30 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#1A5E35]/10 text-[#1A5E35] flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest">Geral</span>
          </div>
          <span className="text-sm font-medium text-outline block mb-1">Total registrados</span>
          <span className="text-3xl font-extrabold text-[#0D2E1A]">{totalRecords}</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-outline-variant/30 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#1A5E35]/10 text-[#1A5E35] flex items-center justify-center">
              <Syringe className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest">Tipos</span>
          </div>
          <span className="text-sm font-medium text-outline block mb-1">Vacinas diferentes</span>
          <span className="text-3xl font-extrabold text-[#0D2E1A]">{uniqueVaccines}</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-outline-variant/30 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#1A5E35]/10 text-[#1A5E35] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest">Lotes</span>
          </div>
          <span className="text-sm font-medium text-outline block mb-1">Lotes vacinados</span>
          <span className="text-3xl font-extrabold text-[#0D2E1A]">{flocksVaccinated}</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border-b-4 border-b-[#1A5E35] border border-outline-variant/30 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#1A5E35]/10 text-[#1A5E35] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest">Cobertura</span>
          </div>
          <span className="text-sm font-medium text-outline block mb-1">Aves cobertas</span>
          <span className="text-3xl font-extrabold text-[#0D2E1A]">{totalBirdsCovered.toLocaleString("pt-BR")}</span>
        </div>
      </div>

      {/* ==================== MAIN GRID ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

        {/* Tabela Principal (8 colunas) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-6 overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-[#0D2E1A]">Registros de Vacinação</h2>
            <span className="text-xs font-bold text-outline bg-surface-container px-3 py-1.5 rounded-full">
              {totalRecords} registro{totalRecords !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="w-full overflow-x-auto custom-scrollbar flex-1">
            <div className="min-w-[700px]">
              {/* Table Headers */}
              <div className="grid grid-cols-12 gap-4 pb-3 border-b border-outline-variant/30 text-[10px] font-extrabold text-outline uppercase tracking-widest px-2">
                <div className="col-span-3">Vacina</div>
                <div className="col-span-2">Data</div>
                <div className="col-span-2">Via</div>
                <div className="col-span-3">Lote / Galpão</div>
                <div className="col-span-2 text-right">Responsável</div>
              </div>

              {/* Rows */}
              <div className="flex flex-col">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-12 gap-4 py-4 px-2 border-b border-outline-variant/10 items-center hover:bg-surface-container/50 transition-colors"
                  >
                    <div className="col-span-3">
                      <span className="text-sm font-bold text-[#0D2E1A] block mb-0.5">{row.vaccineName}</span>
                    </div>
                    <div className="col-span-2 text-sm font-bold text-[#1A5E35]">
                      {new Date(row.date).toLocaleDateString("pt-BR")}
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-block px-2 py-1 ${getMethodColor(row.method)} text-[10px] font-bold rounded-lg uppercase tracking-wide max-w-full truncate`}>
                        {row.method.split("|")[0].trim()}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-sm font-medium text-[#0D2E1A] block">{row.flockName}</span>
                      <span className="text-xs text-outline">{row.barnName} • {row.farmName}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-medium text-[#0D2E1A]">{row.appliedBy || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Distribuição (4 colunas) */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Card: Resumo PNSA */}
          <div className="bg-[#1A5E35] rounded-3xl p-6 shadow-sm text-white relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <Syringe className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-extrabold mb-2 text-white">Conformidade PNSA</h3>
              <p className="text-sm font-medium text-white/80 leading-relaxed mb-4">
                {uniqueVaccines} tipo{uniqueVaccines !== 1 ? "s" : ""} de vacina aplicada{uniqueVaccines !== 1 ? "s" : ""} em {flocksVaccinated} lote{flocksVaccinated !== 1 ? "s" : ""}.
              </p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-extrabold">{totalRecords}</span>
                <span className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1.5">aplicações</span>
              </div>
            </div>
          </div>

          {/* Card: Distribuição por Vacina */}
          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-6">
            <h3 className="text-sm font-bold text-[#0D2E1A] mb-4">Distribuição por Vacina</h3>
            <div className="space-y-3">
              {byVaccine.map((v, idx) => (
                <div key={v.name} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#0D2E1A] truncate">{v.name}</span>
                      <span className="text-xs font-bold text-outline ml-2">{v.count}x</span>
                    </div>
                    <div className="w-full bg-surface-container rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${v.percent}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Distribuição por Método */}
          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-6">
            <h3 className="text-sm font-bold text-[#0D2E1A] mb-4">Método de Aplicação</h3>
            {byMethod.length > 0 ? (
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byMethod}
                        dataKey="count"
                        cx="50%"
                        cy="50%"
                        outerRadius={40}
                        innerRadius={20}
                        strokeWidth={0}
                      >
                        {byMethod.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {byMethod.map((m, idx) => (
                    <div key={m.method} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="text-xs font-bold text-[#0D2E1A] truncate max-w-[150px] block">{m.method.split("|")[0].trim()}</span>
                      </div>
                      <span className="text-xs font-bold text-outline">{m.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-outline">Sem dados.</p>
            )}
          </div>
        </div>
      </div>

      {/* ==================== TIMELINE CHART ==================== */}
      {timeline.length > 1 && (
        <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-6 mb-8">
          <h3 className="text-lg font-bold text-[#0D2E1A] mb-6">Vacinações por Mês</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8C9A9E", fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8C9A9E", fontSize: 12, fontWeight: 600 }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontWeight: "bold" }}
                  formatter={(value: unknown) => [`${value} aplicações`, "Vacinações"]}
                />
                <Bar dataKey="count" fill="#1A5E35" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </main>
  );
}
