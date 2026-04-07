"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  AlertCircle, 
  MoreVertical, 
  Filter, 
  Plus,
  ArrowLeft
} from "lucide-react";
import { db } from "@/lib/db/dexie";

type WeighIn = {
  id: string;
  dateTime: string;
  age: number;
  weightStr: string;
  status: "OPTIMAL" | "DEVIATION";
  statusText: string;
  technician: string;
  techInitials: string;
};

const columnHelper = createColumnHelper<WeighIn>();

const columns = [
  columnHelper.accessor('dateTime', {
    header: 'DATA & HORA',
    cell: info => <span className="font-bold text-[#0D2E1A] text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor('age', {
    header: 'IDADE (DIAS)',
    cell: info => <span className="text-outline font-medium text-xs">{info.getValue()} dias</span>,
  }),
  columnHelper.accessor('weightStr', {
    header: 'PESO (G)',
    cell: info => <span className="font-bold text-foreground text-sm">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'STATUS',
    cell: info => {
      const isOptimal = info.getValue() === "OPTIMAL";
      const txt = info.row.original.statusText;
      if (isOptimal) {
        return (
          <span className="px-2 py-1 bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7] uppercase tracking-wider font-bold text-[9px] rounded-full">
            {txt}
          </span>
        );
      }
      return (
        <span className="px-2 py-1 bg-[#ffebee] text-[#c62828] border border-[#ffcdd2] uppercase tracking-wider font-bold text-[9px] rounded-full">
          {txt}
        </span>
      );
    },
  }),
  columnHelper.accessor('technician', {
    header: 'TÉCNICO',
    cell: info => (
      <div className="flex items-center gap-2">
         <span className="text-xs font-bold text-foreground">{info.getValue()}</span>
      </div>
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'AÇÕES',
    cell: () => (
      <button className="p-1 hover:bg-surface-container rounded-md transition-colors text-outline">
        <MoreVertical className="w-4 h-4" />
      </button>
    ),
  }),
];

export function PesagensHistoricoClient({ initialFlock }: { initialFlock?: any }) {
  const [offlineRecords, setOfflineRecords] = useState<any[]>([]);
  
  const serverLogs = initialFlock?.weightLogs || [];
  
  const [allLogs, setAllLogs] = useState<any[]>(serverLogs);

  useEffect(() => {
    if (!initialFlock) return;
    const fetchOffline = async () => {
      const records = await db.weighing_queue
        .where("flockId")
        .equals(initialFlock.id)
        .toArray();
      setOfflineRecords(records);
      
      const pendingIds = records.filter(r => r.syncStatus === 'pending').map(r => r.syncId);
      const uniqueOffline = records.filter(r => r.syncStatus === 'pending');
      const filteredServer = serverLogs.filter((s: any) => !pendingIds.includes(s.syncId || s.id));
      
      const combined = [...filteredServer, ...uniqueOffline].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setAllLogs(combined);
    };
    fetchOffline();
  }, [initialFlock, serverLogs]);

  // Derived Data
  const getAgeFromDate = (dateStr: string) => {
      if (!initialFlock?.housingDate) return 1;
      const msDiff = new Date(dateStr).getTime() - new Date(initialFlock.housingDate).getTime();
      const diff = Math.floor(msDiff / (1000 * 3600 * 24));
      return diff >= 0 ? diff + 1 : 1;
  };

  const growthData = useMemo(() => {
      let expectedStart = 45; // grams standard cobb day 0
      return allLogs.map((log) => {
          const actualAge = getAgeFromDate(log.date);
          const expected = expectedStart + (actualAge * 65); // standard mock reference for now
          return {
              day: `D${actualAge}`,
              real: Number((log.averageWeight / 1000).toFixed(3)),
              reference: Number((expected / 1000).toFixed(3)),
          }
      });
  }, [allLogs, initialFlock]);

  const latestWeighing = allLogs.length > 0 ? allLogs[allLogs.length - 1] : null;
  const previousWeighing = allLogs.length > 1 ? allLogs[allLogs.length - 2] : null;

  let gpd = 0;
  if (latestWeighing && previousWeighing && latestWeighing.ageInDays > previousWeighing.ageInDays) {
     const weightDiff = latestWeighing.averageWeight - previousWeighing.averageWeight;
     const daysDiff = latestWeighing.ageInDays - previousWeighing.ageInDays;
     gpd = Number((weightDiff / daysDiff).toFixed(2));
  } else if (latestWeighing && latestWeighing.ageInDays > 0) {
      gpd = Number((latestWeighing.averageWeight / latestWeighing.ageInDays).toFixed(2));
  }

  const weighInsData = useMemo<WeighIn[]>(() => {
      return allLogs.map(log => {
          const isPending = log.syncStatus === 'pending';
          return {
              id: log.syncId || log.id,
              dateTime: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.date)),
              age: log.ageInDays,
              weightStr: `${log.averageWeight} g`,
              status: (isPending ? "DEVIATION" : "OPTIMAL") as "OPTIMAL" | "DEVIATION",
              statusText: isPending ? "PENDENTE SYNC" : "SALVO",
              technician: "Operador de Granja",
              techInitials: "OG"
          };
      }).reverse();
  }, [allLogs]);

  const table = useReactTable({
    data: weighInsData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 8 },
    },
  });

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
         <div>
            <Link href="/pesagens" className="inline-flex mb-4">
               <span className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">
               <ArrowLeft className="w-4 h-4" /> Voltar para Lançamentos
               
            </span>
            </Link>
            
            <h1 className="text-3xl font-manrope font-bold text-foreground tracking-tight">
               Histórico de Pesagens
            </h1>
         </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* KPI 1 */}
         <div className="bg-white rounded-2xl p-6 border-y border-r border-outline-variant/30 border-b-4 border-b-[#1A5E35] shadow-sm flex flex-col justify-between h-32 relative">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[11px] font-bold text-outline-variant uppercase tracking-wider mb-1">
                     Peso Médio Atual
                  </p>
                  <p className="text-3xl font-manrope font-extrabold text-[#0D2E1A]">
                     {latestWeighing ? Number((latestWeighing.averageWeight / 1000).toFixed(3)) : 0} <span className="text-sm font-medium text-outline">kg</span>
                  </p>
               </div>
               <div className="w-10 h-10 bg-[#e8f5e9] rounded-lg border border-[#a5d6a7] flex items-center justify-center">
                  <Scale className="w-5 h-5 text-[#2e7d32]" />
               </div>
            </div>
            <div className="mt-auto">
               <span className="inline-block px-2 py-1 bg-[#1A5E35] text-white text-[10px] font-bold rounded-full">
                  Registrado no D{latestWeighing?.ageInDays || 0}
               </span>
            </div>
         </div>

         {/* KPI 2 */}
         <div className="bg-white rounded-2xl p-6 border-y border-r border-outline-variant/30 border-b-4 border-b-[#1A5E35] shadow-sm flex flex-col justify-between h-32 relative">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[11px] font-bold text-outline-variant uppercase tracking-wider mb-1">
                     GPD (Taxa Ganho Diário)
                  </p>
                  <p className="text-3xl font-manrope font-extrabold text-foreground">
                     {gpd} <span className="text-sm font-medium text-outline">g/dia</span>
                  </p>
               </div>
               <div className="w-10 h-10 bg-[#e8f5e9] rounded-lg border border-[#a5d6a7] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#2e7d32]" />
               </div>
            </div>
            <div className="mt-auto">
               <span className="inline-block px-2 py-1 bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7] text-[10px] font-bold rounded-full">
                  Dentro do Alvo
               </span>
            </div>
         </div>

         {/* KPI 3 - Alert */}
         <div className="bg-white rounded-2xl p-6 border-y border-r border-outline-variant/30 border-b-4 border-b-[#c62828] shadow-sm flex flex-col justify-between h-32 relative">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[11px] font-bold text-outline-variant uppercase tracking-wider mb-1">
                     Desvio vs Alvo
                  </p>
                  <p className="text-3xl font-manrope font-extrabold text-foreground">
                     ~ <span className="text-sm font-medium text-outline">g</span>
                  </p>
               </div>
               <div className="w-10 h-10 bg-[#7f1d1d] rounded-lg border border-[#991b1b] flex items-center justify-center shadow-inner">
                  <AlertCircle className="w-5 h-5 text-[#fecaca]" />
               </div>
            </div>
            <div className="mt-auto">
               <span className="inline-block px-2 py-1 bg-[#ffebee] text-[#c62828] border border-[#ffcdd2] text-[10px] font-bold rounded-full">
                  Abaixo da Curva Referência
               </span>
            </div>
         </div>
      </div>

      {/* Analytics Mid Section */}
      <div className="flex flex-col lg:flex-row gap-6">
         {/* Line Chart */}
         <div className="lg:w-2/3 bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between mb-8">
               <div>
                  <h2 className="text-lg font-bold text-[#0D2E1A] mb-1">Análise da Curva de Crescimento</h2>
                  <p className="text-xs font-medium text-outline">
                     Comparação de Performance: Real vs. Padrão da Linhagem (Cobb 500)
                  </p>
               </div>
               <div className="flex items-center gap-4 text-xs font-bold text-[#0D2E1A]">
                  <div className="flex items-center gap-1.5">
                     <span className="w-2.5 h-2.5 rounded-full bg-[#1A5E35]"></span> Real
                  </div>
                  <div className="flex items-center gap-1.5 opacity-50">
                     <span className="w-2.5 h-2.5 rounded-full bg-[#a3a3a3]"></span> Referência
                  </div>
               </div>
            </div>

            <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                     <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#737373', fontWeight: 700 }}
                        dy={10}
                     />
                     <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                     {/* Reference Line (Dashed) */}
                     <Line 
                        type="monotone" 
                        dataKey="reference" 
                        name="Esperado (kg)"
                        stroke="#a3a3a3" 
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={false}
                     />
                     {/* Real Line (Solid Green) */}
                     <Line 
                        type="monotone" 
                        dataKey="real" 
                        name="Peso Real (kg)"
                        stroke="#1A5E35" 
                        strokeWidth={3}
                        dot={{ r: 3, fill: '#1A5E35', strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#1A5E35', strokeWidth: 2, stroke: '#fff' }}
                     />
                  </LineChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Right Sidebar Details */}
         <div className="lg:w-1/3 flex flex-col gap-6">
            <div className="bg-[#0D2E1A] rounded-2xl p-6 text-white shadow-md relative overflow-hidden flex-1 flex flex-col">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
               <p className="text-[10px] uppercase tracking-wider font-bold text-[#a5d6a7] mb-1 relative z-10">
                  Linhagem de Referência
               </p>
               <h3 className="text-3xl font-manrope font-extrabold mb-4 relative z-10">{initialFlock?.breed || 'Cobb 500'}</h3>
               <p className="text-xs text-white/80 leading-relaxed mb-6 font-medium relative z-10">
                  As metas de otimização têm como base benchmarks de performance global para ambientes de alta densidade desta linhagem.
               </p>
               <div className="mt-auto relative z-10">
                  <button className="w-full bg-[#1A5E35]/80 hover:bg-[#1A5E35] border border-[#a5d6a7]/30 text-white font-bold text-xs py-3 rounded-lg transition-colors">
                     Visualizar Curva da Linhagem
                  </button>
               </div>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
               <p className="text-[11px] uppercase tracking-wider font-bold text-[#1A5E35] mb-4">
                  Cobertura Técnica
               </p>
               <div className="flex items-center gap-2 mb-4">
                  <div className="flex -space-x-2">
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img className="w-8 h-8 rounded-full border-2 border-white object-cover" src="https://i.pravatar.cc/100?img=33" alt="" />
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img className="w-8 h-8 rounded-full border-2 border-white object-cover" src="https://i.pravatar.cc/100?img=12" alt="" />
                  </div>
               </div>
               <p className="text-xs text-outline font-medium leading-relaxed">
                  Pesagens deste ciclo capturadas por técnicos credenciados na granja.
               </p>
            </div>
         </div>
      </div>

      {/* Data Table past weigh-ins */}
      <div className="bg-white border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm flex flex-col">
         {/* Table Toolbar */}
         <div className="p-6 border-b border-outline-variant/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
            <h3 className="text-lg font-bold text-[#0D2E1A]">Registros de Pesagem</h3>
            <div className="flex items-center gap-3 w-full sm:w-auto">
               <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-foreground text-xs font-bold rounded-lg transition-all flex-1 sm:flex-none justify-center">
                  <Filter className="w-3.5 h-3.5" /> Filtrar
               </button>
               <Link href="/pesagens">
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-xs font-bold rounded-lg transition-all shadow-sm flex-1 sm:flex-none justify-center whitespace-nowrap">
                     <Plus className="w-3.5 h-3.5" /> Novo Registro
                  </button>
               </Link>
            </div>
         </div>

         {/* Table */}
         <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
               <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                     <tr key={headerGroup.id} className="border-b border-outline-variant/20 bg-surface-container-lowest">
                        {headerGroup.headers.map(header => (
                           <th key={header.id} className="p-4 text-[10px] font-bold text-outline uppercase tracking-wider whitespace-nowrap">
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
               Exibindo {table.getRowModel().rows.length} de {weighInsData.length} registros
            </span>
            <div className="flex gap-4">
               <button 
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="hover:text-foreground disabled:opacity-50 disabled:hover:text-outline transition-colors px-3 py-1 bg-surface-container rounded-md"
               >
                  Anterior
               </button>
               <button 
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="hover:text-foreground disabled:opacity-50 disabled:hover:text-outline transition-colors px-3 py-1 bg-surface-container rounded-md"
               >
                  Próxima
               </button>
            </div>
         </div>
      </div>

    </main>
  );
}
