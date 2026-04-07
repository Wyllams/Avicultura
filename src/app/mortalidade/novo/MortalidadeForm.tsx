"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  AlertTriangle, 
  Calendar, 
  Bird, 
  ChevronDown,
  CheckCircle2,
  ArrowLeft,
  WifiOff
} from "lucide-react";
import { db } from "@/lib/db/dexie";
import { syncMortalityRecords } from "@/app/actions/mortalidade";

const formSchema = z.object({
  flockId: z.string().min(1, { message: "Selecione o lote ativo" }),
  date: z.string().min(1, { message: "Data é obrigatória" }),
  quantity: z.number().min(1, { message: "Deve ser no mínimo 1 ave" }),
  cause: z.string().optional(),
  observations: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function MortalidadeForm({ activeFlocks, initialFlockId }: { activeFlocks: any[]; initialFlockId: string }) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      flockId: initialFlockId,
      date: new Date().toISOString().split('T')[0],
      quantity: 0,
      cause: "",
      observations: "",
    }
  });

  const quantityWatched = watch("quantity");
  const flockIdWatched = watch("flockId");
  
  const selectedFlock = activeFlocks.find(f => f.id === flockIdWatched);
  
  // Fake warning calculation (e.g. 0.15% of housed birds)
  const housedBirds = selectedFlock?.housedBirds || 10000;
  const criticalLimit = Math.ceil(housedBirds * 0.0015);
  const isCritical = quantityWatched > criticalLimit;

  const onSubmit = async (data: FormValues) => {
    try {
      // 1. Salvar offline-first (Dexie)
      const syncId = crypto.randomUUID();
      const localRecord = {
         syncId,
         flockId: data.flockId,
         date: new Date(data.date).toISOString(),
         quantity: data.quantity,
         cause: data.cause || undefined,
         syncStatus: 'pending' as const,
         createdAt: new Date().toISOString()
      };

      await db.mortality_queue.add(localRecord);
      
      // 2. Tentar Sincronizar imediatamente com o Supabase
      try {
         const { error, syncedIds } = await syncMortalityRecords([localRecord]);
         
         if (!error && syncedIds?.includes(syncId)) {
            // Atualizar status no dexie
            await db.mortality_queue.where('syncId').equals(syncId).modify({ syncStatus: 'synced' });
            toast.success("Baixa sincronizada com sucesso!");
         } else {
            // Fica pendente no Dexie
            toast.message("Salvo Offline", {
               description: "Abaixa foi salva no dispositivo e será sincronizada em breve.",
               icon: <WifiOff className="w-4 h-4 text-[#e65100]" />
            });
         }
      } catch (e) {
         // Se der erro de rede, apenas mantém offline
         toast.message("Salvo em Cache Local", {
            description: "Você está sem internet. Sincronizaremos automaticamente quando reconectar.",
            icon: <WifiOff className="w-4 h-4 text-[#e65100]" />
         });
      }

      router.push(`/mortalidade?loteId=${data.flockId}`);
      
    } catch (error) {
      console.error(error);
      toast.error("Erro interno. Tente novamente.");
    }
  };

  return (
    <main className="flex-1 p-4 lg:p-8 bg-surface-container-lowest animate-in fade-in max-w-[1400px] mx-auto w-full flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col mb-4">
         <div className="mb-8">
           <Link href={`/mortalidade?loteId=${flockIdWatched}`}>
             <button className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm mb-4 group">
               <ArrowLeft className="w-4 h-4" /> VOLTAR
             </button>
           </Link>
         </div>

         <div className="flex flex-col md:flex-row items-start justify-between gap-4">
            <div>

               
               <h1 className="text-3xl font-manrope font-bold text-foreground tracking-tight mb-2">
                  Registrar Baixa
               </h1>
               <p className="text-sm font-medium text-outline">
                  Insira os dados diários para monitoramento da saúde do plantel.
               </p>
            </div>
            
            <div>
               <div className="flex items-center gap-2 px-4 py-2 bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7] text-xs font-bold rounded-md uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-[#2e7d32] rounded-full animate-pulse" />
                  Offline-First Ativo
               </div>
            </div>
         </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
         {/* Left Side - Form */}
         <div className="xl:w-2/3 bg-white rounded-2xl p-6 lg:p-8 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
            <form id="mortality-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Field 0 */}
                  <div className="md:col-span-2">
                     <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                        Selecione o Lote Ativo
                     </label>
                     <div className="relative">
                        <select 
                           {...register("flockId")}
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 pb-2.5 rounded-lg text-sm font-bold text-foreground focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all appearance-none"
                        >
                           {activeFlocks.map(f => (
                              <option key={f.id} value={f.id}>
                                 {f.name} (Alojado: {new Date(f.housingDate).toLocaleDateString('pt-BR')}) - {f.barn.name}
                              </option>
                           ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-outline absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                     </div>
                     {errors.flockId && <p className="text-xs text-[#c62828] font-medium mt-1">{errors.flockId.message}</p>}
                  </div>

                  {/* Field 1 */}
                  <div>
                     <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                        Data do Registro
                     </label>
                     <div className="relative">
                        <input 
                           type="date"
                           {...register("date")}
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 pb-2.5 rounded-lg text-sm text-foreground focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all"
                        />
                     </div>
                     {errors.date && <p className="text-xs text-[#c62828] font-medium mt-1">{errors.date.message}</p>}
                  </div>

                  {/* Field 3 */}
                  <div>
                     <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                        Quantidade de Aves
                     </label>
                     <div className="relative">
                        <input 
                           type="number"
                           {...register("quantity", { valueAsNumber: true })}
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 pb-2.5 rounded-lg text-lg font-bold text-foreground focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all"
                        />
                        <Bird className="w-5 h-5 text-outline absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                     </div>
                     {errors.quantity && <p className="text-xs text-[#c62828] font-medium mt-1">{errors.quantity.message}</p>}
                  </div>

                  {/* Field 4 */}
                  <div className="md:col-span-2">
                     <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                        Causa Provável (Opcional)
                     </label>
                     <div className="relative">
                        <select 
                           {...register("cause")}
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 pb-2.5 rounded-lg text-sm text-foreground focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all appearance-none"
                        >
                           <option value="">Selecione a causa (caso conhecida)...</option>
                           <option value="Morte Súbita">Morte Súbita</option>
                           <option value="Refugo">Refugo</option>
                           <option value="Sufocamento">Sufocamento</option>
                           <option value="Estresse Térmico">Estresse Térmico</option>
                           <option value="Problemas Locomotores">Problemas Locomotores</option>
                           <option value="Desconhecido">Desconhecida / Outros</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-outline absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                     </div>
                  </div>
               </div>

               {/* Textarea */}
               <div>
                  <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                     Observações Detalhadas
                  </label>
                  <textarea 
                     {...register("observations")}
                     placeholder="Descreva anomalias observadas, sintomas ou condições do ambiente..."
                     rows={4}
                     className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 rounded-lg text-sm text-foreground focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all resize-none"
                  />
               </div>
            </form>

            <div className="flex items-center justify-end gap-4 pt-10">
               <button 
                  type="submit" 
                  form="mortality-form"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-[#0D2E1A] hover:bg-[#1A5E35] disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-3 rounded-lg transition-all shadow-md w-full sm:w-auto justify-center"
               >
                  <CheckCircle2 className="w-4 h-4" /> 
                  {isSubmitting ? "Gravando..." : "Salvar Registro"}
               </button>
            </div>
         </div>

         {/* Right Side - Info */}
         <div className="xl:w-1/3 flex flex-col gap-6">
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
               <h3 className="text-xs font-bold text-outline uppercase tracking-wider mb-4 border-b border-surface-container-low pb-2">
                  Informações do Lote Selecionado
               </h3>
               {selectedFlock ? (
               <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                     <p className="text-[10px] font-bold text-outline-variant uppercase mb-1">Status</p>
                     <p className="font-bold text-[#1A5E35] text-sm">Alojado</p>
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-outline-variant uppercase mb-1">Localização</p>
                     <p className="font-bold text-foreground text-sm">{selectedFlock.barn?.name}</p>
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-outline-variant uppercase mb-1">Plantel Inicial</p>
                     <p className="font-bold text-foreground text-sm">{selectedFlock.housedBirds.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-outline-variant uppercase mb-1">Alerta Crítico</p>
                     <p className="font-bold text-[#c62828] text-sm">{criticalLimit} av/dia</p>
                  </div>
               </div>
               ) : (
                  <p className="text-sm font-bold text-outline">Selecione um lote ativo para visualizar os dados.</p>
               )}
            </div>

            {/* Conditional Alert */}
            <div className={`bg-[#ffebee] border border-[#ffcdd2] rounded-xl p-5 flex items-start gap-4 transition-all duration-300 ${isCritical ? 'opacity-100 scale-100' : 'opacity-50 scale-95 hidden'}`}>
               <div className="mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-[#c62828]" />
               </div>
               <div>
                  <h4 className="text-sm font-bold text-[#c62828] mb-1">Alerta de Mortalidade</h4>
                  <p className="text-xs text-[#b71c1c] font-medium leading-relaxed">
                     Se a mortalidade diária ultrapassar <strong>{criticalLimit} aves</strong>, isso pode indicar um surto ou falha crítica (como temperatura). Recomenda-se contatar o técnico responsável/veterinário.
                  </p>
               </div>
            </div>
         </div>
      </div>
    </main>
  );
}
