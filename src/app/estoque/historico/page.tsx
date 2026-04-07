"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { 
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel
} from '@tanstack/react-table';
import { 
  Plus,
  ArrowLeft,
  Wheat,
  Syringe,
  Box,
  TrendingDown,
  TrendingUp,
  Download,
  Calendar
} from "lucide-react";
import { FarmSelector } from "@/components/FarmSelector";
import { getUserFarms, type FarmOption } from "@/app/actions/dashboard";
import { getStockHistory } from "@/app/actions/estoque";

type Movimentacao = {
  id: string;
  date: string | Date;
  produto: string;
  category: string;
  tipo: 'ENTRADA' | 'SAÍDA';
  quantidade: number;
  formattedQuantity: string;
  unit: string;
  responsavel: string;
};

const columnHelper = createColumnHelper<Movimentacao>();

const columns = [
  columnHelper.accessor('date', {
    header: 'DATA & HORA',
    cell: info => {
      const dateObj = new Date(info.getValue());
      const dateStr = dateObj.toLocaleDateString("pt-BR", { timeZone: 'America/Sao_Paulo' });
      const timeStr = dateObj.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      return (
      <div className="flex flex-col">
         <span className="font-bold text-[#0D2E1A] text-xs">{dateStr}</span>
         <span className="text-[9px] text-outline font-medium">{timeStr}</span>
      </div>
      );
    },
  }),
  columnHelper.accessor('produto', {
    header: 'PRODUTO',
    cell: info => {
      const orig = info.row.original;
      let Icon = Box;
      let iconColor = "text-[#1A5E35]";
      const cat = orig.category?.toLowerCase() || "";
      if (cat.includes('vacina')) { Icon = Syringe; iconColor = "text-[#1A5E35]"; }
      else if (cat.includes('ração') || cat.includes('racao')) { Icon = Wheat; iconColor = "text-[#1A5E35]"; }

      return (
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30">
             <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
          </div>
          <div className="flex flex-col">
             <span className="font-bold text-[#0D2E1A] text-xs leading-tight">{info.getValue()}</span>
             {orig.category && <span className="text-[10px] text-outline font-medium leading-tight">{orig.category}</span>}
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor('tipo', {
    header: 'TIPO',
    cell: info => {
      const isEntrada = info.getValue() === 'ENTRADA';
      return (
        <span className={`px-2 py-0.5 border font-bold text-[9px] rounded-full inline-block ${isEntrada ? 'bg-[#e8f5e9] text-[#2e7d32] border-[#a5d6a7]' : 'bg-[#ffebee] text-[#c62828] border-[#ffcdd2]'}`}>
          {info.getValue()}
        </span>
      );
    },
  }),
  columnHelper.accessor('formattedQuantity', {
    header: 'QTD.',
    cell: info => {
      const val = info.getValue();
      const isPos = val.startsWith('+');
      return (
        <div className="flex flex-col">
          <span className={`font-extrabold text-sm ${isPos ? 'text-[#2e7d32]' : 'text-[#c62828]'}`}>
            {val} <span className="text-[10px] uppercase font-bold">{info.row.original.unit}</span>
          </span>
        </div>
      );
    }
  }),
  columnHelper.accessor('responsavel', {
    header: 'RESPONSÁVEL',
    cell: info => <span className="font-bold text-[#0D2E1A] text-[11px]">{info.getValue()}</span>,
  }),
];

function HistoricoClient() {
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [loadingDb, setLoadingDb] = useState(true);

  // Data & KPI state
  const [movementsData, setMovementsData] = useState<Movimentacao[]>([]);
  const [itemsList, setItemsList] = useState<{id: string, name: string}[]>([]);
  const [kpis, setKpis] = useState({
     saldoAtual: 0,
     entradasMes: 0,
     saidasMes: 0,
     giro: '0.0x'
  });

  // Filters State
  const [activeTab, setActiveTab] = useState<'Todos' | 'Entradas' | 'Saídas'>('Todos');
  const [filterDays, setFilterDays] = useState<number>(30);
  const [filterProduct, setFilterProduct] = useState<string>("all");

  // Load farms
  useEffect(() => {
    async function loadFarms() {
      const { farms } = await getUserFarms();
      if (farms && farms.length > 0) {
        setFarms(farms);
        setSelectedFarmId(farms[0].id);
      }
      setLoadingDb(false);
    }
    loadFarms();
  }, []);

  // Fetch History DB
  useEffect(() => {
    if (!selectedFarmId) return;

    async function loadHistory() {
      setLoadingDb(true);
      const res = await getStockHistory(selectedFarmId, filterDays, filterProduct);
      if (res && res.kpis) {
         setKpis(res.kpis);
         setMovementsData(res.movements || []);
         // Popula categorias se vier "all"
         if (filterProduct === "all" && res.items) {
            setItemsList(res.items.map(i => ({ id: i.id as string, name: i.name as string })));
         }
      }
      setLoadingDb(false);
    }
    loadHistory();
  }, [selectedFarmId, filterDays, filterProduct]);

  // Local Filter by Tab "Todos | Entradas | Saídas"
  const localFilteredData = React.useMemo(() => {
      if (activeTab === 'Entradas') return movementsData.filter(m => m.tipo === 'ENTRADA');
      if (activeTab === 'Saídas') return movementsData.filter(m => m.tipo === 'SAÍDA');
      return movementsData;
  }, [movementsData, activeTab]);

  const table = useReactTable({
    data: localFilteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 6 },
    },
  });

  if (!selectedFarmId && loadingDb) {
    return <div className="flex flex-1 items-center justify-center p-8 text-outline">Carregando permissões...</div>;
  }

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6">
      
      {/* Top bar: Voltar + FarmSelector */}
      <div className="flex justify-between items-center mb-4 w-full">
         <Link href="/estoque" className="inline-flex group">
            <span className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">
               <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
            
            </span>
         </Link>

         <div className="w-72">
            <FarmSelector 
              farms={farms} 
              selectedFarmId={selectedFarmId} 
              onFarmChange={(val) => setSelectedFarmId(val || "")} 
            />
         </div>
      </div>

      {/* Header */}
         <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
               <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
                  Histórico de Movimentações
               </h1>
               <p className="text-sm font-medium text-outline mt-1">
                  Controle de entradas e saídas de insumos e produtos.
               </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
               {/* Filters Tabs */}
               <div className="flex bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-1 shadow-sm">
                  {(['Todos', 'Entradas', 'Saídas'] as const).map((f) => (
                     <button 
                        key={f}
                        onClick={() => setActiveTab(f)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === f ? 'bg-white shadow-sm text-[#0D2E1A]' : 'text-outline hover:text-[#0D2E1A]'}`}
                     >
                        {f}
                     </button>
                  ))}
               </div>
               
               <Link href="/estoque/entrada">
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#1A5E35] hover:bg-[#0D2E1A] text-white text-xs font-bold rounded-lg transition-all shadow-sm">
                     <Plus className="w-4 h-4" /> Nova Movimentação
                  </button>
               </Link>
            </div>
         </div>

      {/* 4 Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-2 relative">
         {loadingDb && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
                <div className="w-6 h-6 border-2 border-[#1A5E35] border-t-transparent rounded-full animate-spin"></div>
            </div>
         )}
         {/* KPI 1 */}
         <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col">
            <p className="text-[10px] font-bold text-[#1A5E35] uppercase tracking-widest mb-4">Saldo Atual (Todos Itens)</p>
            <p className="text-3xl font-manrope font-extrabold text-[#0D2E1A]">
               {kpis.saldoAtual.toLocaleString('pt-BR', {minimumFractionDigits:0})} <span className="text-sm font-bold text-outline">un/kg</span>
            </p>
            <div className="w-12 h-1 bg-[#1A5E35] rounded-full mt-4"></div>
         </div>

         {/* KPI 2 */}
         <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col">
            <p className="text-[10px] font-bold text-[#2e7d32] uppercase tracking-widest mb-4">Entradas (Período)</p>
            <p className="text-3xl font-manrope font-extrabold text-[#0D2E1A]">
               {kpis.entradasMes.toLocaleString('pt-BR', {minimumFractionDigits:0})}
            </p>
            <div className="flex items-center gap-1.5 mt-4">
               <TrendingUp className="w-3.5 h-3.5 text-[#2e7d32]" />
               <span className="text-[10px] font-bold text-[#2e7d32]">Com base em {filterDays} dias</span>
            </div>
         </div>

         {/* KPI 3 */}
         <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col">
            <p className="text-[10px] font-bold text-[#c62828] uppercase tracking-widest mb-4">Saídas (Período)</p>
            <p className="text-3xl font-manrope font-extrabold text-[#0D2E1A]">
               {kpis.saidasMes.toLocaleString('pt-BR', {minimumFractionDigits:0})}
            </p>
            <div className="flex items-center gap-1.5 mt-4">
               <TrendingDown className="w-3.5 h-3.5 text-[#c62828]" />
               <span className="text-[10px] font-bold text-[#c62828]">Com base em {filterDays} dias</span>
            </div>
         </div>

         {/* KPI 4 */}
         <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col">
            <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-4">Giro de Estoque</p>
            <p className="text-3xl font-manrope font-extrabold text-[#0D2E1A]">
               {kpis.giro}
            </p>
            <div className="flex items-center gap-1.5 mt-4">
               <span className="text-[10px] font-bold text-[#1A5E35]">Turnover Básico</span>
            </div>
         </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-outline-variant/30 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-end gap-4 mt-2">
         <div className="flex-1 w-full flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
               <label className="block text-[9px] font-bold text-outline uppercase tracking-wider mb-1.5">Período</label>
               <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                     <Calendar className="w-4 h-4" />
                  </div>
                  <select 
                     value={filterDays}
                     onChange={e => setFilterDays(Number(e.target.value))}
                     className="w-full bg-surface-container-lowest border border-outline-variant/50 text-xs font-bold text-[#0D2E1A] pl-9 pr-3 py-2.5 rounded-lg focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] appearance-none cursor-pointer">
                     <option value={7}>Últimos 7 dias</option>
                     <option value={15}>Últimos 15 dias</option>
                     <option value={30}>Últimos 30 dias</option>
                     <option value={90}>Últimos 90 dias</option>
                     <option value={365}>Anual</option>
                  </select>
               </div>
            </div>

            <div className="flex-1">
               <label className="block text-[9px] font-bold text-outline uppercase tracking-wider mb-1.5">Produto</label>
               <select 
                   value={filterProduct}
                   onChange={e => setFilterProduct(e.target.value)}
                   className="w-full bg-surface-container-lowest border border-outline-variant/50 focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] text-xs font-bold text-[#0D2E1A] px-3 py-2.5 rounded-lg focus:outline-none cursor-pointer">
                  <option value="all">Todos os Produtos</option>
                  {itemsList.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
               </select>
            </div>
         </div>

         <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
                onClick={() => { setFilterDays(30); setFilterProduct("all"); }}
                className="text-xs font-bold text-outline hover:text-[#0D2E1A] px-3 py-2 transition-colors">
               Limpar
            </button>
            <button className="flex items-center justify-center w-10 h-10 bg-white border border-outline-variant/30 hover:bg-surface-container-lowest text-outline rounded-lg transition-colors">
               <Download className="w-4 h-4" />
            </button>
         </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm flex flex-col mt-2 flex-1 relative min-h-[300px]">
         {loadingDb && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex flex-col gap-3 items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#1A5E35] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-bold text-[#1A5E35] uppercase tracking-widest">Carregando História...</p>
            </div>
         )}
         
         <div className="overflow-x-auto w-full flex-1">
            <table className="w-full text-left border-collapse h-full">
               <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                     <tr key={headerGroup.id} className="border-b border-outline-variant/20 bg-surface-container-lowest text-outline">
                        {headerGroup.headers.map(header => (
                           <th key={header.id} className="p-5 text-[9px] font-extrabold uppercase tracking-widest whitespace-nowrap">
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
                  {table.getRowModel().rows.length === 0 && !loadingDb ? (
                    <tr>
                      <td colSpan={columns.length} className="p-8 text-center">
                        <p className="text-sm font-bold text-[#0D2E1A]">Nenhuma movimentação encontrada.</p>
                        <p className="text-xs text-outline mt-1 font-medium">Você pode registrar uma nova através do botão verde.</p>
                      </td>
                    </tr>
                  ) : table.getRowModel().rows.map(row => (
                     <tr key={row.id} className="border-b border-outline-variant/10 hover:bg-surface-container-lowest transition-colors group">
                        {row.getVisibleCells().map(cell => (
                           <td key={cell.id} className="p-5 align-middle">
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
         <div className="p-5 flex items-center justify-between text-xs font-bold text-outline bg-white border-t border-outline-variant/20 mt-auto">
             <span className="uppercase tracking-wider">
               Mostrando {table.getRowModel().rows.length} de {localFilteredData.length} movimentações
             </span>
             <div className="flex gap-2 items-center">
               <button 
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="w-8 h-8 rounded-md bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/30 flex items-center justify-center disabled:opacity-50 transition-colors text-outline"
               >
                  ‹
               </button>
               <span className="px-3 text-xs font-bold">{table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}</span>
               <button 
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="w-8 h-8 rounded-md bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/30 flex items-center justify-center disabled:opacity-50 transition-colors text-outline"
               >
                  ›
               </button>
             </div>
          </div>
      </div>
    </main>
  );
}

export default function W26HistoricoMovimentacoes() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center p-8">Carregando Tela...</div>}>
      <HistoricoClient />
    </Suspense>
  )
}
