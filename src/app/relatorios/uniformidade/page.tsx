"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  Loader2,
  FileWarning,
  Scale,
  TrendingUp,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { toast } from "sonner";
import {
  getReportUniformity,
  getFlocksByCompany,
  type UniformityReportData,
} from "@/app/actions/relatorios";

export default function W50UniformidadePage() {
  const [data, setData] = useState<UniformityReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flocks, setFlocks] = useState<{ id: string; name: string }[]>([]);
  const [selectedFlockId, setSelectedFlockId] = useState<string>("");

  // Buscar lista de lotes
  useEffect(() => {
    async function loadFlocks() {
      try {
        const result = await getFlocksByCompany();
        if (result.data && result.data.length > 0) {
          setFlocks(result.data);
          setSelectedFlockId(result.data[0].id);
        }
      } catch { /* noop */ }
    }
    loadFlocks();
  }, []);

  const fetchData = useCallback(async (flockId: string) => {
    if (!flockId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getReportUniformity(flockId);
      if (result.error) { setError(result.error); setData(null); }
      else { setData(result.data); }
    } catch { setError("Erro inesperado."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedFlockId) fetchData(selectedFlockId);
  }, [selectedFlockId, fetchData]);

  const handleExportPDF = () => {
    toast.loading("Gerando PDF...", { id: "pdf" });
    setTimeout(() => { window.print(); toast.success("PDF pronto!", { id: "pdf" }); }, 300);
  };

  // ===================== LOADING =====================
  if (loading) {
    return (
      <main className="flex-1 px-8 py-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full overflow-y-auto custom-scrollbar flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#1A5E35] animate-spin" />
          <p className="text-sm font-bold text-outline">Carregando uniformidade...</p>
        </div>
      </main>
    );
  }

  // ===================== EMPTY STATE =====================
  if (error || !data) {
    return (
      <main className="flex-1 px-8 py-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full overflow-y-auto custom-scrollbar">
        <Link href="/relatorios" className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm mb-6 print:hidden">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#833C46]/10 flex items-center justify-center mb-6">
            <FileWarning className="w-8 h-8 text-[#833C46]" />
          </div>
          <h2 className="text-xl font-extrabold text-[#0D2E1A] mb-2">Sem dados de uniformidade</h2>
          <p className="text-sm text-outline max-w-sm">{error || "Nenhum lote encontrado."}</p>
        </div>
      </main>
    );
  }

  // ===================== DADOS =====================
  const { flock, weighings, latestWeight, averageOfAverages, emissionDate } = data;

  // Construir histograma simplificado a partir das pesagens
  const histogramData = weighings
    .slice()
    .reverse()
    .map((w) => ({
      label: `Dia ${w.ageInDays}`,
      peso: w.averageWeight,
      amostra: w.sampleSize,
    }));

  const avgLine = averageOfAverages;
  const hasWeighings = weighings.length > 0;

  return (
    <main className="flex-1 px-8 py-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full overflow-y-auto custom-scrollbar print:bg-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <Link href="/relatorios" className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm mb-4 print:hidden">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Link>
          <h1 className="text-3xl font-extrabold text-[#0D2E1A] tracking-tight mb-2">Uniformidade de Lote</h1>
          <p className="text-outline text-sm font-medium w-full max-w-xl leading-relaxed">
            {flock.farmName} | {flock.barnName} | {flock.breed || "—"} • Emitido em {emissionDate}
          </p>
        </div>
        <div className="flex items-center gap-4 self-end md:self-auto print:hidden">
          {/* Seletor de lote */}
          <div className="bg-white rounded-2xl px-4 py-2 border border-outline-variant/30 shadow-sm">
            <label className="text-[10px] font-extrabold text-outline uppercase tracking-widest mb-1 block">Lote</label>
            <select
              value={selectedFlockId}
              onChange={(e) => setSelectedFlockId(e.target.value)}
              className="bg-transparent text-sm font-bold text-[#0D2E1A] focus:outline-none appearance-none cursor-pointer min-w-[160px]"
            >
              {flocks.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-5 py-3 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-xl transition-all shadow-md">
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Nº Pesagens */}
        <div className="bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest mb-6">Nº de Pesagens</span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-[#0D2E1A]">{weighings.length}</span>
            <span className="text-sm font-bold text-[#0D2E1A]">registros</span>
          </div>
        </div>

        {/* Peso Médio Geral */}
        <div className="bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest mb-6">Peso Médio Geral</span>
          <div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-extrabold text-[#0D2E1A]">
                {averageOfAverages != null ? averageOfAverages.toLocaleString("pt-BR") : "—"}
              </span>
              <span className="text-sm font-bold text-[#0D2E1A]">g</span>
            </div>
            <span className="text-xs font-medium text-outline block">Média de todas as pesagens</span>
          </div>
        </div>

        {/* Último Peso */}
        <div className="bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest">Último Peso</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-extrabold text-[#0D2E1A]">
                {latestWeight != null ? latestWeight.toLocaleString("pt-BR") : "—"}
              </span>
              <span className="text-sm font-bold text-[#0D2E1A]">g</span>
            </div>
            {latestWeight != null && averageOfAverages != null && (
              <span className={`text-xs font-bold flex items-center gap-1 ${latestWeight >= averageOfAverages ? "text-[#1A5E35]" : "text-[#833C46]"}`}>
                <TrendingUp className="w-3 h-3" />
                {latestWeight >= averageOfAverages ? "+" : ""}{(latestWeight - averageOfAverages).toLocaleString("pt-BR")}g vs. média
              </span>
            )}
          </div>
        </div>

        {/* Aves Alojadas */}
        <div className="bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-outline uppercase tracking-widest mb-6">Aves Alojadas</span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-[#0D2E1A]">{flock.housedBirds.toLocaleString("pt-BR")}</span>
            <span className="text-sm font-bold text-[#0D2E1A]">aves</span>
          </div>
        </div>
      </div>

      {/* Chart + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Histograma / Barras de peso por dia */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-[#0D2E1A]">Peso Médio por Pesagem</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#0D2E1A]"></span>
                <span className="text-sm font-bold text-[#0D2E1A]">Peso (g)</span>
              </div>
              {avgLine != null && (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-[#833C46]"></span>
                  <span className="text-sm font-bold text-[#0D2E1A]">Média ({avgLine}g)</span>
                </div>
              )}
            </div>
          </div>

          {hasWeighings ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#8C9A9E', fontSize: 10, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C9A9E', fontSize: 11, fontWeight: 600 }} tickFormatter={(v) => `${v}g`} />
                  <RechartsTooltip
                    cursor={{ fill: '#F8F9FA' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    formatter={(value: any) => [`${Number(value).toLocaleString("pt-BR")}g`, 'Peso Médio']}
                  />
                  <Bar dataKey="peso" fill="#0D2E1A" radius={[4, 4, 0, 0]} />
                  {avgLine != null && (
                    <ReferenceLine y={avgLine} stroke="#833C46" strokeWidth={2} strokeDasharray="5 5" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center">
              <div className="text-center">
                <Scale className="w-12 h-12 text-outline-variant/40 mx-auto mb-4" />
                <p className="text-sm font-bold text-outline">Nenhuma pesagem registrada</p>
                <p className="text-xs text-outline mt-1">Registre pesagens no módulo Pesagens.</p>
              </div>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="lg:col-span-4 bg-[#1A5E35] rounded-3xl p-8 flex flex-col justify-between shadow-lg relative overflow-hidden text-white">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-12">
            <Scale className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Info className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">Sobre Uniformidade</h3>
            </div>
            <p className="text-white/90 text-sm font-medium leading-relaxed mb-8">
              A uniformidade mede a homogeneidade do lote. Um lote uniforme (CV% abaixo de 10%) indica manejo alimentar e ambiental adequados.
            </p>
          </div>

          <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
            <span className="text-[10px] font-extrabold text-white/70 uppercase tracking-widest mb-2 block">Classificação CV%</span>
            <div className="space-y-2 text-sm font-medium text-white/90">
              <p><strong className="text-white">≤ 8%</strong> = Excelente</p>
              <p><strong className="text-white">8-10%</strong> = Bom</p>
              <p><strong className="text-white">10-15%</strong> = Regular</p>
              <p><strong className="text-white">&gt; 15%</strong> = Ruim</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Pesagens */}
      <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-6 overflow-hidden">
        <h2 className="text-lg font-bold text-[#0D2E1A] mb-6">Histórico de Pesagens do Lote</h2>

        {hasWeighings ? (
          <div className="w-full overflow-x-auto custom-scrollbar">
            <div className="min-w-[700px]">
              {/* Headers */}
              <div className="grid grid-cols-12 gap-4 pb-3 border-b border-outline-variant/30 text-[10px] font-extrabold text-outline uppercase tracking-widest px-2">
                <div className="col-span-2">Data</div>
                <div className="col-span-2">Idade (dias)</div>
                <div className="col-span-2">Amostra</div>
                <div className="col-span-3">Peso Médio (g)</div>
                <div className="col-span-3 text-right">Desvio da Média</div>
              </div>
              {weighings.map((w) => {
                const deviation = averageOfAverages != null ? w.averageWeight - averageOfAverages : 0;
                return (
                  <div key={w.id} className="grid grid-cols-12 gap-4 py-4 px-2 border-b border-outline-variant/10 items-center hover:bg-surface-container/50 transition-colors">
                    <div className="col-span-2">
                      <span className="text-sm font-bold text-[#0D2E1A]">{w.date}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-outline">Dia {w.ageInDays}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-outline">{w.sampleSize > 0 ? `${w.sampleSize} aves` : "—"}</span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-sm font-extrabold text-[#1A5E35]">{w.averageWeight.toLocaleString("pt-BR")}g</span>
                    </div>
                    <div className="col-span-3 text-right">
                      {averageOfAverages != null ? (
                        <span className={`inline-block px-2 py-1 text-[10px] font-extrabold rounded uppercase tracking-widest ${deviation >= 0 ? "bg-[#1A5E35]/10 text-[#1A5E35]" : "bg-[#833C46]/10 text-[#833C46]"}`}>
                          {deviation >= 0 ? "+" : ""}{deviation.toLocaleString("pt-BR")}g
                        </span>
                      ) : (
                        <span className="text-xs text-outline">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <Scale className="w-12 h-12 text-outline-variant/40 mb-4" />
            <p className="text-sm font-bold text-outline">Nenhuma pesagem registrada para este lote</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 py-6 px-2 border-t border-outline-variant/20 flex justify-between items-center text-[9px] font-extrabold text-outline uppercase tracking-widest">
        <span>Avicultura — Uniformidade de Lote • {emissionDate}</span>
        <span className="text-[#833C46]">Confidencial</span>
      </div>
    </main>
  );
}
