"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  ArrowLeft,
  Package,
  FileText,
  Warehouse,
  ClipboardList,
  Save,
  ScanLine
} from "lucide-react";

import { FarmSelector } from "@/components/FarmSelector";
import { getUserFarms, type FarmOption } from "@/app/actions/dashboard";
import { getStockItems, syncStockMovements } from "@/app/actions/estoque";
import { db } from "@/lib/db/dexie";

const formSchema = z.object({
  type: z.enum(["IN", "OUT"]),
  itemId: z.string().min(1, "Selecione um produto"),
  quantity: z.number().positive("A quantidade deve ser maior que zero"),
  price: z.preprocess((val) => (val === "" || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)), z.number().nonnegative("O preço não pode ser negativo").optional()),
  entryDate: z.string().min(1, "Data é obrigatória"),
  nfNumber: z.string().optional(),
  provider: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type StockItemShort = { id: string; name: string; unit: string; category: string };

function EntradaEstoqueComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [stockItems, setStockItems] = useState<StockItemShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [totalCalculado, setTotalCalculado] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
       type: "IN",
       itemId: "",
       entryDate: new Date().toISOString().split('T')[0],
       nfNumber: "",
       provider: ""
    }
  });

  const watchQuantity = watch("quantity");
  const watchPrice = watch("price");
  const watchItemId = watch("itemId");

  // Determine current selected item unit
  const selectedItem = stockItems.find(i => i.id === watchItemId);
  const currentUnit = selectedItem ? selectedItem.unit.toUpperCase() : "UND";

  useEffect(() => {
     setIsOnline(navigator.onLine);
     const handleOnline = () => setIsOnline(true);
     const handleOffline = () => setIsOnline(false);
     window.addEventListener('online', handleOnline);
     window.addEventListener('offline', handleOffline);
     return () => {
       window.removeEventListener('online', handleOnline);
       window.removeEventListener('offline', handleOffline);
     };
  }, []);

  useEffect(() => {
     const val = (watchQuantity || 0) * (watchPrice || 0);
     setTotalCalculado(val);
  }, [watchQuantity, watchPrice]);

  useEffect(() => {
    async function loadInitialData() {
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
        
        let initialFarmId = result.farms[0].id;
        if (paramFarmId && farmIds.includes(paramFarmId)) {
          initialFarmId = paramFarmId;
        } else if (storedFarmId && farmIds.includes(storedFarmId)) {
          initialFarmId = storedFarmId;
        }
        
        setSelectedFarmId(initialFarmId);
      }
    }
    loadInitialData();
  }, [router, searchParams]);

  useEffect(() => {
    async function loadItems() {
      if (!selectedFarmId) return;
      setLoading(true);

      // Persist selection
      localStorage.setItem("selectedFarmId", selectedFarmId);
      const params = new URLSearchParams(searchParams.toString());
      if (params.get("farmId") !== selectedFarmId) {
        params.set("farmId", selectedFarmId);
        router.replace(`?${params.toString()}`);
      }

      if (isOnline) {
         try {
            const res = await getStockItems(selectedFarmId);
            if (res.items) {
               setStockItems(res.items);
               localStorage.setItem(`estoque_items_${selectedFarmId}`, JSON.stringify(res.items));
            }
         } catch (e) {
            console.error("Erro ao puxar itens", e);
         }
      } else {
         // Offline fallback mock
         const cached = localStorage.getItem(`estoque_items_${selectedFarmId}`);
         if (cached) {
            setStockItems(JSON.parse(cached));
         } else {
            toast.warning("Você está offline e não possui itens em cache para esta granja.");
         }
      }
      setLoading(false);
    }
    loadItems();
  }, [selectedFarmId, isOnline, router, searchParams]);

  const onSubmit = async (data: FormValues) => {
    if (!selectedFarmId) return;
    setIsSubmitting(true);

    try {
      const syncId = crypto.randomUUID();
      let reasonStr = "";
      if (data.type === 'IN') {
         reasonStr = data.nfNumber ? `NF: ${data.nfNumber} - Fornec: ${data.provider || 'N/A'}` : "Entrada manual";
      } else {
         reasonStr = data.nfNumber ? `Doc: ${data.nfNumber} - Destino: ${data.provider || 'N/A'}` : "Saída manual / Consumo";
      }
      
      // Merge selected date with current time
      const parts = data.entryDate.split('-');
      const now = new Date();
      now.setFullYear(parseInt(parts[0], 10));
      now.setMonth(parseInt(parts[1], 10) - 1);
      now.setDate(parseInt(parts[2], 10));

      const localRecord = {
        syncId,
        itemId: data.itemId,
        farmId: selectedFarmId,
        type: data.type as 'IN' | 'OUT',
        quantity: data.quantity,
        reason: reasonStr,
        date: now.toISOString(),
        syncStatus: 'pending' as const,
        createdAt: new Date().toISOString()
      };

      // Salva no IndexedDB (Dexie)
      await db.stock_movements_queue.add(localRecord);
      
      if (isOnline) {
        toast.loading("Sincronizando com o servidor...", { id: "sync-stock" });
        const pending = await db.stock_movements_queue.where("syncStatus").equals("pending").toArray();
        if (pending.length > 0) {
           const result = await syncStockMovements(pending);
           if (result.success) {
              await Promise.all(
                 pending.map(record => db.stock_movements_queue.update(record.id!, { syncStatus: "synced" }))
              );
              toast.success(data.type === 'IN' ? "Entrada registrada com sucesso!" : "Saída registrada com sucesso!", { id: "sync-stock" });
              reset();
           } else {
              toast.error("Salvo offline. Erro ao sincronizar com banco.", { id: "sync-stock" });
           }
        }
      } else {
        toast.success("Registrado offline. Será sincronizado quando houver conexão.");
        reset();
      }
      
    } catch (error: unknown) {
      const eMsg = error instanceof Error ? error.message : "Erro desconhecido";
      console.error(eMsg);
      toast.error("Erro fatal ao salvar registro. Verifique seu navegador.");
    } finally {
      setIsSubmitting(false);
    }
  };

   const watchType = watch("type");
   
   return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6">
      
      {/* Header and farm selector */}
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

         <div className="flex justify-between items-end">
            <div>
               <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight flex items-center gap-4">
                  {watchType === "IN" ? "Registro de Entrada" : "Registro de Saída"}
                  {!isOnline && (
                     <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
                        Modo Offline
                     </span>
                  )}
               </h1>
               <p className="text-sm font-medium text-outline mt-1 max-w-xl">
                  {watchType === "IN" ? "Lançamento de mercadorias e entrada física nos estoques." : "Registro de consumo avulso, perda ou devolução do estoque."}
               </p>
            </div>
         </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 mt-2 pb-8">
         {/* Form Area - xl:w-2/3 */}
         <div className="xl:w-2/3 bg-white rounded-2xl p-8 border border-outline-variant/30 shadow-sm flex flex-col">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 flex-1">
               
               {/* 0. Tipo de Movimentação */}
               <div>
                  <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-3">
                     Tipo de Movimentação
                  </label>
                  <div className="flex gap-4">
                     <label className={`flex-1 flex items-center justify-center p-4 border rounded-xl gap-2 cursor-pointer transition-all font-bold ${watchType === 'IN' ? 'border-[#1A5E35] bg-[#1A5E35]/10 text-[#1A5E35]' : 'border-outline-variant/30 text-outline'}`}>
                        <input type="radio" value="IN" {...register("type")} className="hidden" />
                        Entrada (+ Estoque)
                     </label>
                     <label className={`flex-1 flex items-center justify-center p-4 border rounded-xl gap-2 cursor-pointer transition-all font-bold ${watchType === 'OUT' ? 'border-tertiary bg-tertiary/10 text-tertiary' : 'border-outline-variant/30 text-outline'}`}>
                        <input type="radio" value="OUT" {...register("type")} className="hidden" />
                        Saída (- Estoque)
                     </label>
                  </div>
               </div>

               {/* 1. Informações do Produto */}
               <div>
                  <div className="flex items-center gap-2 mb-6">
                     <Package className="w-5 h-5 text-[#1A5E35]" />
                     <h2 className="text-sm font-bold text-[#0D2E1A]">Selecionar Insumo</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                           Produto <span className="text-[#c62828]">*</span>
                        </label>
                        <select
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all"
                           {...register("itemId")}
                           disabled={loading || stockItems.length === 0}
                        >
                           <option value="">{loading ? "Carregando produtos..." : stockItems.length === 0 ? "Nenhum produto cadastrado" : "Selecione o produto adquirido..."}</option>
                           {stockItems.map(item => (
                              <option key={item.id} value={item.id}>
                                 {item.name} ({item.category}) - {item.unit}
                              </option>
                           ))}
                        </select>
                        <div className="flex justify-between items-start mt-1.5">
                           {errors.itemId ? (
                              <p className="text-[#c62828] text-xs font-bold">{errors.itemId.message}</p>
                           ) : (
                              <p className="text-[10px] text-outline font-medium">
                                 {watchType === 'IN' ? "Você só pode dar entrada em itens previamente cadastrados." : "Selecione o item que será removido do estoque."}
                              </p>
                           )}
                           <Link href={`/estoque/itens?farmId=${selectedFarmId}`}>
                              <span className="text-[10px] text-[#1A5E35] font-bold hover:underline cursor-pointer">+ Cadastrar novo produto</span>
                           </Link>
                        </div>
                     </div>

                     <div>
                        <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                           {watchType === 'IN' ? "Quantidade Recebida" : "Quantidade de Saída"} <span className="text-[#c62828]">*</span>
                        </label>
                        <div className="relative">
                           <input
                              type="number"
                              step="any"
                              placeholder="0.00"
                              className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all font-mono"
                              {...register("quantity", { valueAsNumber: true })}
                           />
                           <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                              <span className="text-[10px] font-bold text-white bg-[#0D2E1A] px-2 py-0.5 rounded">{currentUnit}</span>
                           </div>
                        </div>
                        {errors.quantity && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.quantity.message}</p>}
                     </div>

                     {watchType === 'IN' && (
                        <div>
                           <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                              {watchType === 'IN' ? "Preço Total / Custo (R$)" : "Custo Estimado (R$ - Opcional)"}
                           </label>
                           <input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all font-mono"
                              {...register("price", { valueAsNumber: true })}
                           />
                           {errors.price && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.price.message}</p>}
                        </div>
                     )}
                  </div>
               </div>

               <hr className="border-outline-variant/20" />

               {/* 2. Documentação & Logística */}
               <div>
                  <div className="flex items-center gap-2 mb-6">
                     <FileText className="w-5 h-5 text-[#1A5E35]" />
                     <h2 className="text-sm font-bold text-[#0D2E1A]">Documentação & Logística (Opcional)</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div>
                        <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                           {watchType === 'IN' ? "Data de Entrada" : "Data da Ocorrência"} <span className="text-[#c62828]">*</span>
                        </label>
                        <input
                           type="date"
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all"
                           {...register("entryDate")}
                        />
                        {errors.entryDate && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.entryDate.message}</p>}
                     </div>

                     <div>
                        <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                           {watchType === 'IN' ? "Número da NF" : "Doc. Opcional / Motivo"}
                        </label>
                        <input
                           type="text"
                           placeholder="Ex: 000.123.456"
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all font-mono"
                           {...register("nfNumber")}
                        />
                        {errors.nfNumber && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.nfNumber.message}</p>}
                     </div>

                     <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                           {watchType === 'IN' ? "Fornecedor" : "Setor/Lote de Destino (Opcional)"}
                        </label>
                        <input
                           type="text"
                           placeholder="Ex: AgroPlus S.A."
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all"
                           {...register("provider")}
                        />
                        {errors.provider && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.provider.message}</p>}
                     </div>
                  </div>
               </div>

               {/* Action Buttons */}
               <div className="mt-auto flex flex-col-reverse sm:flex-row justify-end items-center gap-4">
                  <Link href="/estoque">
                     <button type="button" className="w-full sm:w-auto px-6 py-3 bg-surface-container border border-outline-variant/30 hover:bg-outline-variant/20 text-[#0D2E1A] text-sm font-bold rounded-xl transition-all shadow-sm">
                        Cancelar
                     </button>
                  </Link>
                  <button
                     type="submit"
                     disabled={isSubmitting || stockItems.length === 0}
                     className={`w-full sm:w-auto px-8 py-3 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 ${
                        watchType === 'IN' ? 'bg-[#1A5E35] hover:bg-[#0D2E1A]' : 'bg-tertiary hover:bg-tertiary/90'
                     }`}
                  >
                     {isSubmitting ? (
                        <>Processando...</>
                     ) : (
                        <>
                           <Save className="w-4 h-4" /> {watchType === 'IN' ? 'Confirmar Entrada' : 'Confirmar Saída'}
                        </>
                     )}
                  </button>
               </div>
            </form>
         </div>

         {/* Right Sidebar - Analytics/Status - xl:w-1/3 */}
         <div className="xl:w-1/3 flex flex-col gap-6">
            
            <div className="bg-[#0D2E1A] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 blur-2xl pointer-events-none" />
               <h3 className="text-sm font-bold text-white mb-6 relative z-10">Resumo da Movimentação</h3>
               
               <div className="space-y-4 mb-6 relative z-10">
                  <div className="flex justify-between items-center text-sm">
                     <span className="font-bold text-white/70">Produto</span>
                     <span className="font-bold text-white max-w-[150px] text-right truncate">
                        {watchItemId ? selectedItem?.name : '-'}
                     </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="font-bold text-white/70">{watchType === 'IN' ? 'Adicionado' : 'Removido'}</span>
                     <span className={`font-extrabold ${watchType === 'IN' ? 'text-[#a5d6a7]' : 'text-tertiary/90'}`}>
                        {watchType === 'IN' ? '+' : '-'}{watchQuantity || 0} {currentUnit.toLowerCase()}
                     </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-white/10 pt-3">
                     <span className="font-bold text-white/70">Custo Declarado</span>
                     <span className="font-manrope font-extrabold text-lg flex items-center">
                        <span className="text-xs mr-1 text-white/60">R$</span>
                        {totalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                     </span>
                  </div>
               </div>
            </div>

            {/* Warehouse Visual Component */}
            <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
               <h3 className="text-sm font-bold text-[#0D2E1A] mb-5">Destino Típico na Granja</h3>

               <div className="space-y-5">
                  <div className="flex gap-4 items-center">
                     <div className="bg-[#e8f5e9] p-3 rounded-lg border border-[#a5d6a7]/50">
                        <Warehouse className="w-5 h-5 text-[#2e7d32]" />
                     </div>
                     <div className="flex-1">
                        <p className="text-xs font-bold text-[#0D2E1A]">Armazém Seco</p>
                        <p className="text-[10px] text-outline font-medium mt-0.5">Ração e embalagens</p>
                     </div>
                  </div>
                  <div className="flex gap-4 items-center">
                     <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <ClipboardList className="w-5 h-5 text-blue-600" />
                     </div>
                     <div className="flex-1">
                        <p className="text-xs font-bold text-[#0D2E1A]">Câmara Fria</p>
                        <p className="text-[10px] text-outline font-medium mt-0.5">Vacinas e Biológicos</p>
                     </div>
                  </div>
               </div>
            </div>



         </div>
      </div>
    </main>
  );
}

export default function W25EntradaEstoquePage() {
   return (
      <Suspense fallback={<div className="p-8 text-center font-bold text-outline">Carregando formulário...</div>}>
         <EntradaEstoqueComponent />
      </Suspense>
   );
}
