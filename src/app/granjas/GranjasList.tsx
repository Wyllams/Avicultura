"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Tractor, 
  Map, 
  ArrowRight,
  MoreVertical,
  Plus,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Thermometer,
  Trash2,
  Power
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { toggleFarmStatus, deleteFarm } from "@/app/actions/farm";
import type { FarmData } from "@/app/actions/farm";
import { FarmForm } from "./FarmForm";
import { toast } from "sonner";

const columnHelper = createColumnHelper<FarmData>();

function ActionMenu({ 
  farm, 
  onEdit, 
  onDeleteSuccess 
}: { 
  farm: FarmData, 
  onEdit: (id: string) => void,
  onDeleteSuccess: (id: string) => void 
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const toggleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!open) {
      const rect = e.currentTarget.getBoundingClientRect();
      // Se estiver muito perto da base da tela, abre para cima
      const isNearBottom = window.innerHeight - rect.bottom < 200;
      setCoords({
        x: rect.left - 160, 
        y: isNearBottom ? rect.top - 180 : rect.bottom + 8
      });
    }
    setOpen(!open);
  };

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    const newStatus = farm.status === "ATIVO" ? "INATIVO" : "ATIVO";
    const result = await toggleFarmStatus(farm.id, newStatus);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(`Granja marcada como ${newStatus.toLowerCase()}!`);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    if (!window.confirm(`ATENÇÃO: Deseja realmente excluir a granja ${farm.name}? Esta ação apagará todos os dados nela contidos.`)) {
      return;
    }
    const result = await deleteFarm(farm.id);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Granja excluída com sucesso!");
      onDeleteSuccess(farm.id);
    }
  };

  return (
    <div className="relative flex items-center justify-center left-[-16px]" onClick={(e) => e.stopPropagation()}>
      <button 
        onClick={toggleOpen}
        className="p-2 rounded-full text-outline-variant hover:text-primary hover:bg-primary-container/20 transition-colors"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div 
            className="fixed w-48 bg-white border border-outline-variant/30 rounded-xl shadow-2xl z-50 flex flex-col py-2 animate-in fade-in duration-200"
            style={{ left: coords.x, top: coords.y }}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setOpen(false); router.push(`/granjas/${farm.id}`); }}
              className="w-full px-4 py-3 text-left text-sm font-bold text-foreground hover:bg-[#e8f5e9] hover:text-[#1A5E35] transition-colors"
            >
              Ver Detalhes
            </button>
            <div className="h-px bg-outline-variant/20 mx-4" />
            <button 
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(farm.id); }}
              className="w-full px-4 py-3 text-left text-sm font-bold text-foreground hover:bg-[#e8f5e9] hover:text-[#1A5E35] transition-colors"
            >
              Editar Cadastro
            </button>
            <div className="h-px bg-outline-variant/20 mx-4" />
            <button 
              onClick={handleToggleStatus}
              className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-2 hover:bg-surface-container transition-colors text-outline"
            >
              <Power className="w-4 h-4" />
              {farm.status === "ATIVO" ? "Desativar" : "Ativar"}
            </button>
            <button 
              onClick={handleDelete}
              className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-2 hover:bg-[#ffebee] transition-colors text-[#c62828]"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}


export function GranjasList({ farms: initialFarms }: { farms: FarmData[] }) {
  const router = useRouter();
  const [localFarms, setLocalFarms] = useState<FarmData[]>(initialFarms || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFarmId, setEditingFarmId] = useState<string | null>(null);

  const handleOpenEdit = (id: string) => {
    setEditingFarmId(id);
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingFarmId(null);
    setIsModalOpen(true);
  };

  const handleDeleteSuccess = (id: string) => {
    setLocalFarms((prev) => prev.filter(f => f.id !== id));
  };

  const editingFarm = useMemo(() => localFarms.find(f => f.id === editingFarmId), [localFarms, editingFarmId]);

  // Define table columns matching the design
  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      header: "NOME DA GRANJA",
      cell: (info) => (
        <div className="flex items-center gap-4 py-2">
          <div className="w-10 h-10 rounded-lg bg-[#e8f5e9] flex items-center justify-center shrink-0 text-[#1A5E35]">
            <Tractor className="w-5 h-5" />
          </div>
          <span className="font-bold text-foreground">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor((row) => `${row.city || "—"}, ${row.state || "—"}`, {
      id: "localizacao",
      header: "LOCALIZAÇÃO",
      cell: (info) => (
        <span className="text-sm text-outline font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("totalArea", {
      header: "ÁREA TOTAL (HA)",
      cell: (info) => (
        <span className="text-sm font-bold text-foreground">
          {info.getValue() ? (info.getValue() / 10000).toFixed(1) : "0.0"}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row._count.barns, {
      id: "galpoes",
      header: "GALPÕES",
      cell: (info) => (
        <span className="px-3 py-1 rounded-full bg-surface-container text-xs font-semibold text-on-surface-variant">
          {info.getValue()} Galpões
        </span>
      ),
    }),
    columnHelper.accessor("status", {
      header: "STATUS",
      cell: (info) => {
        const status = info.getValue();
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            status === "ATIVO" 
              ? "bg-[#e8f5e9] text-[#1A5E35]" 
              : "bg-[#ffebee] text-[#c62828]"
          }`}>
            {status === "ATIVO" ? "Ativo" : "Inativo"}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "AÇÕES",
      cell: ({ row }) => <ActionMenu farm={row.original} onEdit={handleOpenEdit} onDeleteSuccess={handleDeleteSuccess} />,
    }),
  ], [handleOpenEdit]);

  const table = useReactTable({
    data: localFarms,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalAreaAll = localFarms.reduce((sum, f) => sum + (f.totalArea || 0), 0) / 10000;
  const totalBarns = localFarms.reduce((sum, f) => sum + (f._count?.barns || 0), 0);

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 flex flex-col font-inter">
      
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-manrope font-bold text-foreground tracking-tight mb-2">Minhas Granjas</h1>
            <p className="text-sm text-on-surface-variant font-medium">
              Gerencie suas unidades de produção e monitore o desempenho em tempo real.
            </p>
          </div>
          
          <button 
            onClick={handleOpenNew}
            className="flex items-center gap-2 bg-[#0D2E1A] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#1A5E35] transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Adicionar Nova Granja
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8 mt-6">
        <div className="bg-white border border-outline-variant/30 p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1A5E35]"></div>
          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">TOTAL DE UNIDADES</p>
          <p className="text-4xl font-bold text-foreground font-manrope">{localFarms.length}</p>
        </div>
        <div className="bg-white border border-outline-variant/30 p-6 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">ÁREA TOTAL (HA)</p>
          <p className="text-4xl font-bold text-foreground font-manrope">{totalAreaAll.toFixed(1)}</p>
        </div>
        <div className="bg-white border border-outline-variant/30 p-6 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">GALPÕES ATIVOS</p>
          <p className="text-4xl font-bold text-foreground font-manrope">{totalBarns}</p>
        </div>
        <div className="bg-white border border-outline-variant/30 p-6 rounded-2xl shadow-sm flex flex-col relative justify-center">
          <p className="text-xs font-bold text-outline uppercase tracking-wider absolute top-6">STATUS GERAL</p>
          <div className="flex items-center gap-2 mt-6">
            <div className="w-3 h-3 rounded-full bg-[#1A5E35]"></div>
            <p className="text-lg font-bold text-[#1A5E35]">Operação Normal</p>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <section className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col mb-8 relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-surface-container-high bg-white">
                  {headerGroup.headers.map((header) => (
                     <th key={header.id} className="py-5 px-6 text-xs font-bold text-outline uppercase tracking-wider font-inter whitespace-nowrap">
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
                   <td colSpan={6} className="py-12 text-center text-outline">Nenhuma granja registrada no momento.</td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr 
                    key={row.id} 
                    onClick={() => router.push(`/granjas/${row.original.id}`)}
                    className="border-b border-surface-container-low hover:bg-surface-container-lowest/50 transition-colors cursor-pointer group last:border-b-0"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-2 px-6 whitespace-nowrap align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {localFarms.length > 0 && (
          <div className="flex items-center justify-between p-6 bg-white border-t border-surface-container-low rounded-b-2xl">
            <span className="text-sm font-medium text-outline">
              Mostrando {localFarms.length} de {localFarms.length} granjas registradas
            </span>
            <div className="flex items-center gap-2">
              <button className="p-1.5 text-outline hover:text-foreground"><ChevronLeft className="w-5 h-5" /></button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md bg-[#0D2E1A] text-white font-bold text-sm">1</button>
              <button className="p-1.5 text-outline hover:text-foreground"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        )}
      </section>

      {/* Modal / Dialog for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => setIsModalOpen(false)} 
          />
          {/* Content */}
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col font-inter overflow-hidden border border-outline-variant/30">
            {/* Header */}
            <div className="p-8 border-b border-outline-variant/20 bg-surface-container-lowest">
               <h2 className="text-3xl font-manrope font-bold text-[#1A5E35]">
                  {editingFarmId ? "Editar Cadastro" : "Nova Granja"}
               </h2>
               <p className="text-sm text-outline font-medium mt-2">
                  {editingFarmId 
                    ? "Atualize os dados da sua unidade de produção." 
                    : "Cadastre uma nova unidade de produção para sua empresa."}
               </p>
            </div>
            {/* Body */}
            <div className="p-8 bg-surface-container-lowest">
               {/* We force FarmForm border to 0 here to blend with our modal, its own max-w-2xl matches our modal size. */}
               <div className="-m-8 [&>div]:border-0 [&>div]:shadow-none [&>div]:p-8">
                 <FarmForm 
                   farmId={editingFarm?.id}
                   initialData={editingFarm ? { name: editingFarm.name, city: editingFarm.city ?? undefined, state: editingFarm.state ?? undefined, status: editingFarm.status } : {}}
                   onSuccess={() => setIsModalOpen(false)}
                   onCancel={() => setIsModalOpen(false)}
                 />
               </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
