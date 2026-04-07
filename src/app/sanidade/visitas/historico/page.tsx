"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  ArrowLeft,
  Search, 
  Plus, 
  Filter, 
  Calendar as CalendarIcon,
  Download,
  AlertTriangle,
  ChevronDown,
  Briefcase,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { getVisitLogs } from "@/app/actions/sanidade";

export default function W31HistoricoVisitasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [visitas, setVisitas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRT, setSelectedRT] = useState("");
  const [selectedGranja, setSelectedGranja] = useState("");
  const [selectedLote, setSelectedLote] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const ITEMS_PER_PAGE = 5;
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getVisitLogs();
      if (res.logs) {
        setVisitas(res.logs);
      } else {
        toast.error("Erro ao carregar histórico de visitas");
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const uniqueRTs = Array.from(new Set(visitas.map(v => v.veterinarian))).filter(Boolean);
  const uniqueGranjas = Array.from(new Set(visitas.map(v => v.flock?.barn?.farm?.name))).filter(Boolean);
  const uniqueLotes = Array.from(new Set(visitas.map(v => v.flock?.name))).filter(Boolean);

  const filteredVisitas = visitas.filter(v => {
    const matchSearchTerm = searchTerm === "" || 
      v.veterinarian.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.flock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.flock.barn.farm.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRT = selectedRT === "" || v.veterinarian === selectedRT;
    const matchGranja = selectedGranja === "" || v.flock.barn.farm.name === selectedGranja;
    const matchLote = selectedLote === "" || v.flock.name === selectedLote;
    
    // v.date vira algo como '2026-04-03T...'
    const matchDate = selectedDate === "" || v.date.startsWith(selectedDate);

    return matchSearchTerm && matchRT && matchGranja && matchLote && matchDate;
  });

  const handleDownload = (id: string) => {
    toast.success(`Laudo técnico ${id} gerado com sucesso!`, {
      description: "O download iniciará em instantes."
    });
  };

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6 relative pb-24">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2 pb-6 border-b border-outline-variant/30">
         <div>
            <Link href="/sanidade" className="inline-flex mb-4">
               <span className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">
               <ArrowLeft className="w-4 h-4" /> Voltar
               
            </span>
            </Link>
            <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
               Histórico de Visitas
            </h1>
         </div>
         
         <div className="flex-1 max-w-xl mx-4">
            <div className="relative group">
               <Search className="w-4 h-4 text-outline absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[#1A5E35] transition-colors" />
               <input 
                  type="text" 
                  placeholder="Buscar por técnico ou lote..." 
                  className="w-full bg-surface-container border border-outline-variant/30 px-10 py-2.5 text-sm font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 focus:border-[#1A5E35] transition-all text-[#0D2E1A]"
                  value={searchTerm}
                  onChange={(e) => {
                     setSearchTerm(e.target.value);
                     setCurrentPage(1);
                  }}
               />
               {/* Faux keyboard shortcut */}
               <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <kbd className="hidden sm:inline-flex items-center justify-center px-2 py-1 text-[10px] font-bold text-outline bg-surface-container-low border border-outline-variant/50 rounded pointer-events-none">⌘</kbd>
                  <kbd className="hidden sm:inline-flex items-center justify-center px-2 py-1 text-[10px] font-bold text-outline bg-surface-container-low border border-outline-variant/50 rounded pointer-events-none">K</kbd>
               </div>
            </div>
         </div>

         <div className="flex items-center gap-4 shrink-0">
            <Link href="/sanidade/visitas/novo">
               <button className="flex items-center gap-2 px-5 py-2.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-full transition-all shadow-md">
                  <Plus className="w-4 h-4" /> Nova Visita
               </button>
            </Link>
         </div>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Visitas */}
         <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
            <h3 className="text-[10px] uppercase tracking-wider font-bold text-outline mb-4">Total de Visitas</h3>
            <div className="flex items-end gap-3">
               <span className="text-4xl font-extrabold text-[#0D2E1A]">{visitas.length}</span>
               <span className="text-sm font-bold text-[#1A5E35] mb-1">Registros</span>
            </div>
         </div>

         {/* Recomendações Pendentes */}
         <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
            <h3 className="text-[10px] uppercase tracking-wider font-bold text-outline mb-4">Recomendações Críticas</h3>
            <div className="flex items-end gap-3">
               <span className="text-4xl font-extrabold text-[#0D2E1A]">
                  {visitas.filter(v => v.report.toLowerCase().includes('crític') || v.report.toLowerCase().includes('imediata') || v.report.toLowerCase().includes('urgente')).length}
               </span>
               <span className="text-sm font-bold text-[#c62828] mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Atenção
               </span>
            </div>
         </div>

         {/* Conformidade Técnica */}
         <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
            <h3 className="text-[10px] uppercase tracking-wider font-bold text-outline mb-4">Conformidade Média</h3>
            <div className="flex items-end gap-4 w-full">
               <span className="text-4xl font-extrabold text-[#0D2E1A]">94%</span>
               <div className="flex-1 mb-2">
                  <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                     <div className="h-full bg-[#1A5E35] rounded-full" style={{ width: '94%' }}></div>
                  </div>
               </div>
            </div>
         </div>

         {/* Última Visita */}
         <div className="bg-[#0D2E1A] rounded-2xl p-6 shadow-md text-white relative overflow-hidden flex flex-col justify-between">
            <h3 className="text-[10px] uppercase tracking-wider font-bold text-white/70 mb-4 z-10 shrink-0">Última Visita</h3>
            <div className="z-10 mt-auto">
               <p className="text-sm font-bold leading-tight truncate">
                   {visitas.length > 0 ? `${visitas[0].flock.barn.farm.name}` : "Nenhuma visita"}
               </p>
               <p className="text-xs text-white/70 mt-1">
                   {visitas.length > 0 ? new Date(visitas[0].date).toLocaleDateString('pt-BR') : "-"}
               </p>
            </div>
            {/* Visual background icon */}
            <Briefcase className="absolute -bottom-4 -right-2 w-24 h-24 text-white/5 -rotate-12 pointer-events-none" />
         </div>
      </div>

      {/* Registros Recentes Header */}
      <div className="flex items-end justify-between mt-6 mb-2">
         <div>
            <h2 className="text-xl font-bold text-[#0D2E1A] tracking-tight">Registros Recentes</h2>
            <p className="text-sm text-outline mt-1 font-medium">Histórico completo de acompanhamento sanitário por lote</p>
         </div>
         <div className="flex items-center gap-2">
            <button 
               onClick={() => setShowFilters(!showFilters)}
               className={`flex items-center gap-2 px-4 py-2 ${showFilters || selectedRT || selectedGranja || selectedLote ? 'bg-[#1A5E35] text-white border-[#1A5E35]' : 'bg-surface-container-low text-[#0D2E1A] border-outline-variant/50'} border hover:opacity-90 text-xs font-bold rounded-lg transition-colors`}
            >
               <Filter className="w-3.5 h-3.5" /> Filtros
            </button>
            <div className="relative flex items-center">
               <button 
                  onClick={() => dateInputRef.current?.showPicker()}
                  className={`flex items-center gap-2 px-4 py-2 ${selectedDate ? 'bg-[#1A5E35] text-white border-[#1A5E35]' : 'bg-surface-container-low text-[#0D2E1A] border-outline-variant/50 hover:bg-surface-container'} border transition-colors text-xs font-bold rounded-lg shadow-sm whitespace-nowrap min-w-[100px] justify-center`}
               >
                  <CalendarIcon className="w-3.5 h-3.5" /> 
                  {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Período'}
               </button>
               
               {/* Botão de limpar (só aparece quando tem data, flutuando no topo direito) */}
               {selectedDate && (
                  <button 
                     onClick={(e) => { e.stopPropagation(); setSelectedDate(""); setCurrentPage(1); }}
                     className="absolute -right-2 -top-2 z-30 p-0.5 bg-[#ffebee] hover:bg-[#ffcdd2] border border-[#ffcdd2] rounded-full text-[#c62828] flex items-center justify-center transition-colors w-5 h-5 shadow-sm"
                     title="Limpar período"
                  >
                     <span className="text-[10px] leading-none mb-[1px]">✕</span>
                  </button>
               )}

               {/* Picker invisível */}
               <input 
                  ref={dateInputRef}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                     setSelectedDate(e.target.value);
                     setCurrentPage(1);
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none w-0 h-0 p-0 m-0 border-0"
               />
            </div>
         </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
         <div className="bg-surface-container rounded-2xl p-4 sm:p-5 border border-outline-variant/30 text-sm mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 shadow-sm">
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] uppercase font-bold text-outline tracking-wider">Técnico (RT)</label>
               <select 
                  className="w-full bg-white border border-outline-variant/50 px-3 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 focus:border-[#1A5E35] text-[#0D2E1A]"
                  value={selectedRT}
                  onChange={e => { setSelectedRT(e.target.value); setCurrentPage(1); }}
               >
                  <option value="">Todos os técnicos</option>
                  {uniqueRTs.map(rt => <option key={rt as string} value={rt as string}>{rt as string}</option>)}
               </select>
            </div>
            
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] uppercase font-bold text-outline tracking-wider">Granja</label>
               <select 
                  className="w-full bg-white border border-outline-variant/50 px-3 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 focus:border-[#1A5E35] text-[#0D2E1A]"
                  value={selectedGranja}
                  onChange={e => { setSelectedGranja(e.target.value); setCurrentPage(1); }}
               >
                  <option value="">Todas as granjas</option>
                  {uniqueGranjas.map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
               </select>
            </div>

            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] uppercase font-bold text-outline tracking-wider">Lote</label>
               <select 
                  className="w-full bg-white border border-outline-variant/50 px-3 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 focus:border-[#1A5E35] text-[#0D2E1A]"
                  value={selectedLote}
                  onChange={e => { setSelectedLote(e.target.value); setCurrentPage(1); }}
               >
                  <option value="">Todos os lotes</option>
                  {uniqueLotes.map(l => <option key={l as string} value={l as string}>{l as string}</option>)}
               </select>
            </div>
         </div>
      )}

      {/* List / Timeline view */}
      <div className="flex flex-col gap-4">
         {loading ? (
             <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-[#1A5E35] animate-spin" />
             </div>
         ) : filteredVisitas.length === 0 ? (
             <div className="bg-white rounded-2xl p-12 border border-outline-variant/30 text-center font-bold text-outline">
                Nenhum registro de visita encontrado.
             </div>
         ) : (() => {
            const totalPages = Math.ceil(filteredVisitas.length / ITEMS_PER_PAGE);
            const paginatedVisitas = filteredVisitas.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

            return (
               <>
                  {paginatedVisitas.map((visita) => {
                     const dateObj = new Date(visita.date);
                     const mes = dateObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
                     const dia = dateObj.getDate().toString().padStart(2, '0');
                     const rel = visita.report || "";
                     const isCritical = rel.toLowerCase().includes('crític') || rel.toLowerCase().includes('imediata') || rel.toLowerCase().includes('urgente') || rel.toLowerCase().includes('atenção');

            return (
               <div key={visita.id} className="bg-white rounded-2xl p-4 sm:p-6 border border-outline-variant/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 hover:shadow-md transition-shadow group">
                  
                  {/* Date Badge */}
                  <div className="bg-[#e8f5e9] w-14 h-14 rounded-full flex flex-col items-center justify-center shrink-0 border border-[#c8e6c9]">
                     <span className="text-[10px] font-extrabold text-[#2e7d32] uppercase -mb-1">{mes}</span>
                     <span className="text-xl font-black text-[#1A5E35]">{dia}</span>
                  </div>

                  {/* Granja/Lote info */}
                  <div className="w-full sm:w-48 lg:w-64 shrink-0">
                     <p className="text-sm font-bold text-[#0D2E1A]">{visita.flock.barn.farm.name}</p>
                     <p className="text-xs font-medium text-outline mt-0.5">{visita.flock.name} | {visita.veterinarian}</p>
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:block w-px h-10 bg-outline-variant/30 shrink-0"></div>

                  {/* Observações / Pêndencias */}
                  <div className="flex-1 py-1">
                     {isCritical ? (
                        <p className="text-[10px] font-bold text-[#c62828] uppercase tracking-wider mb-1">Atenção Requerida</p>
                     ) : (
                        <p className="text-[10px] font-bold text-[#1A5E35] uppercase tracking-wider mb-1">Recomendações</p>
                     )}
                     <p className="text-sm font-medium text-[#0D2E1A] italic line-clamp-2 max-w-3xl group-hover:line-clamp-none transition-all duration-300">
                        "{visita.report}"
                     </p>
                  </div>

                  {/* Actions / Status */}
                  <div className="flex items-center gap-4 shrink-0 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                     <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        <span className="bg-[#e8f5e9] text-[#2e7d32] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-[#c8e6c9]">
                           Registrado
                        </span>

                        {/* Avatar */}
                        <div 
                           className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/50 shadow-sm shrink-0 bg-surface-container flex items-center justify-center text-[10px] font-bold text-[#0D2E1A]"
                           title={visita.veterinarian}
                        >
                           {visita.veterinarian.split(' ').map((n:string) => n[0]).slice(0,2).join('')}
                        </div>
                     </div>

                     <button 
                        onClick={() => handleDownload(visita.id)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline-variant/50 text-outline hover:text-[#1A5E35] hover:border-[#1A5E35]/50 hover:bg-[#1A5E35]/5 transition-colors"
                        title="Fazer download do laudo"
                     >
                        <Download className="w-4 h-4" />
                     </button>
                  </div>
                  
               </div>
            );
         })}
         
         {Math.ceil(filteredVisitas.length / ITEMS_PER_PAGE) > 1 && (
            <div className="flex justify-center items-center mt-6 gap-3">
               <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-5 py-2.5 bg-white border border-outline-variant/30 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-surface-container transition-colors text-[#0D2E1A] shadow-sm"
               >
                  Anterior
               </button>
               
               <div className="px-5 py-2.5 bg-surface-container-lowest rounded-xl text-sm font-bold text-[#0D2E1A] border border-outline-variant/30 shadow-sm">
                  Página {currentPage} de {Math.ceil(filteredVisitas.length / ITEMS_PER_PAGE)}
               </div>

               <button 
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredVisitas.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={currentPage === Math.ceil(filteredVisitas.length / ITEMS_PER_PAGE)}
                  className="px-5 py-2.5 bg-white border border-outline-variant/30 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-surface-container transition-colors text-[#0D2E1A] shadow-sm"
               >
                  Próxima
               </button>
            </div>
         )}
         </>
         );
         })()}
      </div>

   </main>
  );
}
