"use client";

import { useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { 
  Home, 
  CheckCircle2, 
  DoorOpen, 
  Wrench,
  Search,
  Filter,
  Eye,
  Pencil,
  Plus
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

// Type definitions
type Galpao = {
  id: string;
  nome: string;
  loteAtivo: string;
  idade: string;
  aves: string;
  capacidade: string;
  status: "EM OPERAÇÃO" | "VAZIO" | "MANUTENÇÃO";
  statusColorKey: string;
};

// Mock data
const mockGalpoes: Galpao[] = [
  { id: "G1", nome: "G-01", loteAtivo: "LP-2024-05", idade: "12 dias", aves: "12.000", capacidade: "15.000", status: "EM OPERAÇÃO", statusColorKey: "green" },
  { id: "G2", nome: "G-02", loteAtivo: "LP-2024-06", idade: "08 dias", aves: "14.500", capacidade: "15.000", status: "EM OPERAÇÃO", statusColorKey: "green" },
  { id: "G3", nome: "G-03", loteAtivo: "---", idade: "---", aves: "0", capacidade: "15.000", status: "VAZIO", statusColorKey: "gray" },
  { id: "G4", nome: "G-04", loteAtivo: "---", idade: "---", aves: "0", capacidade: "12.000", status: "MANUTENÇÃO", statusColorKey: "red" },
  { id: "G5", nome: "G-05", loteAtivo: "LP-2024-04", idade: "35 dias", aves: "18.200", capacidade: "20.000", status: "EM OPERAÇÃO", statusColorKey: "green" },
];

const columnHelper = createColumnHelper<Galpao>();

export default function GalpoesListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: farmId } = use(params);
  const router = useRouter();

  const columns = useMemo(() => [
    columnHelper.accessor("id", {
      header: "ID / NOME",
      cell: (info) => {
        const galpao = info.row.original;
        const colorMap: Record<string, string> = {
           "green": "bg-[#e8f5e9] text-[#1A5E35]",
           "gray": "bg-surface-container-high text-outline",
           "red": "bg-[#ffebee] text-[#c62828]"
        };
        const colorClass = colorMap[galpao.statusColorKey];
        return (
          <div className="flex items-center gap-3 py-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${colorClass}`}>
              {galpao.id}
            </div>
            <span className="font-bold text-foreground">{galpao.nome}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor("loteAtivo", {
      header: "LOTE ATIVO",
      cell: (info) => (
        <span className="text-sm font-medium text-outline">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("idade", {
      header: "IDADE",
      cell: (info) => (
        <span className="text-sm font-medium text-outline">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("aves", {
      header: "AVES ALOJADAS",
      cell: (info) => (
        <span className="text-sm font-bold text-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("capacidade", {
      header: "CAPACIDADE",
      cell: (info) => (
        <span className="text-sm font-medium text-outline">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("status", {
      header: "STATUS",
      cell: (info) => {
        const galpao = info.row.original;
        const pillMap: Record<string, string> = {
           "green": "bg-[#e8f5e9] text-[#2e7d32]",
           "gray": "bg-surface-container-high text-outline",
           "red": "bg-[#ffebee] text-[#c62828]"
        };
        return (
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${pillMap[galpao.statusColorKey]}`}>
            {info.getValue()}
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
            <div className="flex items-center gap-2 relative left-[-8px]">
              <button 
                 onClick={(e) => { e.stopPropagation(); router.push(`/granjas/${farmId}/galpoes/${id}`); }}
                 className="p-1.5 text-outline hover:text-[#1A5E35] transition-colors"
                 title="Ver Detalhes"
              >
                 <Eye className="w-5 h-5"/>
              </button>
              <button 
                 onClick={(e) => { e.stopPropagation(); router.push(`/granjas/${farmId}/galpoes/${id}/editar`); }}
                 className="p-1.5 text-outline hover:text-[#1A5E35] transition-colors"
                 title="Editar Galpão"
              >
                 <Pencil className="w-4 h-4"/>
              </button>
            </div>
         );
      },
    }),
  ], [farmId, router]);

  const table = useReactTable({
    data: mockGalpoes,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 flex flex-col font-inter">
      
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-manrope font-bold text-[#1A5E35] tracking-tight mb-2">Galpões da Granja Primavera</h1>
            <p className="text-sm text-on-surface-variant font-medium">
              Gerencie os aviários e acompanhe os lotes ativos nesta unidade.
            </p>
          </div>
          
          <button className="flex items-center gap-2 bg-[#0D2E1A] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#1A5E35] transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            Adicionar Novo Galpão
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        <div className="bg-surface-container border border-outline-variant/30 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-[140px]">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#0D2E1A] flex items-center justify-center">
               <Home className="w-5 h-5 text-white" />
            </div>
            <span className="px-2 py-1 bg-surface-container-high rounded text-[10px] font-bold text-[#1A5E35] uppercase tracking-wider">GERAL</span>
          </div>
          <div>
            <p className="text-xs font-bold text-outline mb-1">Total de Galpões</p>
            <p className="text-4xl font-bold text-[#1A5E35] font-manrope leading-none">08</p>
          </div>
        </div>

        <div className="bg-white border border-outline-variant/30 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-[140px]">
          <div className="flex items-center justify-between">
            <CheckCircle2 className="w-8 h-8 text-[#1A5E35]" fill="#e8f5e9" />
            <span className="px-2 py-1 bg-[#e8f5e9] rounded text-[10px] font-bold text-[#1A5E35] uppercase tracking-wider">ATIVOS</span>
          </div>
          <div>
            <p className="text-xs font-bold text-outline mb-1">Em Operação</p>
            <p className="text-4xl font-bold text-foreground font-manrope leading-none">06</p>
          </div>
        </div>

        <div className="bg-white border border-outline-variant/30 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-[140px]">
          <div className="flex items-center justify-between">
            <DoorOpen className="w-8 h-8 text-outline" />
            <span className="px-2 py-1 bg-surface-container-high rounded text-[10px] font-bold text-outline uppercase tracking-wider">DISPONÍVEL</span>
          </div>
          <div>
            <p className="text-xs font-bold text-outline mb-1">Galpões Vazios</p>
            <p className="text-4xl font-bold text-foreground font-manrope leading-none">01</p>
          </div>
        </div>

        <div className="bg-white border border-outline-variant/30 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-[140px]">
           <div className="flex items-center justify-between">
            <Wrench className="w-8 h-8 text-[#c62828]" />
            <span className="px-2 py-1 bg-[#ffebee] rounded text-[10px] font-bold text-[#c62828] uppercase tracking-wider">REPARO</span>
          </div>
          <div>
            <p className="text-xs font-bold text-outline mb-1">Manutenção</p>
            <p className="text-4xl font-bold text-foreground font-manrope leading-none">01</p>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <section className="bg-white rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm flex flex-col mb-8 relative z-10">
        
        <div className="p-6 pb-0 flex items-center justify-between mb-4">
           <h2 className="text-xl font-bold text-foreground font-manrope">Inventário de Galpões</h2>
           <div className="flex items-center gap-3">
              <div className="relative">
                 <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2 " />
                 <input 
                    type="text" 
                    placeholder="Filtrar galpão..."
                    className="pl-9 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#1A5E35] focus:border-[#1A5E35] w-64"
                 />
              </div>
              <button className="p-2 border border-outline-variant/50 rounded-lg text-outline hover:text-foreground hover:bg-surface-container transition-colors">
                 <Filter className="w-4 h-4" />
              </button>
           </div>
        </div>

        <div>
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-surface-container-high bg-white">
                  {headerGroup.headers.map((header) => (
                     <th key={header.id} className="py-4 px-6 text-[10px] font-bold text-outline uppercase tracking-wider font-inter whitespace-nowrap">
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
              {table.getRowModel().rows.map((row) => (
                <tr 
                  key={row.id} 
                  className="border-b border-surface-container-low hover:bg-surface-container-lowest/50 transition-colors last:border-b-0"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-2 px-6 whitespace-nowrap align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-surface-container-low">
          <span className="text-sm font-medium text-outline">
            Exibindo 5 de 8 galpões
          </span>
          <div className="flex items-center space-x-1">
             <button className="px-3 py-1 text-sm font-medium text-outline hover:text-foreground">Anterior</button>
             <button className="w-8 h-8 flex items-center justify-center rounded bg-[#0D2E1A] text-white font-bold text-sm">1</button>
             <button className="w-8 h-8 flex items-center justify-center rounded text-outline hover:bg-surface-container font-medium text-sm">2</button>
             <button className="px-3 py-1 text-sm font-medium text-outline hover:text-foreground">Próximo</button>
          </div>
        </div>
      </section>

    </main>
  );
}
