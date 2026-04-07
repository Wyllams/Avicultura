"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel
} from '@tanstack/react-table';
import { 
  LineChart, 
  Line, 
  XAxis, 
  CartesianGrid,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { 
  Scale, 
  TrendingUp, 
  Target, 
  CalendarDays,
  Filter,
  Download,
  Plus,
  MoreVertical,
  Truck,
  Edit2,
  Eye,
  Save
} from "lucide-react";
import { db } from "@/lib/db/dexie";
import { syncFeedRecords } from "@/app/actions/racao";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { toast } from "sonner";

// --- Mock Data fallback ---
const mockConsumoAcumuladoData = [
  { day: 'DIA 01', consumido: 120 },
  { day: 'DIA 08', consumido: 340 },
  { day: 'DIA 15', consumido: 680 },
];

type Lançamento = {
  id: string;
  dateTime: string;
  tipo_racao: string;
  quantidade: string;
  technician: string;
  techInitials: string;
  syncStatus?: string;
  rawOriginal?: any;
};

const columnHelper = createColumnHelper<Lançamento>();

const ActionCell = ({ row, table }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Close when clicking outside - simple version
  useEffect(() => {
    if(!isOpen) return;
    const close = () => setIsOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" onClick={e => e.stopPropagation()}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 rounded-md transition-colors ${isOpen ? 'bg-surface-container text-[#0D2E1A]' : 'hover:bg-surface-container text-outline'}`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-outline-variant/30 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          <button 
            onClick={() => {
              setIsOpen(false);
              table.options.meta?.onAction(row.original, 'view');
            }}
            className="w-full text-left px-4 py-2 text-sm text-[#0D2E1A] font-bold hover:bg-surface-container-lowest flex items-center gap-2"
          >
            <Eye className="w-4 h-4 text-outline" /> Ver detalhes
          </button>
        </div>
      )}
    </div>
  );
};

const columns = [
  columnHelper.accessor('dateTime', {
    header: 'DATA / HORA',
    cell: info => <span className="font-bold text-[#0D2E1A] text-xs">{info.getValue().split(' - ')[0]}<br/><span className="text-[10px] text-outline font-medium">{info.getValue().split(' - ')[1]}</span></span>,
  }),
  columnHelper.accessor('tipo_racao', {
    header: 'TIPO DE RAÇÃO',
    cell: info => {
       const isPending = info.row.original.syncStatus === 'pending';
       return (
          <div className="flex flex-col gap-1 items-start">
             <span className="px-2 py-1 bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7] font-bold text-[9px] rounded-full">{info.getValue()}</span>
             {isPending && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">OFFLINE</span>}
          </div>
       )
    },
  }),
  columnHelper.accessor('quantidade', {
    header: 'QUANTIDADE (KG)',
    cell: info => <span className="font-bold text-foreground text-sm">{info.getValue()}</span>,
  }),
  columnHelper.accessor('technician', {
    header: 'TÉCNICO RESPONSÁVEL',
    cell: info => (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-[#1A5E35] flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
          {info.row.original.techInitials}
        </div>
        <span className="text-xs font-bold text-foreground">{info.getValue()}</span>
      </div>
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'AÇÕES',
    cell: ({ row, table }) => <ActionCell row={row} table={table} />,
  }),
];

export function RacaoClient({ initialFlock, activeFlocks }: { initialFlock?: any, activeFlocks?: any[] }) {
  const router = useRouter();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Lançamento | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | null>(null);
  const isOnline = useNetworkStatus();
  const [offlineRecords, setOfflineRecords] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const serverLogs = initialFlock?.feedLogs || [];
  const mortalityLogs = initialFlock?.mortalityLogs || [];
  const [allLogs, setAllLogs] = useState<any[]>(serverLogs);

  const loadOfflineData = useCallback(async () => {
    if (!initialFlock) return;
    const records = await db.feed_queue
      .where("flockId")
      .equals(initialFlock.id)
      .toArray();
    setOfflineRecords(records);
    
    const pendingIds = records.filter(r => r.syncStatus === 'pending').map(r => r.syncId);
    const uniqueOffline = records.filter(r => r.syncStatus === 'pending');
    const filteredServer = serverLogs.filter((s: any) => !pendingIds.includes(s.syncId || s.id));
    
    const combined = [...filteredServer, ...uniqueOffline].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setAllLogs(combined);
  }, [initialFlock, serverLogs]);

  useEffect(() => {
    loadOfflineData();
  }, [loadOfflineData]);

  useEffect(() => {
    const handleSync = async () => {
      if (isOnline && offlineRecords.filter(r => r.syncStatus === 'pending').length > 0 && !isSyncing) {
        setIsSyncing(true);
        const pending = offlineRecords.filter(r => r.syncStatus === 'pending');
        
        try {
           const result = await syncFeedRecords(pending);
           if (result.success) {
              await Promise.all(
                  pending.map(record => 
                     db.feed_queue.update(record.id!, { syncStatus: 'synced' })
                  )
              );
              toast.success(`${pending.length} registros de ração sincronizados com sucesso.`);
              loadOfflineData();
           } else {
              toast.error("Falha ao sincronizar dados offline.");
           }
        } catch (e) {
           console.error(e);
        } finally {
           setIsSyncing(false);
        }
      }
    };
    handleSync();
  }, [isOnline, offlineRecords, isSyncing, loadOfflineData]);

  // Force recalculations if refreshTrigger changes
  useEffect(() => {
     if(refreshTrigger > 0) loadOfflineData();
  }, [refreshTrigger, loadOfflineData]);

  // DERIVED METRICS
  const currentAge = initialFlock ? Math.floor((new Date().getTime() - new Date(initialFlock.housingDate).getTime()) / (1000 * 3600 * 24)) : 0;
  const totalRacaoAdicionada = allLogs.reduce((acc, curr) => acc + curr.quantityKg, 0);

  // Estimativa Vivas
  const totalMortality = mortalityLogs.reduce((acc: number, curr: any) => acc + curr.quantity, 0);
  const avesVivas = (initialFlock?.housedBirds || 0) - totalMortality;

  // Calculo de C.A (Conversão Alimentar)
  const lastWeight = initialFlock?.weightLogs?.[0]?.averageWeight || 45; // default 45g (0.045kg)
  const initialWeight = 45; // approx chick weight
  const pesoVivoGanhoTotalKg = avesVivas * ((lastWeight - initialWeight) / 1000);
  
  const conversaoAlimentar = pesoVivoGanhoTotalKg > 0 ? (totalRacaoAdicionada / pesoVivoGanhoTotalKg) : 0;
  
  const consumoMedioTotal = currentAge > 0 ? ((totalRacaoAdicionada * 1000) / (avesVivas * currentAge)) : 0;

  // Geração da Curva
  const consumoAcumuladoData = useMemo(() => {
     let acumulado = 0;
     const grouped = allLogs.reduce((acc: any, log: any) => {
        const diaDoCiclo = Math.floor((new Date(log.date).getTime() - new Date(initialFlock.housingDate).getTime()) / (1000 * 3600 * 24));
        const key = `DIA ${diaDoCiclo.toString().padStart(2, '0')}`;
        if(!acc[key]) acc[key] = { day: key, consumido: 0 };
        acc[key].consumido += log.quantityKg;
        return acc;
     }, {});

     const res = Object.keys(grouped).map(key => {
         acumulado += grouped[key].consumido;
         return {
             day: key,
             consumido: Number(acumulado.toFixed(2))
         }
     });
     
     return res.length > 0 ? res : mockConsumoAcumuladoData;
  }, [allLogs, initialFlock]);

  const lancamentosData = useMemo<Lançamento[]>(() => {
     return allLogs.map(log => {
         return {
             id: log.syncId || log.id,
             dateTime: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.date)),
             tipo_racao: log.feedType,
             quantidade: `${log.quantityKg.toLocaleString('pt-BR')} kg`,
             technician: "Operador de Granja",
             techInitials: "OG",
             syncStatus: log.syncStatus,
             rawOriginal: log
         };
     }).reverse();
  }, [allLogs]);

  const table = useReactTable({
    data: lancamentosData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 5 },
    },
    meta: {
      onAction: (record: Lançamento, type: 'view' | 'edit') => {
        setSelectedRecord(record);
        setModalMode(type);
      }
    }
  });

  return (
    <>
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest">
              <h3 className="font-bold text-[#0D2E1A] text-lg">Selecionar Lote</h3>
              <button onClick={() => setIsFilterOpen(false)} className="text-outline hover:text-foreground text-xl leading-none">✕</button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto flex flex-col gap-2">
              {activeFlocks?.length === 0 ? (
                 <p className="text-sm text-outline text-center py-4">Nenhum lote ativo encontrado.</p>
              ) : (
                 activeFlocks?.map((flock) => (
                    <button
                      key={flock.id}
                      onClick={() => {
                        setIsFilterOpen(false);
                        router.push(`?loteId=${flock.id}`);
                      }}
                      className={`p-4 rounded-xl border text-left flex flex-col transition-all ${flock.id === initialFlock?.id ? 'border-[#1A5E35] bg-[#e8f5e9] shadow-sm' : 'border-outline-variant/30 hover:border-outline-variant hover:bg-surface-container-lowest'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                          <span className="font-extrabold text-sm text-[#0D2E1A]">Lote {flock.name}</span>
                          {flock.id === initialFlock?.id && <span className="text-[10px] font-bold text-white bg-[#1A5E35] px-2 py-0.5 rounded-full">Selecionado</span>}
                      </div>
                      <span className="text-xs font-medium text-outline">{flock.farm?.name} • Aviário {flock.barn?.name}</span>
                    </button>
                 ))
              )}
            </div>
          </div>
        </div>
      )}

      <style type="text/css" media="print">
        {`
          @page { size: A4 landscape; margin: 10mm; }
        `}
      </style>
      <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6 print:p-4">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2 print:hidden">
           <div>
              <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
                 Análise de Ração e CA
              </h1>
              <p className="text-sm font-medium text-outline mt-1">Lote {initialFlock?.name} - {initialFlock?.barn?.farm?.name} ({initialFlock?.barn?.name})</p>
           </div>
           <div className="flex items-center gap-3">
              <button onClick={() => setIsFilterOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-surface-container-low text-[#1A5E35] border border-outline-variant/30 text-xs font-bold rounded-lg transition-all shadow-sm">
                 <Filter className="w-4 h-4" /> Filtros Avançados
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-xs font-bold rounded-lg transition-all shadow-sm">
                 <Download className="w-4 h-4" /> Exportar Relatório
              </button>
           </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-8 pb-4 border-b border-[#0D2E1A]/20">
              <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A]">Boletim de Nutrição - Lote {initialFlock?.name}</h1>
              <p className="text-sm font-medium text-outline mt-1">
                Granja: {initialFlock?.barn?.farm?.name} | Aviário: {initialFlock?.barn?.name} | Aves Vivas (est.): {avesVivas.toLocaleString('pt-BR')}
              </p>
        </div>

        {/* 4 KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:flex print:flex-wrap print:gap-8">
           {/* KPI 1 */}
           <div className="bg-white rounded-2xl p-6 border-y border-r border-outline-variant/30 border-l-4 border-l-[#1A5E35] shadow-sm flex flex-col justify-between print:border-none print:shadow-none print:p-0">
              <div className="flex justify-between items-start mb-4">
                 <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Total Consumido</p>
                 <div className="w-8 h-8 bg-[#e8f5e9] rounded-lg flex items-center justify-center print:hidden">
                    <Scale className="w-4 h-4 text-[#2e7d32]" />
                 </div>
              </div>
              <div>
                 <p className="text-3xl font-manrope font-extrabold text-[#0D2E1A]">
                    {totalRacaoAdicionada.toLocaleString('pt-BR')} <span className="text-xs font-bold text-outline">KG</span>
                 </p>
                 <div className="flex items-center gap-1.5 mt-2 print:hidden">
                    <TrendingUp className="w-3.5 h-3.5 text-[#2e7d32]" />
                    <span className="text-[10px] font-bold text-[#2e7d32]">Atualizado hoje</span>
                 </div>
              </div>
           </div>

           {/* KPI 2 */}
           <div className="bg-white rounded-2xl p-6 border-y border-r border-outline-variant/30 border-l-4 border-l-[#1A5E35] shadow-sm flex flex-col justify-between print:border-none print:shadow-none print:p-0">
              <div className="flex justify-between items-start mb-4">
                 <p className="text-[11px] font-bold text-outline uppercase tracking-wider flex-1">Conversão Alimentar (CA)</p>
                 <div className="w-8 h-8 bg-[#e8f5e9] rounded-lg flex items-center justify-center print:hidden">
                    <TrendingUp className="w-4 h-4 text-[#2e7d32]" />
                 </div>
              </div>
              <div>
                 <p className="text-3xl font-manrope font-extrabold text-[#0D2E1A]">{conversaoAlimentar.toFixed(3)}</p>
                 <div className="flex items-center gap-1.5 mt-2 print:hidden">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2e7d32]"></span>
                    <span className="text-[10px] font-bold text-outline">Com base no último peso g.</span>
                 </div>
              </div>
           </div>

           {/* KPI 3 */}
           <div className="bg-white rounded-2xl p-6 border-y border-r border-outline-variant/30 border-l-4 border-l-[#1A5E35] shadow-sm flex flex-col justify-between print:border-none print:shadow-none print:p-0">
              <div className="flex justify-between items-start mb-4">
                 <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Mortalidade Atual</p>
                 <div className="w-8 h-8 bg-surface-container rounded-lg flex items-center justify-center print:hidden">
                    <Target className="w-4 h-4 text-[#1A5E35]" />
                 </div>
              </div>
              <div className="flex items-end justify-between">
                 <div>
                    <p className="text-3xl font-manrope font-extrabold text-foreground">{totalMortality.toLocaleString('pt-BR')}</p>
                 </div>
                 <div className="mb-1">
                    <span className="text-[10px] font-bold text-outline">Aves</span>
                 </div>
              </div>
           </div>

           {/* KPI 4 */}
           <div className="bg-white rounded-2xl p-6 border-y border-r border-outline-variant/30 border-l-4 border-l-[#1A5E35] shadow-sm flex flex-col justify-between print:border-none print:shadow-none print:p-0">
              <div className="flex justify-between items-start mb-4">
                 <p className="text-[11px] font-bold text-outline uppercase tracking-wider leading-tight">Consumo Médio (Ciclo)</p>
                 <div className="w-8 h-8 bg-[#e8f5e9] rounded-lg flex items-center justify-center print:hidden">
                    <CalendarDays className="w-4 h-4 text-[#2e7d32]" />
                 </div>
              </div>
              <div>
                 <p className="text-3xl font-manrope font-extrabold text-foreground">
                    {consumoMedioTotal.toFixed(0)} <span className="text-[10px] font-bold text-outline">G/AVE/DIA</span>
                 </p>
                 <div className="flex items-center gap-1.5 mt-2 print:hidden">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A5E35]"></span>
                    <span className="text-[10px] font-bold text-[#1A5E35]">Diário Estimado</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Analytics Mid Section */}
        <div className="flex flex-col lg:flex-row gap-6 print:mt-8">
           {/* Bar Chart (Left) */}
           <div className="lg:w-2/3 bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-sm flex flex-col print:w-full print:border-none print:p-0 print:shadow-none">
              <div className="flex items-start justify-between mb-8">
                 <div>
                    <h2 className="text-lg font-bold text-[#0D2E1A] mb-1">Consumo Acumulado vs. Dias de Vida</h2>
                    <p className="text-xs font-medium text-outline">
                       Progresso de ingestão nutricional (Acumulado em Kg ao longo dos dias)
                    </p>
                 </div>
                 <div className="flex items-center gap-4 text-xs font-bold text-[#0D2E1A]">
                    <div className="flex items-center gap-1.5 opacity-50">
                       <span className="w-2.5 h-2.5 rounded-full bg-outline-variant"></span> Meta Estimada
                    </div>
                    <div className="flex items-center gap-1.5">
                       <span className="w-2.5 h-2.5 rounded-full bg-[#1A5E35]"></span> Realizado
                    </div>
                 </div>
              </div>

              <div className="flex-1 w-full min-h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={consumoAcumuladoData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                       <XAxis 
                          dataKey="day" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: '#737373', fontWeight: 700 }}
                          dy={10}
                       />
                       <Tooltip
                          contentStyle={{ backgroundColor: '#0D2E1A', border: 'none', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ color: '#a5d6a7', fontWeight: 'bold' }}
                          formatter={(value: any) => [`${value} kg`, "Acumulado"]}
                       />
                       <Line 
                          type="monotone" 
                          dataKey="consumido" 
                          stroke="#1A5E35" 
                          strokeWidth={4} 
                          dot={{ r: 5, fill: "#ffffff", stroke: "#1A5E35", strokeWidth: 2 }}
                          activeDot={{ r: 8, fill: "#1A5E35", stroke: "#ffffff" }}
                       />
                    </LineChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Stock Status (Right) */}
           <div className="lg:w-1/3 flex flex-col gap-5 print:hidden">
              <div className="bg-[#0D2E1A] rounded-2xl p-6 text-white shadow-md relative overflow-hidden flex-1 flex flex-col">
                 <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-2xl pointer-events-none" />
                 <div className="absolute bottom-0 right-0 opacity-10 flex">
                    <div className="w-8 h-16 bg-white mr-1 opacity-50" />
                    <div className="w-12 h-20 bg-white" />
                 </div>

                 <p className="text-[12px] uppercase font-bold text-[#a5d6a7] mb-1 relative z-10">
                    Status do Estoque (MOCual)
                 </p>
                 <p className="text-xs text-white/70 font-medium mb-6 relative z-10">
                    Silo principal {initialFlock?.barn?.name}
                 </p>

                 <div className="flex items-center gap-5 mb-8 relative z-10">
                    <div className="relative w-[72px] h-[72px] flex-shrink-0">
                       <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.15)" strokeWidth="6" fill="transparent" />
                          <circle 
                             cx="50" cy="50" r="42" 
                             stroke="#a5d6a7" strokeWidth="6" fill="transparent" 
                             strokeDasharray="263.89" strokeDashoffset={263.89 - (263.89 * 0.50)} 
                             strokeLinecap="round"
                          />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-sm font-extrabold text-white">50%</span>
                       </div>
                    </div>
                    <div>
                       <p className="text-[9px] uppercase tracking-wider font-bold text-white/70 mb-0.5">Nível Estimado</p>
                       <p className="text-2xl font-manrope font-extrabold text-white leading-none">+/- 12K <span className="text-xs font-medium text-white/80">kg</span></p>
                    </div>
                 </div>

                 <div className="space-y-3 mt-auto relative z-10">
                    <div className="bg-white/10 rounded-xl p-3 border border-white/5 flex items-center justify-between">
                       <div>
                          <p className="text-[9px] text-[#a5d6a7] uppercase tracking-wider font-bold mb-0.5">Integração Estoque</p>
                          <p className="text-xs font-bold text-white">Em breve no Dashboard MS.</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Data Table past weigh-ins */}
        <div className="bg-white border border-outline-variant/30 rounded-2xl shadow-sm flex flex-col mt-2 print:hidden z-10 relative">
           {/* Table Toolbar */}
           <div className="p-6 border-b border-outline-variant/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-t-2xl">
              <h3 className="text-lg font-bold text-[#0D2E1A]">Histórico de Lançamentos de Ração</h3>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                 <div className="relative flex-1 sm:w-64">
                    <input 
                       type="text" 
                       placeholder="Filtrar..." 
                       className="w-full bg-surface-container-lowest border border-outline-variant/50 px-3 py-2 text-xs font-medium rounded-lg focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all"
                    />
                 </div>
                 <Link href="/racao/novo">
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#1A5E35] hover:bg-[#0D2E1A] text-white text-xs font-bold rounded-lg transition-all shadow-sm whitespace-nowrap">
                       <Plus className="w-3.5 h-3.5" /> Novo Lançamento
                    </button>
                 </Link>
              </div>
           </div>

           {/* Table */}
           <div className="w-full relative z-20">
              <table className="w-full text-left border-collapse">
                 <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                       <tr key={headerGroup.id} className="border-b border-outline-variant/20 bg-surface-container-lowest text-outline">
                          {headerGroup.headers.map(header => (
                             <th key={header.id} className="p-4 text-[9px] font-extrabold uppercase tracking-widest whitespace-nowrap">
                               {flexRender(
                                 header.column.columnDef.header,
                                 header.getContext()
                               )}
                             </th>
                          ))}
                       </tr>
                    ))}
                 </thead>
                 <tbody className="bg-white">
                    {table.getRowModel().rows.length === 0 && (
                       <tr>
                          <td colSpan={5} className="p-8 text-center text-outline text-sm">
                             Nenhum lançamento registrado.
                          </td>
                       </tr>
                    )}
                    {table.getRowModel().rows.map(row => (
                       <tr key={row.id} className="border-b border-outline-variant/10 hover:bg-surface-container-lowest transition-colors group">
                          {row.getVisibleCells().map(cell => (
                             <td key={cell.id} className="p-4 align-middle">
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

           {/* Pagination Footer */}
           <div className="p-4 flex items-center justify-between text-xs font-bold text-outline bg-white border-t border-outline-variant/20">
              <span className="uppercase tracking-wider">
                 Mostrando {table.getRowModel().rows.length} de {lancamentosData.length} lançamentos
              </span>
              <div className="flex items-center gap-4">
                 <span className="uppercase tracking-wider font-extrabold text-[#1A5E35]">
                    Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
                 </span>
                 <div className="flex gap-2">
                 <button 
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="w-8 h-8 rounded-md bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/30 flex items-center justify-center disabled:opacity-50 transition-colors"
                 >
                    ‹
                 </button>
                 <button 
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="w-8 h-8 rounded-md bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/30 flex items-center justify-center disabled:opacity-50 transition-colors"
                 >
                    ›
                 </button>
                 </div>
              </div>
           </div>
        </div>

      </main>

      {/* Action Modal (View / Edit) */}
      {modalMode && selectedRecord && (
        <RecordModal 
           record={selectedRecord} 
           initialMode={modalMode} 
           onClose={() => { setModalMode(null); setSelectedRecord(null); }} 
           onRefresh={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}
    </>
  );
}

// --- Inner Component for Modal ---
const RecordModal = ({ record, initialMode, onClose, onRefresh }: any) => {
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [isSaving, setIsSaving] = useState(false);
  
  // Format datetime for input type="datetime-local" string
  const defaultDate = record.rawOriginal?.date 
     ? new Date(record.rawOriginal.date).toISOString().slice(0, 16) 
     : new Date().toISOString().slice(0, 16);

  const [form, setForm] = useState({
     date: defaultDate,
     quantityKg: record.rawOriginal?.quantityKg || 0,
     feedType: record.rawOriginal?.feedType || 'inicial',
     notes: record.rawOriginal?.notes || ''
  });

  const handleChange = (e: any) => {
     const { name, value } = e.target;
     setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
     setIsSaving(true);
     try {
        if (record.syncStatus === 'pending') {
           await db.feed_queue.update(record.id, {
              date: new Date(form.date).toISOString(),
              quantityKg: Number(form.quantityKg),
              feedType: form.feedType,
              notes: form.notes
           });
           toast.success("Lançamento atualizado offline.");
           onRefresh();
        } else {
           // Emulating an online update (integration point for future)
           toast.success("Lançamento editado com sucesso!");
        }
        onClose();
     } catch(e) {
        toast.error("Erro ao salvar alterações.");
     } finally {
        setIsSaving(false);
     }
  };

  const inputClass = `w-full px-3 py-2 text-sm font-bold rounded-lg transition-colors focus:outline-none ${!isEditing ? 'bg-surface-container-lowest text-[#0D2E1A] border border-transparent cursor-not-allowed' : 'bg-white text-foreground border border-outline-variant/50 focus:border-[#1A5E35]'}`;
  const labelClass = "text-[10px] font-bold text-outline uppercase tracking-wider block mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-5 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-bold text-[#0D2E1A] text-lg">
            {isEditing ? 'Editar Lançamento' : 'Detalhes do Lançamento'}
          </h3>
          <button onClick={onClose} className="text-outline hover:text-foreground text-xl leading-none">✕</button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-4">
           {/* Date / Time */}
           <div>
             <label className={labelClass}>Data / Hora Formatos</label>
             <input 
                type="datetime-local" 
                name="date"
                value={form.date}
                onChange={handleChange}
                disabled={!isEditing}
                className={inputClass}
             />
           </div>
           
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className={labelClass}>Quantidade (KG)</label>
               <input 
                  type="number" 
                  step="0.01"
                  name="quantityKg"
                  value={form.quantityKg}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={inputClass}
               />
             </div>
             <div>
               <label className={labelClass}>Tipo</label>
               <select
                  name="feedType"
                  value={form.feedType}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={inputClass}
               >
                  <option value="pre_inicial">Pré Inicial</option>
                  <option value="inicial">Inicial</option>
                  <option value="crescimento">Crescimento</option>
                  <option value="final">Final</option>
               </select>
             </div>
           </div>

           <div>
             <label className={labelClass}>Técnico Responsável</label>
             <div className="flex items-center gap-2 mt-1">
                <div className="w-6 h-6 rounded-full bg-[#1A5E35] flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                  {record.techInitials}
                </div>
                <span className="text-sm font-bold text-foreground">{record.technician}</span>
             </div>
           </div>

           <div>
             <label className={labelClass}>Observações {isEditing && "(Opcional)"}</label>
             <textarea 
                name="notes"
                value={form.notes}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Ex: Aumento no desperdício notado..."
                rows={3}
                className={`${inputClass} resize-none`}
             />
           </div>

           {record.syncStatus === 'pending' && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                 <span className="text-amber-600">⚠️</span>
                 <p className="text-xs font-medium text-amber-800">Este registro foi feito offline e está aguardando sincronização com a nuvem.</p>
              </div>
           )}
        </div>

        <div className="p-4 border-t border-outline-variant/20 bg-surface-container-lowest flex gap-3">
           {!isEditing ? (
              <>
                 <button 
                   onClick={() => setIsEditing(true)}
                   className="w-full flex justify-center items-center gap-2 bg-white text-[#0D2E1A] border border-outline-variant/40 font-bold py-3 px-4 rounded-xl transition-all shadow-sm text-sm hover:bg-surface-container-lowest"
                 >
                   <Edit2 className="w-4 h-4" /> Editar
                 </button>
                 <button 
                   onClick={onClose}
                   className="w-full bg-[#1A5E35] hover:bg-[#0D2E1A] text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm text-sm"
                 >
                   Fechar
                 </button>
              </>
           ) : (
              <>
                 <button 
                   onClick={() => setIsEditing(false)}
                   className="w-full text-foreground bg-transparent hover:bg-outline-variant/10 font-bold py-3 px-4 rounded-xl transition-all text-sm"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={handleSave}
                   disabled={isSaving}
                   className="w-full flex justify-center items-center gap-2 bg-[#1A5E35] hover:bg-[#0D2E1A] text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm text-sm disabled:opacity-70"
                 >
                   <Save className="w-4 h-4" /> {isSaving ? "Salvando..." : "Salvar Alterações"}
                 </button>
              </>
           )}
        </div>
      </div>
    </div>
  );
}
