"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  Calendar,
  Save,
  Truck,
  Info,
  Scale,
  ArrowLeft
} from "lucide-react";
import { db } from "@/lib/db/dexie";
import { syncFeedRecords } from "@/app/actions/racao";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const formSchema = z.object({
  flockId: z.string().min(1, "Selecione um lote"),
  date: z.string().min(1, "Data é obrigatória"),
  quantityKg: z.number().positive("A quantidade deve ser maior que zero"),
  feedType: z.enum(["pre_inicial", "inicial", "crescimento", "final"]),
  notes: z.string().optional(),
});

export function RegistroRacaoClient({ 
  activeFlocks, 
  initialFlockId 
}: { 
  activeFlocks: any[];
  initialFlockId: string;
}) {
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      flockId: initialFlockId,
      date: new Date().toISOString().split('T')[0],
      feedType: "inicial",
      quantityKg: undefined,
      notes: "",
    }
  });

  const selectedFlockId = watch("flockId");
  const selectedFlock = activeFlocks.find(f => f.id === selectedFlockId) || activeFlocks[0];

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Create local record for Dexie
      const syncId = crypto.randomUUID();
      const localRecord = {
        syncId: syncId,
        flockId: data.flockId,
        date: new Date(data.date).toISOString(),
        feedType: data.feedType,
        quantityKg: data.quantityKg,
        notes: data.notes || null,
        syncStatus: 'pending' as const,
        createdAt: new Date().toISOString()
      };

      // Save to Dexie
      await db.feed_queue.add(localRecord);
      
      // Try to sync if online
      if (isOnline) {
        toast.loading("Sincronizando com o servidor...", { id: "sync-feed" });
        const pending = await db.feed_queue.where("syncStatus").equals("pending").toArray();
        if (pending.length > 0) {
           const result = await syncFeedRecords(pending);
           if (result.success) {
              await Promise.all(
                 pending.map(record => db.feed_queue.update(record.id!, { syncStatus: "synced" }))
              );
              toast.success("Consumo registrado e sincronizado!", { id: "sync-feed" });
           } else {
              toast.error("Salvo offline. Erro ao sincronizar.", { id: "sync-feed" });
           }
        }
      } else {
        toast.success("Consumo registrado offline. Será sincronizado quando houver conexão.");
      }

      router.push(`/racao?loteId=${data.flockId}`);
      router.refresh();
      
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registrar consumo. Verifique se o banco de dados está acessível.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedTypes = [
    { id: "pre_inicial", label: "Pré-inicial", phase: "FASE 1" },
    { id: "inicial", label: "Inicial", phase: "FASE 2" },
    { id: "crescimento", label: "Crescimento", phase: "FASE 3" },
    { id: "final", label: "Final", phase: "FASE 4" },
  ];

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col mb-4">
         <Link href="/racao" className="inline-flex mb-4">
            <span className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">
               <ArrowLeft className="w-4 h-4" /> Voltar
            
            </span>
         </Link>
         <div className="flex justify-between items-center">
             <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
                Registro de Consumo de Ração
             </h1>
             {!isOnline && (
                 <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
                    Modo Offline
                 </span>
             )}
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
         {/* Left Column - Form */}
         <div className="lg:w-2/3 bg-white border border-outline-variant/30 rounded-2xl p-8 shadow-sm h-fit">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 bg-[#e8f5e9] rounded-xl flex items-center justify-center">
                  <Scale className="w-5 h-5 text-[#1A5E35]" />
               </div>
               <h2 className="text-xl font-bold text-[#0D2E1A]">Lançamento Diário</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
               {/* Flock Selection */}
               <div>
                  <label className="block text-sm font-bold text-[#0D2E1A] mb-2">Lote</label>
                  <select
                     {...register("flockId")}
                     className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 rounded-lg text-sm font-bold text-foreground focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all"
                  >
                     {activeFlocks.map(flock => (
                        <option key={flock.id} value={flock.id}>
                           Lote {flock.name} - {flock.farm?.name} ({flock.barn?.name})
                        </option>
                     ))}
                  </select>
                  {errors.flockId && <p className="text-xs text-red-600 font-bold mt-1">{errors.flockId.message}</p>}
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Date */}
                  <div>
                     <label className="block text-sm font-bold text-[#0D2E1A] mb-2">Data do Consumo</label>
                     <div className="relative">
                        <input 
                           type="date"
                           {...register("date")}
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 rounded-lg text-sm font-bold text-foreground focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all"
                        />
                        <Calendar className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                     </div>
                     {errors.date && <p className="text-xs text-red-600 font-bold mt-1">{errors.date.message}</p>}
                  </div>

                  {/* Quantity */}
                  <div>
                     <label className="block text-sm font-bold text-[#0D2E1A] mb-2">Quantidade (kg)</label>
                     <div className="relative">
                        <input 
                           type="number"
                           step="1"
                           placeholder="0"
                           {...register("quantityKg", { valueAsNumber: true })}
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 pl-4 pr-12 py-3 rounded-lg text-sm font-bold text-foreground focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-outline uppercase">
                           KG
                        </span>
                     </div>
                     {errors.quantityKg && <p className="text-xs text-red-600 font-bold mt-1">{errors.quantityKg.message}</p>}
                  </div>
               </div>

               {/* Feed Type Selection */}
               <div>
                  <label className="block text-sm font-bold text-[#0D2E1A] mb-3">Tipo de Ração</label>
                  <Controller
                     control={control}
                     name="feedType"
                     render={({ field }) => (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                           {feedTypes.map((t) => {
                              const isSelected = field.value === t.id;
                              return (
                                 <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => field.onChange(t.id)}
                                    className={`relative px-4 py-4 rounded-xl border flex flex-col items-center justify-center transition-all ${
                                       isSelected 
                                          ? 'border-[#1A5E35] bg-[#1A5E35] text-white shadow-md' 
                                          : 'border-outline-variant/50 bg-white text-foreground hover:border-[#1A5E35]/50'
                                    }`}
                                 >
                                    <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isSelected ? 'text-[#a5d6a7]' : 'text-outline-variant'}`}>
                                       {t.phase}
                                    </span>
                                    <span className="text-sm font-bold">
                                       {t.label}
                                    </span>
                                 </button>
                              );
                           })}
                        </div>
                     )}
                  />
                  {errors.feedType && <p className="text-xs text-red-600 font-bold mt-1">{errors.feedType.message}</p>}
               </div>

               {/* Notes */}
               <div>
                  <label className="block text-sm font-bold text-[#0D2E1A] mb-2">Observações (Opcional)</label>
                  <textarea 
                     {...register("notes")}
                     rows={3}
                     placeholder="Ex: Aumento no desperdício notado nos comedouros laterais..."
                     className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 rounded-lg text-sm font-medium text-foreground focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all resize-none"
                  />
               </div>

               {/* Actions */}
               <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20">
                  <Link href={`/racao?loteId=${selectedFlockId}`}>
                     <button type="button" className="text-sm font-bold text-outline hover:text-[#0D2E1A] transition-colors">
                        Cancelar
                     </button>
                  </Link>
                  
                  <button 
                     type="submit" 
                     disabled={isSubmitting}
                     className="flex items-center gap-2 px-6 py-3 border border-[#1A5E35] bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-70"
                  >
                     {isSubmitting ? (
                        <>Salvando...</>
                     ) : (
                        <>
                           <Save className="w-4 h-4" /> Salvar Lançamento
                        </>
                     )}
                  </button>
               </div>
            </form>
         </div>

         {/* Right Column - Status & Analytics */}
         <div className="lg:w-1/3 flex flex-col gap-6">
            
            {/* Lote Status */}
            <div className="bg-[#1A5E35] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
               {/* Detail decorations */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-2xl pointer-events-none" />
               
               <div className="flex justify-between items-start mb-6">
                  <div>
                     <p className="text-[10px] uppercase tracking-widest font-bold text-[#a5d6a7] mb-1">Status do Lote</p>
                     <h3 className="text-2xl font-manrope font-extrabold">{selectedFlock ? `Lote ${selectedFlock.name}` : '-'}</h3>
                  </div>
                  <span className="px-3 py-1 bg-black/20 text-[#a5d6a7] text-[10px] font-bold rounded-full border border-white/10">
                     No Galpão
                  </span>
               </div>

               <div className="flex justify-between items-end mb-4">
                  <div>
                     <p className="text-[10px] text-white/70 font-medium mb-1">Aves Alojadas</p>
                     <p className="text-lg font-bold">{selectedFlock?.housedBirds?.toLocaleString('pt-BR') || '---'}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] text-white/70 font-medium mb-1">Linhagem</p>
                     <p className="text-lg font-bold">{selectedFlock?.breed || '---'}</p>
                  </div>
               </div>
            </div>

            {/* Silo Analytics */}
            <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-sm flex flex-col relative overflow-hidden opacity-50 grayscale pointer-events-none">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-[#0D2E1A] shadow-sm border border-outline-variant/20">
                   Em breve
               </div>
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-[#0D2E1A]">Estimativa do Silo</h3>
                  <button className="text-outline hover:text-[#0D2E1A]">
                     <Info className="w-4 h-4" />
                  </button>
               </div>

               <div className="flex items-center gap-6 mb-8">
                  {/* Circular SVG Chart */}
                  <div className="relative w-20 h-20 flex-shrink-0">
                     <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                        <circle 
                           cx="50" cy="50" r="40" 
                           stroke="#1A5E35" strokeWidth="12" fill="transparent" 
                           strokeDasharray="251.2" strokeDashoffset={251.2 - 163.28}
                           strokeLinecap="round"
                        />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-extrabold text-[#0D2E1A]">65%</span>
                        <span className="text-[8px] font-bold text-outline uppercase tracking-wider -mt-1">Restante</span>
                     </div>
                  </div>

                  <div className="flex-1 space-y-2">
                     <div className="flex justify-between items-end text-xs">
                        <span className="text-outline font-medium">Capacidade:</span>
                        <span className="font-bold text-[#0D2E1A]">12.000 kg</span>
                     </div>
                     <div className="flex justify-between items-end text-xs">
                        <span className="text-outline font-medium">Saldo Atual:</span>
                        <span className="font-bold text-[#1A5E35]">7.800 kg</span>
                     </div>
                     <div className="flex justify-between items-end text-xs">
                        <span className="text-outline font-medium">Autonomia:</span>
                        <span className="font-bold text-foreground">~4 Dias</span>
                     </div>
                  </div>
               </div>
            </div>

         </div>
      </div>
    </main>
  );
}
