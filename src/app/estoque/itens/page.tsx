"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel
} from '@tanstack/react-table';
import { 
  Wheat, 
  Pill, 
  Syringe, 
  AlertTriangle,
  Plus,
  ArrowLeft,
  Search,
  Pencil
} from "lucide-react";
import { toast } from "sonner";
import { FarmSelector } from "@/components/FarmSelector";
import { getUserFarms, type FarmOption } from "@/app/actions/dashboard";
import { getStockItems, saveStockItem } from "@/app/actions/estoque";

type ItemEstoque = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number | null;
  unit: string;
};

const columnHelper = createColumnHelper<ItemEstoque>();

function ItensEstoqueComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [data, setData] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<1 | 2>(1);
  const [editingItem, setEditingItem] = useState<ItemEstoque | null>(null);
  const [formData, setFormData] = useState({
    name: '', category: 'RAÇÃO', unit: 'KG', minQuantity: 0, initialQuantity: 0
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadFarms() {
      const result = await getUserFarms();
      if (result.needsOnboarding) {
        router.push("/onboarding");
        return;
      }
      if (result.farms) {
        setFarms(result.farms);
        const paramFarmId = searchParams.get("farmId");
        const storedFarmId = localStorage.getItem("selectedFarmId");
        const farmIds = result.farms.map((f) => f.id);
        
        if (paramFarmId && farmIds.includes(paramFarmId)) {
          setSelectedFarmId(paramFarmId);
        } else if (storedFarmId && farmIds.includes(storedFarmId)) {
          setSelectedFarmId(storedFarmId);
        } else {
          setSelectedFarmId(result.farms[0].id);
        }
      }
    }
    loadFarms();
  }, [router, searchParams]);

  const loadItems = async (farmId: string) => {
    setLoading(true);
    const result = await getStockItems(farmId);
    if (result.error) {
      toast.error(result.error);
    } else if (result.items) {
      setData(result.items as ItemEstoque[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedFarmId) {
      localStorage.setItem("selectedFarmId", selectedFarmId);
      const params = new URLSearchParams(searchParams.toString());
      if (params.get("farmId") !== selectedFarmId) {
        params.set("farmId", selectedFarmId);
        router.replace(`?${params.toString()}`);
      }
      loadItems(selectedFarmId);
    }
  }, [selectedFarmId, router, searchParams]);

  const filteredData = React.useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = activeFilter === 'Todos' || item.category === activeFilter.toUpperCase();
      return matchesSearch && matchesCat;
    });
  }, [data, activeFilter, searchQuery]);

  const columns = React.useMemo(() => [
    columnHelper.accessor('name', {
      header: 'PRODUTO',
      cell: info => {
        const cat = info.row.original.category.toUpperCase();
        let Icon = Wheat;
        let iconColor = "text-[#2e7d32]";
        let iconBg = "bg-[#e8f5e9]";

        if (cat === 'VACINA' || cat === 'VACINAS') { Icon = Syringe; iconColor = "text-[#c62828]"; iconBg = "bg-[#ffebee]"; }
        else if (cat === 'MEDICAMENTO' || cat === 'MEDICAMENTOS') { Icon = Pill; iconColor = "text-[#2e7d32]"; iconBg = "bg-surface-container"; }

        return (
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border border-outline-variant/30 ${iconBg}`}>
               <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <span className="font-bold text-[#0D2E1A] text-xs max-w-[150px] leading-snug truncate">
               {info.getValue()}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor('category', {
      header: 'CATEGORIA',
      cell: info => {
        const cat = info.getValue().toUpperCase();
        const isRed = cat.includes('VACINA');
        return (
          <span className={`px-2 py-1 border font-bold text-[9px] rounded-full inline-block mt-1 ${isRed ? 'bg-[#ffebee] text-[#c62828] border-[#ffcdd2]' : 'bg-[#e8f5e9] text-[#2e7d32] border-[#a5d6a7]'}`}>
            {cat}
          </span>
        );
      },
    }),
    columnHelper.accessor('quantity', {
      header: 'QTD. ATUAL',
      cell: info => {
         const val = info.getValue() || 0;
         const min = info.row.original.minQuantity;
         const isCritical = min !== null && val <= min;
         return (
            <span className={`font-bold text-sm ${isCritical ? 'text-[#c62828]' : 'text-foreground'}`}>
               {val.toLocaleString('pt-BR')}
               {isCritical && <AlertTriangle className="w-3 h-3 inline ml-1.5 mb-0.5" />}
            </span>
         );
      },
    }),
    columnHelper.accessor('unit', {
      header: 'UND.',
      cell: info => <span className="font-bold text-outline text-[11px]">{info.getValue().toUpperCase()}</span>,
    }),
    columnHelper.accessor('minQuantity', {
      header: 'QTD MÍNIMA',
      cell: info => <span className="font-bold text-outline text-xs max-w-[120px] inline-block leading-snug">{info.getValue() || '-'}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'AÇÕES',
      cell: (info) => (
        <button 
           onClick={() => openEditDialog(info.row.original)}
           className="p-1 hover:bg-surface-container rounded-md transition-colors text-outline"
        >
          <Pencil className="w-4 h-4" />
        </button>
      ),
    }),
  ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 12 },
    },
  });

  const openNewDialog = () => {
     setEditingItem(null);
     setFormData({ name: '', category: 'RAÇÃO', unit: 'KG', minQuantity: 0, initialQuantity: 0 });
     setDialogStep(1);
     setIsDialogOpen(true);
  };

  const openEditDialog = (item: ItemEstoque) => {
     setEditingItem(item);
     setFormData({ 
       name: item.name, 
       category: item.category.toUpperCase(), 
       unit: item.unit.toUpperCase(), 
       minQuantity: item.minQuantity || 0,
       initialQuantity: 0 // não é exibido na edição
     });
     setDialogStep(1);
     setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!selectedFarmId) return;

     if (dialogStep === 1) {
         setDialogStep(2);
         return;
     }

     setSaving(true);
     const res = await saveStockItem({
        id: editingItem?.id,
        farmId: selectedFarmId,
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        minQuantity: Number(formData.minQuantity),
        initialQuantity: Number(formData.initialQuantity)
     });

     if (res.error) {
        toast.error(res.error);
     } else {
        toast.success(`Insumo ${editingItem ? 'atualizado' : 'cadastrado'} com sucesso!`);
        setIsDialogOpen(false);
        loadItems(selectedFarmId);
     }
     setSaving(false);
  };

  const currentAlerts = Math.max(0, data.filter(d => d.minQuantity !== null && d.quantity <= d.minQuantity).length);

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6 relative">
      
      {/* Settings / Top Filter Header */}
      <div className="flex flex-col gap-4">
         <div className="flex justify-between items-center">
             <Link href="/estoque" className="inline-flex">
                <span className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">
               <ArrowLeft className="w-4 h-4" /> Voltar
                
            </span>
             </Link>
             
             {farms.length > 0 && selectedFarmId && (
                <div className="w-[300px]">
                   <FarmSelector farms={farms} selectedFarmId={selectedFarmId} onFarmChange={setSelectedFarmId} />
                </div>
             )}
         </div>

         <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
               <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
                  Cadastro de Produtos
               </h1>
               <p className="text-sm font-medium text-outline mt-1 max-w-xl">
                  {loading ? 'Carregando itens...' : 'Gerencie insumos, medicamentos e nutrição para a granja ativa.'}
               </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
               {/* Filters */}
               <div className="flex bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-1 shadow-sm">
                  {['Todos', 'Ração', 'Vacinas', 'Medicamentos'].map((f) => (
                     <button 
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeFilter === f ? 'bg-white shadow-sm text-[#0D2E1A]' : 'text-outline hover:text-[#0D2E1A]'}`}
                     >
                        {f}
                     </button>
                  ))}
               </div>
               <button onClick={openNewDialog} className="flex items-center gap-2 px-4 py-2 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-xs font-bold rounded-lg transition-all shadow-sm w-full sm:w-auto justify-center">
                  <Plus className="w-4 h-4" /> Novo Insumo
               </button>
            </div>
         </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
          <div className="w-full xl:w-2/3 flex flex-col gap-4">
              <div className="p-1">
                 <div className="relative w-full max-w-md">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Search className="h-4 w-4 text-outline" />
                   </div>
                   <input
                     type="text"
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     className="block w-full pl-10 pr-3 py-2 border border-outline-variant/50 rounded-lg bg-white text-sm focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35]"
                     placeholder="Buscar produto por nome..."
                   />
                 </div>
              </div>

              {/* Data Table */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                 <div className="overflow-x-auto w-full">
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
                          {loading ? (
                             <tr>
                                <td colSpan={6} className="p-8 text-center text-outline text-sm font-medium">Carregando itens...</td>
                             </tr>
                          ) : table.getRowModel().rows.length === 0 ? (
                             <tr>
                                <td colSpan={6} className="p-8 text-center text-outline text-sm font-medium">Nenhum produto encontrado.</td>
                             </tr>
                          ) : table.getRowModel().rows.map(row => (
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
                       Mostrando {table.getRowModel().rows.length} de {filteredData.length} itens {activeFilter !== 'Todos' && `(${activeFilter})`}
                    </span>
                    <div className="flex gap-2 items-center">
                       <span className="uppercase tracking-wider font-extrabold text-[#1A5E35] mr-4">
                          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
                       </span>
                       <button 
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
                          className="w-8 h-8 rounded-md bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/30 flex items-center justify-center disabled:opacity-50 transition-colors text-outline"
                       >
                          ‹
                       </button>
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
          </div>

          <div className="w-full xl:w-1/3 flex flex-col gap-6 sticky top-8">
             {/* Alert Items */}
             <div className="bg-[#7f1d1d] rounded-2xl p-6 shadow-md flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10 blur-xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-4 relative z-10">
                   <AlertTriangle className="w-4 h-4 text-[#fca5a5]" />
                   <h3 className="text-[12px] font-bold text-[#fca5a5]">Itens Críticos (Falta)</h3>
                </div>
                <p className="text-5xl font-manrope font-extrabold text-white mb-2 relative z-10" style={{ fontVariantNumeric: 'tabular-nums' }}>
                   {currentAlerts.toString().padStart(2, '0')}
                </p>
                <p className="text-[11px] font-medium text-[#fca5a5]/80 max-w-[200px] leading-relaxed relative z-10">
                   Produtos que atingiram ou estão abaixo da margem mínima configurada.
                </p>
             </div>
             
             <div className="bg-white border border-outline-variant/30 rounded-2xl p-6">
                <h3 className="text-[12px] uppercase font-bold text-outline tracking-wider mb-4">Sobre o Controle de Qualidade</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                   Antes de dar entrada em novos medicamentos ou rações, certifique-se de cadastrá-los adequadamente. As medições de saldo só são habilitadas na página de "Entrada de Estoque".
                </p>
             </div>
          </div>
      </div>

      {/* CRUD Dialog */}
      {isDialogOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
               <div className="p-6 border-b border-outline-variant/20 bg-surface-container-lowest">
                  <h2 className="text-lg font-bold text-[#0D2E1A]">{editingItem ? 'Editar Insumo' : 'Novo Insumo'}</h2>
               </div>
               
               <form onSubmit={handleSave} className="p-6 flex flex-col gap-5 flex-1">
                  
                  {dialogStep === 1 ? (
                    <>
                      <div>
                         <label className="block text-xs font-bold text-outline uppercase tracking-wide mb-2">Nome do Produto</label>
                         <input 
                            type="text" 
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-surface-container-lowest border border-outline-variant/50 px-3 py-2.5 text-sm font-medium rounded-lg focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35]"
                         />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-outline uppercase tracking-wide mb-2">Categoria</label>
                            <select 
                               className="w-full bg-surface-container-lowest border border-outline-variant/50 px-3 py-2.5 text-sm font-medium rounded-lg focus:outline-none focus:border-[#1A5E35]"
                               value={formData.category}
                               onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                               <option value="RAÇÃO">Ração</option>
                               <option value="VACINAS">Vacina</option>
                               <option value="MEDICAMENTOS">Medicamento</option>
                               <option value="GERAL">Geral</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-outline uppercase tracking-wide mb-2">Medida</label>
                            <select 
                               className="w-full bg-surface-container-lowest border border-outline-variant/50 px-3 py-2.5 text-sm font-medium rounded-lg focus:outline-none focus:border-[#1A5E35]"
                               value={formData.unit}
                               onChange={e => setFormData({ ...formData, unit: e.target.value })}
                            >
                               <option value="KG">Quilo (kg)</option>
                               <option value="G">Grama (g)</option>
                               <option value="L">Litro (l)</option>
                               <option value="ML">Mililitro (ml)</option>
                               <option value="UN">Unidade (un)</option>
                               <option value="DOSES">Doses</option>
                            </select>
                         </div>
                      </div>

                      {!editingItem && (
                         <div>
                            <label className="block text-xs font-bold text-outline uppercase tracking-wide mb-2 flex justify-between">
                               <span>Quantidade Inicial (Opcional)</span>
                            </label>
                            <div className="relative">
                               <input 
                                  type="number" 
                                  min="0"
                                  step="any"
                                  value={formData.initialQuantity}
                                  onChange={e => setFormData({ ...formData, initialQuantity: Number(e.target.value) })}
                                  className="w-full bg-surface-container-lowest border border-outline-variant/50 px-3 py-2.5 text-sm font-medium rounded-lg focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35]"
                               />
                               <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                  <span className="text-xs font-bold text-outline uppercase">{formData.unit}</span>
                               </div>
                            </div>
                            <p className="text-[10px] text-on-surface-variant mt-2 font-medium">Informe a quantidade já disponível na granja.</p>
                         </div>
                      )}

                      <div className="mt-4 flex gap-3 pt-4 border-t border-outline-variant/20">
                         <button 
                            type="button" 
                            onClick={() => setIsDialogOpen(false)}
                            className="flex-1 py-2.5 text-xs font-bold rounded-lg border border-outline-variant text-[#0D2E1A] hover:bg-surface-container-lowest transition-colors"
                         >
                            Cancelar
                         </button>
                         <button 
                            type="button" 
                            onClick={() => {
                              if (!formData.name.trim()) { toast.error("Preencha o nome do produto."); return; }
                              setDialogStep(2);
                            }}
                            className="flex-1 py-2.5 bg-[#1A5E35] hover:bg-[#0D2E1A] text-white text-xs font-bold rounded-lg transition-colors"
                         >
                            Próximo
                         </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-[#fff8e1] border border-[#ffe082] p-4 rounded-xl mb-4">
                         <h3 className="text-sm font-bold text-[#ff8f00] flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4" /> Alerta de Estoque Mínimo
                         </h3>
                         <p className="text-xs text-[#ff6f00]/80">Defina o estoque mínimo aceitável para ser alertado quando for necessário reposição deste item.</p>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-outline uppercase tracking-wide mb-2 flex justify-between">
                            <span>Ponto de Pedido (Qtd. Mínima)</span>
                         </label>
                         <div className="relative">
                            <input 
                               type="number" 
                               min="0"
                               step="any"
                               value={formData.minQuantity}
                               onChange={e => setFormData({ ...formData, minQuantity: Number(e.target.value) })}
                               className="w-full bg-surface-container-lowest border border-outline-variant/50 px-3 py-2.5 text-sm font-medium rounded-lg focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35]"
                            />
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                               <span className="text-xs font-bold text-outline uppercase">{formData.unit}</span>
                            </div>
                         </div>
                         <p className="text-[10px] text-on-surface-variant mt-2 font-medium">Você será notificado se o saldo ficar menor que este valor.</p>
                      </div>

                      <div className="mt-4 flex gap-3 pt-4 border-t border-outline-variant/20">
                         <button 
                            type="button" 
                            onClick={() => setDialogStep(1)}
                            className="flex-1 py-2.5 text-xs font-bold rounded-lg border border-outline-variant text-[#0D2E1A] hover:bg-surface-container-lowest transition-colors"
                         >
                            Voltar
                         </button>
                         <button 
                            type="submit" 
                            disabled={saving}
                            className="flex-1 py-2.5 bg-[#1A5E35] hover:bg-[#0D2E1A] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                         >
                            {saving ? 'Aguarde...' : 'Salvar Insumo'}
                         </button>
                      </div>
                    </>
                  )}
                  
               </form>
            </div>
         </div>
      )}

    </main>
  );
}

export default function W24ListaItensEstoquePage() {
   return (
      <Suspense fallback={<div className="p-8 text-center text-outline">Carregando Estoque...</div>}>
         <ItensEstoqueComponent />
      </Suspense>
   );
}
