"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Search,
  Filter,
  Plus,
  GitCompare
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

type LoteDb = {
  id: string;
  name: string;
  status: string;
  housedBirds: number;
  housingDate: string;
  slaughterDate: string | null;
  breed: string;
  barnId: string;
  barnName: string;
  farmName: string;
};

const columnHelper = createColumnHelper<LoteDb>();

export function LotesClient({ initialData }: { initialData: LoteDb[] }) {
  const router = useRouter();
  const [data] = useState(() => initialData);

  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      header: "IDENTIFICAÇÃO",
      cell: (info) => (
        <div className="flex flex-col">
          <span className="font-bold text-[#1A5E35]">{info.getValue()}</span>
          <span className="text-[11px] font-medium text-outline">{info.row.original.breed}</span>
        </div>
      ),
    }),
    columnHelper.accessor("barnName", {
      header: "GALPÃO",
      cell: (info) => {
         return (
            <div className="flex flex-col">
               <span className="text-sm font-bold text-foreground">{info.getValue()}</span>
               <span className="text-[11px] font-medium text-outline">{info.row.original.farmName}</span>
            </div>
         );
      },
    }),
    columnHelper.accessor("housingDate", {
      header: "IDADE (DIAS)",
      cell: (info) => {
         const housed = new Date(info.getValue());
         let end = new Date();
         if (info.row.original.slaughterDate) {
            end = new Date(info.row.original.slaughterDate);
         }
         const diffTime = Math.abs(end.getTime() - housed.getTime());
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
         return (
            <div className="flex flex-col">
               <span className="text-sm font-bold text-foreground">{diffDays}</span>
               <span className="text-[11px] font-medium text-outline">dias</span>
            </div>
         );
      },
    }),
    columnHelper.accessor("housedBirds", {
      header: "AVES INICIAIS",
      cell: (info) => (
        <span className="text-sm font-medium text-outline">{info.getValue().toLocaleString('pt-BR')}</span>
      ),
    }),
    columnHelper.accessor("status", {
      header: "STATUS",
      cell: (info) => {
        const status = info.getValue();
        let colorClass = "bg-surface-dim text-outline";
        let label = status;
        
        if (status === "ACTIVE") {
          colorClass = "bg-[#e8f5e9] text-[#2e7d32]";
          label = "Alojado";
        } else if (status === "CLOSED") {
           colorClass = "bg-[#ffebee] text-[#c62828]";
           label = "Encerrado";
        } else if (status === "PLANNING") {
           colorClass = "bg-[#e3f2fd] text-[#1565c0]";
           label = "Planejado";
        }

        return (
          <span className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
            {label}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "AÇÕES",
      cell: ({ row }) => {
         const id = row.original.id;
         return (
            <button 
               onClick={() => router.push(`/lotes/${id}`)}
               className="px-4 py-1.5 bg-surface-container-high hover:bg-[#e8f5e9] hover:text-[#1A5E35] text-outline text-[11px] font-bold rounded flex items-center justify-center transition-colors shadow-sm"
            >
               Ver Central
            </button>
         );
      },
    }),
  ], [router]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-7xl mx-auto w-full relative">
      {/* Header Docs */}
      <header className="mb-8 flex items-start justify-between">
         <div className="flex-1">
            <h1 className="text-4xl font-manrope font-bold text-foreground tracking-tight mb-3">Lista de Lotes</h1>
            <p className="text-sm text-outline font-medium max-w-2xl leading-relaxed">
              Gerencie e acompanhe o desempenho de todos os lotes ativos e históricos com métricas de precisão em tempo real.
            </p>
         </div>
         <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/lotes/comparativo')}
              className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-surface-container border border-outline-variant/40 text-[#1A5E35] text-sm font-bold rounded-xl transition-all shadow-sm"
            >
              <GitCompare className="w-4 h-4" /> Comparar Lotes
            </button>
            <button 
              onClick={() => router.push('/lotes/novo')}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-5 h-5" /> Criar Lote (Alojamento)
            </button>
         </div>
      </header>

      {/* KPI Cards Placeholder */}
      <div className="grid grid-cols-4 gap-6 mb-8 opacity-70">
        <div className="bg-white border text-left border-outline-variant/30 p-6 rounded-2xl shadow-sm border-l-4 border-l-outline flex flex-col justify-between">
           <p className="text-xs font-bold text-outline mb-4">Lotes Listados</p>
           <div className="flex items-baseline gap-3">
              <p className="text-4xl font-bold text-foreground font-manrope leading-none">{data.length}</p>
           </div>
        </div>
      </div>

      {/* Main Table Area */}
      <section className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-6 flex flex-col overflow-hidden pb-0">
         {/* Filters Bar */}
         <div className="flex items-center justify-between mb-6 pb-6 border-b border-surface-container-high">
            <div className="flex items-center gap-3 w-full">
               <div className="relative flex-1 max-w-sm">
                 <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2 " />
                 <input 
                    type="text" 
                    placeholder="Pesquisar lote..."
                    className="w-full pl-9 pr-4 py-2 bg-transparent border border-outline-variant/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-[#1A5E35]"
                 />
               </div>
            </div>
            <button className="flex items-center gap-2 text-[#1A5E35] font-bold text-sm px-4 py-2 hover:bg-[#e8f5e9] rounded-lg transition-colors whitespace-nowrap ml-4">
               <Filter className="w-4 h-4" /> Filtros
            </button>
         </div>

         {/* Table */}
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                 {table.getHeaderGroups().map((headerGroup) => (
                   <tr key={headerGroup.id} className="border-b border-surface-container-low">
                     {headerGroup.headers.map((header) => (
                        <th key={header.id} className="py-4 px-2 text-[10px] font-bold text-outline uppercase tracking-wider whitespace-nowrap align-bottom pb-2">
                         {header.isPlaceholder
                           ? null
                           : flexRender(
                               header.column.columnDef.header,
                               header.getContext()
                             )}
                       </th>
                     ))}
                   </tr>
                 ))}
               </thead>
               <tbody>
                 {table.getRowModel().rows.length === 0 ? (
                   <tr>
                     <td colSpan={6} className="py-8 text-center text-outline text-sm">Nenhum lote encontrado.</td>
                   </tr>
                 ) : table.getRowModel().rows.map((row) => (
                   <tr key={row.id} className="border-b border-surface-container-lowest hover:bg-surface-container-lowest/50 transition-colors last:border-0">
                     {row.getVisibleCells().map((cell) => (
                       <td key={cell.id} className="py-4 px-2 align-middle">
                         {flexRender(cell.column.columnDef.cell, cell.getContext())}
                       </td>
                     ))}
                   </tr>
                 ))}
               </tbody>
             </table>
         </div>

         {/* Footer */}
         <div className="flex items-center justify-between py-4 border-t border-surface-container-low mt-4">
            <span className="text-xs font-medium text-outline">
               Mostrando {data.length} lotes
            </span>
         </div>
      </section>
    </main>
  );
}
