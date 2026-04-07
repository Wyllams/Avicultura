"use client";

import React, { useEffect, useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Search, 
  Bell, 
  HelpCircle, 
  FileText, 
  Syringe, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
  MessageSquareQuote,
  ArrowLeft
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FarmSelector } from "@/components/FarmSelector";
import { getUserFarms, type FarmOption } from "@/app/actions/dashboard";
import { getVaccineHistory } from "@/app/actions/sanidade";
import { db } from "@/lib/db/dexie";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Date formatting helper
const formatDateUTC = (dateStr: string) => {
   const date = new Date(dateStr);
   return new Intl.DateTimeFormat('pt-BR', { 
     day: '2-digit', month: 'short', year: 'numeric',
     timeZone: 'America/Sao_Paulo'
   }).format(date);
};
const formatTimeUTC = (dateStr: string) => {
   const date = new Date(dateStr);
   return new Intl.DateTimeFormat('pt-BR', { 
     hour: '2-digit', minute: '2-digit',
     timeZone: 'America/Sao_Paulo'
   }).format(date);
};

type VaccinationRecord = {
  id: string;
  flockName: string;
  dateStr: string;
  timeStr: string;
  vaccineName: string;
  method: string;
  dosage: string;
  vaccinatedCount: string;
  responsibleName: string;
  status: "Concluído" | "Pendente";
  rawDate: Date;
  housedBirds: number;
  housingDate: string | null;
};

const columnHelper = createColumnHelper<VaccinationRecord>();

const columns = [
  columnHelper.accessor("dateStr", {
    header: "DATA & HORA",
    cell: (info) => (
      <div className="flex flex-col">
        <span className="font-bold text-[#0D2E1A]">{info.getValue()}</span>
        <span className="text-xs text-outline">{info.row.original.timeStr}</span>
      </div>
    ),
  }),
  columnHelper.accessor("flockName", {
    header: "LOTE",
    cell: (info) => <span className="font-bold text-[#1A5E35]">{info.getValue()}</span>,
  }),
  columnHelper.accessor("vaccineName", {
    header: "VACINA",
    cell: (info) => (
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${info.row.original.status === 'Pendente' ? 'bg-[#fff8e1]' : 'bg-[#e8f5e9]'}`}>
           {info.row.original.status === 'Pendente' ? (
             <AlertTriangle className="w-4 h-4 text-[#f57f17]" />
           ) : (
             <Syringe className="w-4 h-4 text-[#2e7d32]" />
           )}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-[#0D2E1A]">{info.getValue()}</span>
          <span className="text-xs text-outline">{info.row.original.method}</span>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor("dosage", {
    header: "DOSAGEM",
    cell: (info) => <span className="text-sm font-medium text-outline">{info.getValue()}</span>,
  }),
  columnHelper.accessor("vaccinatedCount", {
    header: "AVES VACINADAS",
    cell: (info) => <span className="font-bold text-[#0D2E1A]">{info.getValue()}</span>,
  }),
  columnHelper.accessor("responsibleName", {
    header: "RESPONSÁVEL",
    cell: (info) => (
      <div className="flex items-center gap-2">
         <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-[10px] font-bold text-outline uppercase">
            {info.getValue() ? info.getValue().charAt(0) : '?'}
         </div>
         <span className="text-sm font-medium text-outline">{info.getValue() || "-"}</span>
      </div>
    ),
  }),
  columnHelper.accessor("status", {
    header: "STATUS",
    cell: (info) => {
      const isConcluido = info.getValue() === "Concluído";
      return (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
            isConcluido
              ? "bg-[#e8f5e9] text-[#2e7d32]"
              : "bg-[#ffebee] text-[#c62828]"
          }`}
        >
          {info.getValue()}
        </span>
      );
    },
  }),
];

function W29HistoricoVacinacoesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [rawData, setRawData] = useState<VaccinationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [period, setPeriod] = useState<string>("30");
  const [selectedVaccineType, setSelectedVaccineType] = useState<string>("Todos os tipos");

  // 1. Initial Load (Farms)
  useEffect(() => {
    async function loadFarms() {
      const result = await getUserFarms();
      if (result.farms && result.farms.length > 0) {
        setFarms(result.farms);
        const paramFarmId = searchParams.get("farmId");
        const storedFarmId = localStorage.getItem("selectedFarmId");
        const farmIds = result.farms.map((f: FarmOption) => f.id);
        
        let initialFarmId = result.farms[0].id;
        if (paramFarmId && farmIds.includes(paramFarmId)) {
          initialFarmId = paramFarmId;
        } else if (storedFarmId && farmIds.includes(storedFarmId)) {
          initialFarmId = storedFarmId;
        }
        setSelectedFarmId(initialFarmId);
      }
    }
    loadFarms();
  }, [searchParams]);

  // 2. Fetch History when Farm Changes
  useEffect(() => {
    async function fetchHistory() {
      if (!selectedFarmId) return;
      setLoading(true);

      localStorage.setItem("selectedFarmId", selectedFarmId);
      const params = new URLSearchParams(searchParams.toString());
      if (params.get("farmId") !== selectedFarmId) {
        params.set("farmId", selectedFarmId);
        router.replace(`?${params.toString()}`);
      }

      try {
        // Fetch from Supabase
        const dbResult = await getVaccineHistory(selectedFarmId);
        const serverRecords = dbResult.logs || [];
        
        // Fetch offline local from Dexie
        const localPending = await db.vaccine_queue.where("syncStatus").equals("pending").toArray();

        // Parse Server Records
        const formattedServer: VaccinationRecord[] = serverRecords.map((r: any) => {
           const parts = (r.method || "").split(" | ");
           const via = parts[0] || "N/A";
           const dosage = parts.find((p: string) => p.includes("Dosagem:"))?.replace("Dosagem:","").trim() || "-";
           const aves = parts.find((p: string) => p.includes("Aves Vacinadas:"))?.replace("Aves Vacinadas:","").trim() || "-";

           return {
              id: r.id,
              flockName: r.flock?.name || "Lote Desconhecido",
              dateStr: formatDateUTC(r.date),
              timeStr: formatTimeUTC(r.date),
              vaccineName: r.vaccineName,
              method: via,
              dosage: dosage,
              vaccinatedCount: aves,
              responsibleName: r.appliedBy || "",
              status: "Concluído",
              rawDate: new Date(r.date),
              housedBirds: r.flock?.housedBirds || 0,
               housingDate: r.flock?.housingDate || null
           };
        });

        // Parse Local Pending
        const formattedLocal: VaccinationRecord[] = localPending.map(r => {
           const parts = (r.method || "").split(" | ");
           const via = parts[0] || "N/A";
           const dosage = parts.find((p: string) => p.includes("Dosagem:"))?.replace("Dosagem:","").trim() || "-";
           const aves = parts.find((p: string) => p.includes("Aves Vacinadas:"))?.replace("Aves Vacinadas:","").trim() || "-";

           return {
              id: r.id ? r.id.toString() : r.syncId,
              flockName: "Sincronizando...", // offline we only have flockId, we'd need flock map (simplification)
              dateStr: formatDateUTC(r.date),
              timeStr: formatTimeUTC(r.date),
              vaccineName: r.vaccineName,
              method: via,
              dosage: dosage,
              vaccinatedCount: aves,
              responsibleName: r.appliedBy || "",
              status: "Pendente",
              rawDate: new Date(r.date),
              housedBirds: 0,
               housingDate: null
           };
        });

        // Combine
        const combined = [...formattedLocal, ...formattedServer];
        
        // Dedup safety
        const unique = combined.filter((val, index, self) =>
           index === self.findIndex((t) => (t.id === val.id))
        );

        setRawData(unique);

      } catch (err) {
        console.error("Erro fetching history", err);
        toast.error("Falha ao buscar histórico");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [selectedFarmId, router, searchParams]);

  const uniqueVaccines = React.useMemo(() => {
    const names = rawData.map(r => r.vaccineName);
    return Array.from(new Set(names)).sort();
  }, [rawData]);

  const filteredData = React.useMemo(() => {
    let result = [...rawData];

    // Filter by period
    if (period !== "anual") {
      const days = parseInt(period);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter(r => r.rawDate >= cutoff);
    }

    // Filter by vaccine type
    if (selectedVaccineType !== "Todos os tipos") {
      result = result.filter(r => r.vaccineName === selectedVaccineType);
    }

    return result;
  }, [rawData, period, selectedVaccineType]);

  const kpis = React.useMemo(() => {
   // 1. Cobertura Vacinal
   let coveragePercentage = 100;
   let validCoverageCount = 0;
   let sumCoverage = 0;
   
   filteredData.forEach(row => {
      if (row.housedBirds > 0) {
         const vaccinatedNum = parseInt(row.vaccinatedCount.replace(/[^\d]/g, ''), 10);
         if (!isNaN(vaccinatedNum)) {
            let pct = (vaccinatedNum / row.housedBirds) * 100;
            if(pct > 100) pct = 100; // cap at 100% just in case of wrong entries
            sumCoverage += pct;
            validCoverageCount++;
         }
      }
   });
   
   if (validCoverageCount > 0) {
      coveragePercentage = sumCoverage / validCoverageCount;
   } else {
      // Falback if no proper numeric data was parsed
      coveragePercentage = filteredData.length > 0 ? 100 : 0; 
   }

   // 2. Próxima Vacinação Padrão
   let nextVaccine = ["Nenhuma"];
   let nextDateStr = "Sem previsão";
   
   let latestFlock = null as VaccinationRecord | null;
   let latestDate = 0;
   filteredData.forEach(r => {
       if (r.housingDate) {
          const d = new Date(r.housingDate).getTime();
          if (d > latestDate) {
             latestDate = d;
             latestFlock = r;
          }
       }
   });

   if (latestFlock && latestFlock.housingDate) {
      const housingD = new Date(latestFlock.housingDate);
      const ageInDays = Math.floor((new Date().getTime() - housingD.getTime()) / (1000 * 3600 * 24));
      
      if (ageInDays <= 7) {
         nextVaccine = ["Gumboro", "Newcastle"];
         const target = new Date(housingD);
         target.setDate(target.getDate() + 7);
         nextDateStr = formatDateUTC(target.toISOString()) + " (D-7)";
      } else if (ageInDays <= 14) {
         nextVaccine = ["Bronquite Infecciosa"];
         const target = new Date(housingD);
         target.setDate(target.getDate() + 14);
         nextDateStr = formatDateUTC(target.toISOString()) + " (D-14)";
      } else if (ageInDays <= 21) {
         nextVaccine = ["Reforço Gumboro"];
         const target = new Date(housingD);
         target.setDate(target.getDate() + 21);
         nextDateStr = formatDateUTC(target.toISOString()) + " (D-21)";
      } else {
         nextVaccine = ["Ciclo Concluído"];
         nextDateStr = "Aves Adultas";
      }
   }

   // 3. Responsável RT
   let responsible = "Responsável Técnico";
   const recent = filteredData.find(r => r.responsibleName && r.responsibleName.trim() !== "" && r.status === "Concluído");
   if (recent) {
      responsible = recent.responsibleName;
   }

   let initials = "?";
   if(responsible.trim() !== "Responsável Técnico") {
      initials = responsible.substring(0, 2).toUpperCase();
   }

   return {
      coverage: coveragePercentage.toFixed(1),
      nextVaccine,
      nextDateStr,
      responsible,
      initials
   };
 }, [filteredData]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExportPDF = () => {
    if (filteredData.length === 0) {
       toast.error("Não há dados para exportar");
       return;
    }
    
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      const farmName = farms.find(f => f.id === selectedFarmId)?.name || "Granja Não Identificada";

      // Header
      doc.setFontSize(20);
      doc.setTextColor(13, 46, 26); // #0D2E1A
      doc.text("Boletim Sanitário - Vacinação", 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Granja: ${farmName}`, 14, 32);
      doc.text(`Período do Filtro: ${period === "anual" ? "Anual" : "Últimos " + period + " dias"}`, 14, 38);
      doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, 44);

      // Table mapping
      const tableData = filteredData.map(r => [
        `${r.dateStr} ${r.timeStr}`,
        r.flockName,
        `${r.vaccineName} (${r.method})`,
        r.dosage,
        r.vaccinatedCount,
        r.responsibleName || "-",
        r.status
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['Data/Hora', 'Lote', 'Vacina/Via', 'Dosagem', 'Aves Vacinadas', 'Responsável', 'Status']],
        body: tableData,
        headStyles: { fillColor: [26, 94, 53] }, // #1A5E35
        alternateRowStyles: { fillColor: [248, 249, 250] }, // Neutral
        styles: { fontSize: 8, cellPadding: 3 },
      });

      // Signatures
      const finalY = (doc as any).lastAutoTable.finalY || 50;
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text("________________________________________________", 14, finalY + 40);
      doc.text("Assinatura do Produtor / Responsável", 14, finalY + 45);
      
      doc.text("________________________________________________", 120, finalY + 40);
      doc.text("Assinatura do Médico Veterinário (RT)", 120, finalY + 45);

      doc.save(`boletim_vacinacao_${new Date().getTime()}.pdf`);
      toast.success("Boletim exportado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Falha ao gerar o PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-outline-variant/30 pb-4">
         <div>
            <Link href="/sanidade/vacinacao/novo" className="inline-flex mb-4">
               <span className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">
               <ArrowLeft className="w-4 h-4" /> Voltar
               
            </span>
            </Link>
            <h1 className="text-2xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
               Histórico de Vacinações
            </h1>
         </div>
         <div className="flex shrink-0 flex-col sm:flex-row gap-4 items-center justify-end md:mt-0 mt-4">
            <div className="relative">
               <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
               <input 
                  type="text" 
                  placeholder="Buscar vacina ou lote..." 
                  className="pl-9 pr-4 py-3 h-[52px] bg-surface-container rounded-xl border border-outline-variant/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5E35] w-64 text-[#0D2E1A] placeholder:text-outline"
               />
            </div>
            {/* Componente FarmSelector no topo */}
            <div className="w-72">
               <FarmSelector 
                  farms={farms} 
                  selectedFarmId={selectedFarmId} 
                  onFarmChange={(val) => setSelectedFarmId(val || "")} 
               />
            </div>
         </div>
      </div>

      {/* Sub Header & Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mt-2">
         <div>
            <h2 className="text-[#1A5E35] font-bold flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-sm bg-[#1A5E35]"></div>
               Resumo Operacional
            </h2>
            <p className="text-sm font-medium text-outline">
               Registro de manejo profilático e imunização da granja.
            </p>
         </div>

         <div className="flex flex-col sm:flex-row items-end flex-wrap gap-4">
            <div className="flex gap-4">
               <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-outline">Período</label>
                  <select 
                     value={period}
                     onChange={(e) => setPeriod(e.target.value)}
                     className="border border-outline-variant/50 rounded-lg h-10 px-3 text-sm font-bold text-[#0D2E1A] bg-white outline-none focus:ring-2 focus:ring-[#1A5E35]">
                     <option value="7">Últimos 7 dias</option>
                     <option value="15">Últimos 15 dias</option>
                     <option value="30">Últimos 30 dias</option>
                     <option value="90">Últimos 90 dias</option>
                     <option value="anual">Anual</option>
                  </select>
               </div>
               <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-outline">Tipo de Vacina</label>
                  <select 
                     value={selectedVaccineType}
                     onChange={(e) => setSelectedVaccineType(e.target.value)}
                     className="border border-outline-variant/50 rounded-lg h-10 px-3 text-sm font-bold text-[#0D2E1A] bg-white outline-none focus:ring-2 focus:ring-[#1A5E35]">
                     <option value="Todos os tipos">Todos os tipos</option>
                     {uniqueVaccines.map(v => (
                       <option key={v} value={v}>{v}</option>
                     ))}
                  </select>
               </div>
            </div>
            <button 
               onClick={handleExportPDF}
               disabled={isExporting || filteredData.length === 0}
               className="flex items-center gap-2 px-4 h-10 bg-[#0D2E1A] hover:bg-[#1A5E35] disabled:bg-outline disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all shadow-sm"
            >
               <FileText className="w-4 h-4" /> 
               {isExporting ? "Gerando PDF..." : "Exportar para Boletim Sanitário"}
            </button>
         </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden mt-4 relative min-h-[200px]">
         {loading ? (
           <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
              <span className="text-sm font-bold text-outline animate-pulse">Carregando histórico...</span>
           </div>
         ) : filteredData.length === 0 ? (
           <div className="absolute inset-0 z-10 flex items-center justify-center">
              <span className="text-sm font-bold text-outline">Nenhum evento encontrado para os filtros selecionados.</span>
           </div>
         ) : null}

         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-surface-container-lowest border-b border-outline-variant/30">
                  {table.getHeaderGroups().map((headerGroup) => (
                     <tr key={headerGroup.id}>
                     {headerGroup.headers.map((header) => (
                        <th
                           key={header.id}
                           className="px-6 py-4 text-[10px] font-extrabold text-outline uppercase tracking-wider whitespace-nowrap"
                        >
                           {flexRender(
                           header.column.columnDef.header,
                           header.getContext()
                           )}
                        </th>
                     ))}
                     </tr>
                  ))}
               </thead>
               <tbody className="divide-y divide-outline-variant/20">
                  {table.getRowModel().rows.map((row) => (
                     <tr
                     key={row.id}
                     className="hover:bg-surface-container-lowest/50 transition-colors"
                     >
                     {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                           {flexRender(
                           cell.column.columnDef.cell,
                           cell.getContext()
                           )}
                        </td>
                     ))}
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* Pagination Container */}
      <div className="flex items-center justify-between mt-2 px-2">
         <p className="text-xs font-medium text-outline">
            Exibindo {filteredData.length} registros de vacinação
         </p>
         {filteredData.length > 0 && (
           <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-outline transition-colors text-sm">
                 <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1A5E35] text-white font-bold transition-colors text-sm">
                 1
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-outline transition-colors text-sm">
                 <ChevronRight className="w-4 h-4" />
              </button>
           </div>
         )}
      </div>

      {/* Bottom Cards Widget Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
         
         {/* 1. Cobertura Vacinal */}
         <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-[10px] font-extrabold text-outline uppercase tracking-wider">Cobertura Vacinal</h3>
               <CheckCircle2 className="w-5 h-5 text-[#2e7d32]" />
            </div>
            <div>
               <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-manrope font-extrabold text-[#0D2E1A]">{kpis.coverage}%</span>
                  <span className="text-xs font-bold text-[#2e7d32] bg-[#e8f5e9] px-2 py-0.5 rounded-full flex items-center">
                     Média Lotes
                  </span>
               </div>
               <p className="text-xs font-medium text-outline leading-snug">
                  Meta sanitária global atingida para a granja.
               </p>
            </div>
         </div>

         {/* 2. Próxima Vacinação */}
         <div className="bg-[#1A5E35] rounded-2xl p-6 shadow-md text-white flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 relative z-10">
               <h3 className="text-[10px] font-extrabold text-white/70 uppercase tracking-wider">Próxima Vacinação Padrão</h3>
               <Calendar className="w-5 h-5 text-white/90" />
            </div>
            <div className="relative z-10">
               <div className="flex flex-col gap-1 mb-4">
                 {kpis.nextVaccine.map((vac, idx) => (
                    <h4 key={idx} className={`text-2xl font-manrope font-bold ${idx === 0 ? 'text-white' : 'text-white/70'} leading-tight`}>{vac}</h4>
                 ))}
               </div>
               <p className="text-xs font-medium text-[#a5d6a7] mb-0">Previsto p/: {kpis.nextDateStr}</p>
            </div>
            {/* Background embellishment */}
            <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
         </div>

         {/* 3. Última Auditoria */}
         <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-[10px] font-extrabold text-outline uppercase tracking-wider">Responsável RT</h3>
               <MessageSquareQuote className="w-5 h-5 text-outline" />
            </div>
            
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-full bg-surface-container shrink-0 flex items-center justify-center font-bold text-outline">
                  {kpis.initials}
               </div>
               <div>
                  <h4 className="text-sm font-bold text-[#0D2E1A]">{kpis.responsible}</h4>
                  <p className="text-xs font-medium text-outline">Última Aplicação</p>
               </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/50 relative flex-1">
               <p className="text-xs font-medium text-outline italic leading-relaxed">
                  &quot;Protocolo sanitário monitorado eletronicamente em tempo real.&quot;
               </p>
            </div>
         </div>

      </div>

    </main>
  );
}

export default function W29HistoricoVacinacoesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando...</div>}>
      <W29HistoricoVacinacoesPageContent />
    </Suspense>
  );
}
