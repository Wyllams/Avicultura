"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  TrendingUp,
  AlertTriangle,
  Trophy,
  Loader2,
  FileWarning,
  ChevronDown,
  Scale
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ComposedChart,
  Line
} from "recharts";
import { toast } from "sonner";
import {
  getReportGrowth,
  getActiveFlocksForReport,
  type GrowthReportData,
} from "@/app/actions/relatorios";

export default function W49CurvaCrescimentoPage() {
  const [data, setData] = useState<GrowthReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flocks, setFlocks] = useState<{ id: string; name: string; barnName: string; farmName: string; status: string }[]>([]);
  const [selectedFlockId, setSelectedFlockId] = useState<string | undefined>(undefined);
  const [showFlockDropdown, setShowFlockDropdown] = useState(false);

  const fetchData = useCallback(async (flockId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReportGrowth(flockId);
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

  const handleExportPDF = () => {
    toast.loading("Gerando PDF...", { id: "pdf" });
    setTimeout(() => {
      window.print();
      toast.success("PDF pronto!", { id: "pdf" });
    }, 300);
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
          <h2 className="text-xl font-extrabold text-[#0D2E1A] mb-2">Sem dados suficientes</h2>
          <p className="text-sm text-outline max-w-sm">{error || "Nenhum lote encontrado."}</p>
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
          <p className="text-sm font-bold text-outline">Carregando curva de crescimento...</p>
        </div>
      </main>
    );
  }

  // ===================== DADOS PRONTOS =====================
  const {
    flock,
    ageInDays,
    currentWeight,
    totalWeighings,
    bestGain,
    worstGain,
    averageGpd,
    points,
  } = data!;

  const hasWeighings = points.length > 0;

  return (
    <main className="flex-1 px-8 py-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full overflow-y-auto custom-scrollbar print:bg-white print:p-4">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 print:hidden">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Link href="/relatorios" className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </Link>
            {/* Flock selector */}
            <div className="relative">
              <button
                onClick={() => setShowFlockDropdown(!showFlockDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/30 rounded-xl text-sm font-bold text-[#0D2E1A] hover:bg-surface-container transition-all"
              >
                Lote: {flock.name} <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showFlockDropdown && (
                <div className="absolute top-12 left-0 w-80 bg-white border border-outline-variant/30 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto custom-scrollbar">
                  {flocks.map((f) => (
                    <button key={f.id} onClick={() => handleFlockChange(f.id)} className={`w-full text-left px-4 py-3 text-sm hover:bg-surface-container transition-colors border-b border-outline-variant/10 last:border-b-0 ${(selectedFlockId === f.id || (!selectedFlockId && f.id === flock.id)) ? "bg-[#E1EEDE] font-bold" : "font-medium"}`}>
                      <span className="block text-[#0D2E1A] font-bold">{f.name}</span>
                      <span className="text-xs text-outline">{f.farmName} • {f.barnName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0D2E1A] tracking-tight mb-2">Curva de Crescimento</h1>
          <p className="text-outline text-sm font-medium max-w-xl leading-relaxed">
            {flock.farmName} | {flock.barnName} {flock.breed ? `| ${flock.breed}` : ""} | Idade: {ageInDays} dias
          </p>
        </div>

        <button onClick={handleExportPDF} className="flex items-center gap-2 px-5 py-3 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-xl transition-all shadow-md self-end md:self-auto">
          <Download className="w-4 h-4" /> Exportar PDF
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Peso Atual */}
        <div className="bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#1A5E35]"></div>
          <div className="flex justify-between items-start mb-6">
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest">Peso Atual</span>
            <div className="w-8 h-8 rounded-full bg-[#1A5E35]/10 flex items-center justify-center text-[#1A5E35]">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-extrabold text-[#0D2E1A]">{currentWeight ? currentWeight.toLocaleString("pt-BR") : "—"}</span>
              {currentWeight && <span className="text-sm font-bold text-outline">g</span>}
            </div>
            <span className="text-xs font-medium text-outline">Dia {ageInDays} | {totalWeighings} pesagen{totalWeighings !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Melhor Ganho */}
        <div className="bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest">Melhor dia de ganho</span>
            <div className="w-8 h-8 rounded-full bg-[#1A5E35]/10 flex items-center justify-center text-[#1A5E35]">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-extrabold text-[#0D2E1A]">{bestGain ? `Dia ${bestGain.day}` : "—"}</span>
              {bestGain && <span className="text-sm font-bold text-outline">({bestGain.gpd}g)</span>}
            </div>
            <span className="text-xs font-medium text-outline">{bestGain ? "Pico de eficiência metabólica" : "Registre pesagens para visualizar"}</span>
          </div>
        </div>

        {/* Pior Ganho */}
        <div className={`rounded-3xl p-6 border shadow-sm flex flex-col justify-between ${worstGain ? "bg-[#833C46]/5 border-[#833C46]/30" : "bg-white border-outline-variant/30"}`}>
          <div className="flex justify-between items-start mb-6">
            <span className={`text-[10px] font-extrabold uppercase tracking-widest ${worstGain ? "text-[#833C46]/80" : "text-outline"}`}>Pior dia de ganho</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${worstGain ? "bg-[#833C46]/10 text-[#833C46]" : "bg-outline-variant/10 text-outline"}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-4xl font-extrabold ${worstGain ? "text-[#833C46]" : "text-[#0D2E1A]"}`}>{worstGain ? `Dia ${worstGain.day}` : "—"}</span>
              {worstGain && <span className="text-sm font-bold text-[#833C46]/70">({worstGain.gpd}g)</span>}
            </div>
            <span className={`text-xs font-medium ${worstGain ? "text-[#833C46]/70" : "text-outline"}`}>{worstGain ? "Período de menor ganho" : "Sem dados"}</span>
          </div>
        </div>

        {/* GPD Médio */}
        <div className="bg-[#1A5E35] rounded-3xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden text-white">
          <div className="absolute right-2 bottom-2 opacity-10 pointer-events-none">
            <TrendingUp className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex justify-between items-start mb-6">
            <span className="text-[10px] font-extrabold text-white/80 uppercase tracking-widest">GPD Médio</span>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-extrabold text-white">{averageGpd ?? "—"}</span>
              {averageGpd && <span className="text-sm font-bold text-white/70">g/dia</span>}
            </div>
            <span className="text-xs font-medium text-white/70">Média de todas as pesagens</span>
          </div>
        </div>
      </div>

      {/* Gráfico Principal */}
      <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-8 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#1A5E35]"></span>
              <span className="text-sm font-bold text-[#0D2E1A]">Peso Real (g)</span>
            </div>
          </div>
          <span className="text-xs font-bold text-outline">{totalWeighings} ponto{totalWeighings !== 1 ? "s" : ""} no gráfico</span>
        </div>

        {hasWeighings ? (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 20, right: 30, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A5E35" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1A5E35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8C9A9E", fontSize: 12, fontWeight: 600 }}
                  dy={15}
                  tickFormatter={(v: number) => `D${v}`}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8C9A9E", fontSize: 12, fontWeight: 600 }}
                  dx={-10}
                  tickFormatter={(v: number) => `${v}g`}
                />
                <RechartsTooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontWeight: "bold", fontSize: "12px" }}
                  cursor={{ stroke: "#E5E7EB", strokeWidth: 2, strokeDasharray: "3 3" }}
                  formatter={(value: number, name: string) => {
                    if (name === "weight") return [`${value.toLocaleString("pt-BR")}g`, "Peso"];
                    return [value, name];
                  }}
                />
                <Area type="monotone" dataKey="weight" stroke="none" fill="url(#colorReal)" />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#1A5E35"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#1A5E35", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#0D2E1A", stroke: "#fff", strokeWidth: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[400px] flex flex-col items-center justify-center">
            <Scale className="w-12 h-12 text-outline-variant/40 mb-4" />
            <p className="text-sm font-bold text-outline">Nenhuma pesagem registrada</p>
            <p className="text-xs text-outline mt-1">Registre pesagens no módulo Pesagens para visualizar a curva.</p>
          </div>
        )}
      </div>

      {/* Tabela Detalhada */}
      {hasWeighings && (
        <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg font-bold text-[#0D2E1A]">Detalhamento por Pesagem</h2>
          </div>

          <div className="w-full overflow-x-auto custom-scrollbar">
            <div className="min-w-[700px]">
              {/* Headers */}
              <div className="grid grid-cols-10 gap-4 pb-3 border-b border-outline-variant/30 text-[10px] font-extrabold text-outline uppercase tracking-widest px-2 text-right">
                <div className="col-span-1 text-left">Dia</div>
                <div className="col-span-2">Data</div>
                <div className="col-span-2">Peso (g)</div>
                <div className="col-span-2">GPD (g/dia)</div>
                <div className="col-span-1">Amostra</div>
                <div className="col-span-2">Status</div>
              </div>

              {/* Rows */}
              <div className="flex flex-col">
                {points.map((row, index) => {
                  const isGood = row.gpd >= (averageGpd || 0);
                  return (
                    <div key={index} className="grid grid-cols-10 gap-4 py-4 px-2 border-b border-outline-variant/10 items-center hover:bg-surface-container/50 transition-colors text-right">
                      <div className="col-span-1 text-left">
                        <span className="text-sm font-bold text-[#0D2E1A] bg-surface-container px-2 py-1 rounded-md">D{row.day}</span>
                      </div>
                      <div className="col-span-2 text-sm font-medium text-outline">{row.date}</div>
                      <div className="col-span-2 text-sm font-extrabold text-[#1A5E35]">{row.weight.toLocaleString("pt-BR")}</div>
                      <div className="col-span-2 text-sm font-bold text-[#0D2E1A]">{row.gpd}</div>
                      <div className="col-span-1 text-sm font-medium text-outline">{row.sampleSize || "—"}</div>
                      <div className="col-span-2">
                        <span className={`inline-block px-2 py-1 text-[10px] font-extrabold rounded-lg uppercase tracking-wider ${isGood ? "bg-[#1A5E35]/10 text-[#1A5E35]" : "bg-[#833C46]/10 text-[#833C46]"}`}>
                          {isGood ? "Acima da média" : "Abaixo da média"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
