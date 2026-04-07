"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  CheckCircle2,
  FileText,
  Syringe,
  ClipboardList,
  Check,
  ShieldAlert,
  Loader2,
  FileWarning,
  ChevronDown,
  Stethoscope,
  X,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import {
  getReportSanitaryHistory,
  getActiveFlocksForReport,
  type SanitaryHistoryData,
  type SanitaryTimelineEvent
} from "@/app/actions/relatorios";

const TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  VACCINATION: { label: "Vacinação Realizada", color: "#1A5E35", bgColor: "#E1EEDE", icon: Syringe },
  VISIT: { label: "Visita Técnica", color: "#833C46", bgColor: "rgba(131,60,70,0.1)", icon: Stethoscope },
  AUDIT: { label: "Auditoria PNSA", color: "#208b8b", bgColor: "rgba(32,139,139,0.1)", icon: ClipboardList },
};

const STATUS_LABELS: Record<string, { label: string; color: string; dotColor: string }> = {
  CONFORME: { label: "Em Conformidade", color: "#1A5E35", dotColor: "#1A5E35" },
  PENDENTE: { label: "Pendente de Auditoria", color: "#B8860B", dotColor: "#B8860B" },
  NAO_CONFORME: { label: "Não Conforme", color: "#833C46", dotColor: "#833C46" },
};

export default function W41HistoricoSanidadePage() {
  const [data, setData] = useState<SanitaryHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flocks, setFlocks] = useState<{ id: string; name: string; barnName: string; farmName: string; status: string }[]>([]);
  const [selectedFlockId, setSelectedFlockId] = useState<string | undefined>(undefined);
  const [showFlockDropdown, setShowFlockDropdown] = useState(false);

  const fetchData = useCallback(async (flockId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReportSanitaryHistory(flockId);
      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data);
      }
    } catch {
      setError("Erro inesperado ao carregar dossiê.");
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

  const handleExport = () => {
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
        <Link href="/relatorios" className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm mb-6">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#833C46]/10 flex items-center justify-center mb-6">
            <FileWarning className="w-8 h-8 text-[#833C46]" />
          </div>
          <h2 className="text-xl font-extrabold text-[#0D2E1A] mb-2">Sem dados suficientes</h2>
          <p className="text-sm text-outline max-w-sm">{error || "Nenhum registro sanitário encontrado."}</p>
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
          <p className="text-sm font-bold text-outline">Carregando dossiê PNSA...</p>
        </div>
      </main>
    );
  }

  // ===================== DADOS PRONTOS =====================
  const {
    totalVaccinations,
    totalVisits,
    totalAudits,
    lastAuditScore,
    complianceStatus,
    timeline,
    teamMembers,
    pnsaChecklist
  } = data!;

  const statusInfo = STATUS_LABELS[complianceStatus];

  return (
    <main className="flex-1 bg-white animate-in fade-in duration-500 font-inter overflow-y-auto custom-scrollbar p-6 lg:p-10 flex flex-col items-center print:bg-white print:p-4">
      <div className="w-full max-w-[1400px]">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <Link href="/relatorios" className="w-10 h-10 bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors text-[#0D2E1A]">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#1A5E35]">Dossiê de Sanidade PNSA</h1>
            </div>

            {/* Seletor de Lote */}
            <div className="relative">
              <button
                onClick={() => setShowFlockDropdown(!showFlockDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-sm font-bold text-[#0D2E1A] hover:bg-surface-container transition-all"
              >
                {selectedFlockId ? `Lote: ${flocks.find(f => f.id === selectedFlockId)?.name || "..."}` : "Todos os lotes"}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showFlockDropdown && (
                <div className="absolute top-12 left-0 w-80 bg-white border border-outline-variant/30 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto custom-scrollbar">
                  <button onClick={handleShowAll} className={`w-full text-left px-4 py-3 text-sm hover:bg-surface-container transition-colors border-b border-outline-variant/10 ${!selectedFlockId ? "bg-[#E1EEDE] font-bold" : "font-medium"}`}>
                    <span className="block text-[#0D2E1A] font-bold">Todos os lotes</span>
                    <span className="text-xs text-outline">Visualizar histórico completo</span>
                  </button>
                  {flocks.map(f => (
                    <button key={f.id} onClick={() => handleFlockChange(f.id)} className={`w-full text-left px-4 py-3 text-sm hover:bg-surface-container transition-colors border-b border-outline-variant/10 last:border-b-0 ${selectedFlockId === f.id ? "bg-[#E1EEDE] font-bold" : "font-medium"}`}>
                      <span className="block text-[#0D2E1A] font-bold">{f.name}</span>
                      <span className="text-xs text-outline">{f.farmName} • {f.barnName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button onClick={handleExport} className="flex items-center gap-2 px-5 py-2.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-xs font-bold rounded-xl transition-all shadow-md">
            <Download className="w-4 h-4" /> Exportar para Auditoria
          </button>
        </div>

        {/* KPI Banner */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 mb-10 flex flex-wrap gap-8 items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase tracking-widest font-extrabold text-outline mb-2">Status Sanitário</span>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(26,94,53,0.4)]" style={{ backgroundColor: statusInfo.dotColor }}></div>
              <strong className="text-lg font-bold" style={{ color: statusInfo.color }}>{statusInfo.label}</strong>
            </div>
          </div>

          <div className="w-px h-12 bg-outline-variant/30 hidden md:block"></div>

          <div>
            <span className="block text-[10px] uppercase tracking-widest font-extrabold text-outline mb-2">Vacinas Aplicadas</span>
            <strong className="text-lg font-bold text-[#0D2E1A]">{totalVaccinations}</strong>
          </div>

          <div className="w-px h-12 bg-outline-variant/30 hidden md:block"></div>

          <div>
            <span className="block text-[10px] uppercase tracking-widest font-extrabold text-outline mb-2">Visitas Técnicas</span>
            <strong className="text-lg font-bold text-[#0D2E1A]">{totalVisits} Realizadas</strong>
          </div>

          <div className="w-px h-12 bg-outline-variant/30 hidden md:block"></div>

          <div>
            <span className="block text-[10px] uppercase tracking-widest font-extrabold text-outline mb-2">Auditorias PNSA</span>
            <strong className="text-lg font-bold text-[#0D2E1A]">
              {totalAudits}{lastAuditScore != null ? ` (${lastAuditScore}%)` : ""}
            </strong>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* TIMELINE (2/3) */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-extrabold text-[#1A5E35]">Cronograma de Ações Sanitárias</h2>
              <span className="text-xs font-bold text-[#0D2E1A] bg-surface-container-lowest px-3 py-1.5 border border-outline-variant/30 rounded-full">
                {timeline.length} evento{timeline.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* TIMELINE CONTAINER */}
            <div className="relative pl-6 border-l-2 border-outline-variant/30 space-y-8">
              {timeline.map((event) => (
                <TimelineCard key={event.id} event={event} />
              ))}
            </div>
          </div>

          {/* SIDEBAR (1/3) */}
          <div className="space-y-6">

            {/* Banner Verde: Status */}
            <div className="bg-[#1A5E35] rounded-3xl p-8 text-white relative overflow-hidden shadow-lg">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-extrabold mb-3 leading-tight text-white tracking-tight">
                {complianceStatus === "CONFORME" ? "Pronto para Auditoria" : complianceStatus === "PENDENTE" ? "Auditoria Pendente" : "Atenção Requerida"}
              </h3>
              <p className="text-sm font-medium text-white/80 leading-relaxed mb-8">
                {complianceStatus === "CONFORME"
                  ? "Todos os registros deste lote estão validados digitalmente."
                  : "Realize uma auditoria PNSA para validar a conformidade."}
              </p>
              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-[#1A5E35] hover:bg-surface-container-lowest text-sm font-bold rounded-xl transition-all shadow-md group print:hidden"
              >
                <FileText className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" /> Gerar PDF Auditoria
              </button>
            </div>

            {/* Equipe de Sanidade */}
            {teamMembers.length > 0 && (
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-sm">
                <span className="block text-[10px] font-extrabold text-outline uppercase tracking-widest mb-6">Equipe de Sanidade</span>
                <div className="space-y-5">
                  {teamMembers.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm" style={{ backgroundColor: ["#208b8b", "#1A5E35", "#833C46", "#4A6FA5"][idx % 4] }}>
                        <span className="text-sm font-bold">{member.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <strong className="block text-sm font-bold text-[#0D2E1A]">{member.name}</strong>
                        <span className="block text-[11px] font-medium text-outline mt-0.5">{member.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conformidade PNSA */}
            <div className="bg-white border border-outline-variant/30 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <ShieldAlert className="w-4 h-4 text-[#1A5E35]" />
                <strong className="text-sm font-bold text-[#0D2E1A]">Conformidade PNSA</strong>
              </div>
              <ul className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {pnsaChecklist.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${item.ok ? "bg-[#1A5E35]/10" : "bg-[#833C46]/10"}`}>
                        {item.ok ? <Check className="w-2.5 h-2.5 text-[#1A5E35]" /> : <X className="w-2.5 h-2.5 text-[#833C46]" />}
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${item.ok ? "text-[#0D2E1A]" : "text-[#833C46]"}`}>{item.item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}

// ===================== TIMELINE CARD COMPONENT =====================
function TimelineCard({ event }: { event: SanitaryTimelineEvent }) {
  const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.VACCINATION;
  const Icon = config.icon;
  const formattedDate = new Date(event.date).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric"
  });

  return (
    <div className="relative">
      {/* Timeline Dot */}
      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white" style={{ backgroundColor: config.color }}></div>

      {/* Event Card */}
      <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <span className="px-2.5 py-1 text-[10px] font-extrabold rounded uppercase tracking-widest" style={{ backgroundColor: config.bgColor, color: config.color }}>
            {config.label}
          </span>
          <div className="text-right">
            <span className="block text-sm font-bold text-[#0D2E1A]">{formattedDate}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.bgColor }}>
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <h3 className="text-lg font-bold text-[#0D2E1A]">{event.title}</h3>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {Object.entries(event.details).map(([key, value]) =>
            value ? (
              <div key={key}>
                <span className="block text-[10px] text-outline font-extrabold uppercase tracking-widest mb-1">{key}</span>
                <strong className="text-sm font-bold text-[#0D2E1A]">{value}</strong>
              </div>
            ) : null
          )}
          {/* Status badge */}
          <div className="flex items-center justify-end">
            {event.status === "OK" && (
              <div className="w-6 h-6 rounded-full bg-[#1A5E35] flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            {event.status === "ALERT" && (
              <div className="w-6 h-6 rounded-full bg-[#833C46] flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {event.notes && (
          <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 text-xs font-medium text-outline leading-relaxed mt-2">
            {event.notes}
          </div>
        )}
      </div>
    </div>
  );
}
