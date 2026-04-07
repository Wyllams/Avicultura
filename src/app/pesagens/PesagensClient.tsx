"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { 
  Calendar, 
  BarChart2, 
  CheckCircle2, 
  Download, 
  History, 
  Info, 
  TrendingUp,
  Scale
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  Cell,
  ResponsiveContainer 
} from "recharts";
import { db } from "@/lib/db/dexie";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { syncWeightRecords } from "../actions/pesagens";

const formSchema = z.object({
  date: z.string().min(1, { message: "Data é obrigatória" }),
  sampleSize: z.number().min(1, { message: "A amostra não pode ser nula" }),
  weight: z.number().min(1, { message: "Peso inválido" }),
});

export default function PesagensClient({ initialFlock }: { initialFlock?: any }) {
  const isOnline = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineRecords, setOfflineRecords] = useState<any[]>([]);

  // Carregar os dados iniciais dos logs
  const serverLogs = initialFlock?.weightLogs || [];
  
  // O estado exibido combina os do servidor e os do offline
  const [allLogs, setAllLogs] = useState<any[]>(serverLogs);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      sampleSize: 150,
      weight: 0,
    }
  });

  const weightValue = watch("weight");
  const hasValidWeight = weightValue > 0;

  // Atualizar filas offline
  useEffect(() => {
    if (!initialFlock) return;
    const fetchOffline = async () => {
      const records = await db.weighing_queue
        .where("flockId")
        .equals(initialFlock.id)
        .toArray();
      setOfflineRecords(records);
      
      // Combinar os logs (os locais temporários não estão na cloud ainda, exceto os sincronizados ou pendentes)
      const pendingIds = records.filter(r => r.syncStatus === 'pending').map(r => r.syncId);
      const uniqueOffline = records.filter(r => r.syncStatus === 'pending');
      const filteredServer = serverLogs.filter((s: any) => !pendingIds.includes(s.syncId));
      
      const combined = [...filteredServer, ...uniqueOffline].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setAllLogs(combined);
    };
    fetchOffline();
  }, [initialFlock, serverLogs]);

  // Sincronização automática
  useEffect(() => {
    const syncPendente = async () => {
      if (!isOnline || isSyncing || !initialFlock) return;
      const pendentes = await db.weighing_queue
        .where("syncStatus")
        .equals("pending")
        .toArray();

      if (pendentes.length > 0) {
        setIsSyncing(true);
        try {
          const result = await syncWeightRecords(pendentes);
          if (result.success && result.syncedIds) {
             for (const sid of result.syncedIds) {
                await db.weighing_queue.where("syncId").equals(sid).modify({ syncStatus: "synced" });
             }
             if (result.syncedIds.length > 0) {
               toast.success(`Sincronização: ${result.syncedIds.length} pesagens salvas na nuvem.`);
             }
          }
        } catch (error) {
          console.error("Erro na sincronização dexie:", error);
        } finally {
          setIsSyncing(false);
          // Reinicia hook effect para recalcular
          const records = await db.weighing_queue.where("flockId").equals(initialFlock.id).toArray();
          setOfflineRecords(records);
        }
      }
    };
    
    syncPendente();
  }, [isOnline, initialFlock, isSyncing]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!initialFlock) {
        toast.error("Lote inválido.");
        return;
    }
    try {
      const syncId = crypto.randomUUID();
      const housingDate = new Date(initialFlock.housingDate);
      const logDate = new Date(data.date);
      let calculatedAge = Math.floor((logDate.getTime() - housingDate.getTime()) / (1000 * 3600 * 24));
      if (calculatedAge < 0) calculatedAge = 0;

      const newRecord = {
          syncId,
          flockId: initialFlock.id,
          date: new Date(data.date).toISOString(),
          ageInDays: calculatedAge,
          averageWeight: data.weight,
          sampleSize: data.sampleSize,
          syncStatus: 'pending' as const,
          createdAt: new Date().toISOString()
      };

      await db.weighing_queue.add(newRecord);
      
      const newAllLogs = [...allLogs, newRecord].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setAllLogs(newAllLogs);

      toast.success("Pesagem registrada com sucesso!" + (!isOnline ? " (Offline)" : ""));
      reset({ date: data.date, sampleSize: data.sampleSize, weight: 0 }); 

    } catch (error) {
       console.error(error);
       toast.error("Erro ao registrar pesagem.");
    }
  };

  const handlePrint = () => {
     window.print();
  };

  // ----- CÁLCULOS DOS CARDS E GRÁFICOS -----

  const getDayLabel = (dateStr: string) => {
     try {
       const dateObj = new Date(dateStr);
       const housingObj = initialFlock ? new Date(initialFlock.housingDate) : new Date();
       const days = Math.floor((dateObj.getTime() - housingObj.getTime()) / (1000 * 3600 * 24)) + 1; // Começa do dia 1
       return `D${days > 0 ? days : 1}`;
     } catch (e) {
       return "";
     }
  };

  const lastLogs = allLogs.slice(-5);
  const barData = lastLogs.map((log, index) => ({
      day: getDayLabel(log.date),
      val: Number((log.averageWeight / 1000).toFixed(3)), // Gramas para kg no gráfico
      rawWeight: log.averageWeight,
      isToday: index === lastLogs.length - 1 
  }));

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

  const last7Logs = allLogs.slice(-7);
  const weekAvg = last7Logs.length > 0 
      ? Number((last7Logs.reduce((acc, curr) => acc + curr.averageWeight, 0) / last7Logs.length).toFixed(2))
      : 0;

  const currentAge = initialFlock ? Math.floor((new Date().getTime() - new Date(initialFlock.housingDate).getTime()) / (1000 * 3600 * 24)) : 0;
  const breed = initialFlock?.breed || 'Linha Comercial';

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { size: A4 landscape; margin: 10mm; }
        `}
      </style>
      <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-8 print:w-full print:max-w-none print:m-0 print:p-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
         <div>
            <div className="flex items-center gap-2 mb-2">
               <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
                  Monitoramento de Ganho
               </h1>
               {!isOnline && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                     Offline
                  </span>
               )}
            </div>
            <p className="text-sm font-medium text-outline">
               {initialFlock ? `Registro diário de desempenho do ${initialFlock.name} (${initialFlock.barn.name})` : 'Nenhum lote ativo encontrado.'}
            </p>
         </div>
         
         <div className="flex items-center gap-3">
            <Link href="/pesagens/historico">
               <button className="flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-container-high text-[#1A5E35] text-xs font-bold rounded-lg transition-all shadow-sm">
                  <History className="w-4 h-4" /> Histórico Completo
               </button>
            </Link>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-xs font-bold rounded-lg transition-all shadow-sm">
               <Download className="w-4 h-4" /> Exportar Relatório
            </button>
         </div>
      </div>

       {/* Print Version Header Only visible when printing */}
       <div className="hidden print:block mb-6 pb-4 border-b border-[#0D2E1A]/20">
            <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A]">Boletim de Monitoramento de Ganho</h1>
            <p className="text-sm font-medium text-outline">
               Lote: {initialFlock?.name} | Galpão: {initialFlock?.barn?.name} | Granja: {initialFlock?.barn?.farm?.name}
            </p>
            <p className="text-xs font-bold text-outline-variant mt-2">Documento gerado em: {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}</p>
       </div>

      <div className="flex flex-col lg:flex-row gap-6">
         
         {/* Left Side - Form + Micro-cards */}
         <div className="lg:w-7/12 flex flex-col gap-6">
            
            {/* Main Form Card */}
            <div className="bg-white rounded-2xl p-8 border border-outline-variant/30 shadow-sm print:hidden">
               <div className="flex items-center gap-2 mb-6 text-[#1A5E35]">
                  <Scale className="w-5 h-5" />
                  <h2 className="text-sm font-bold uppercase tracking-wider">Novos Dados de Pesagem</h2>
               </div>

               <form id="weight-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-6">
                     <div>
                        <label className="block text-[10px] font-bold text-outline-variant uppercase tracking-wider mb-2">
                           Data da Coleta
                        </label>
                        <div className="relative">
                           <input 
                              type="date"
                              {...register("date")}
                              className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 pb-2.5 rounded-lg text-sm text-foreground focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all"
                           />
                           <Calendar className="w-4 h-4 text-outline absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        {errors.date && <p className="text-xs text-[#c62828] font-medium mt-1">{errors.date.message}</p>}
                     </div>

                     <div>
                        <label className="block text-[10px] font-bold text-outline-variant uppercase tracking-wider mb-2">
                           Aves Pesadas (Amostra)
                        </label>
                        <div className="relative">
                           <input 
                              type="number"
                              {...register("sampleSize", { valueAsNumber: true })}
                              className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 pb-2.5 rounded-lg text-sm font-bold text-foreground focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all"
                           />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-outline-variant">UNIDS</span>
                        </div>
                        {errors.sampleSize && <p className="text-xs text-[#c62828] font-medium mt-1">{errors.sampleSize.message}</p>}
                     </div>
                  </div>

                  <div>
                     <label className="block text-[10px] font-bold text-outline-variant uppercase tracking-wider mb-2">
                        Peso Médio Calculado (g)
                     </label>
                     <div className="relative">
                        <input 
                           type="number"
                           step="0.01"
                           {...register("weight", { valueAsNumber: true })}
                           placeholder="0.00"
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 border-l-4 focus:border-l-[#1A5E35] px-6 pr-36 py-6 rounded-xl text-4xl font-manrope font-extrabold text-[#0D2E1A] focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-right pointer-events-none">
                           <p className="text-sm font-extrabold text-[#1A5E35] tracking-widest uppercase">Gramas</p>
                           <p className="text-[10px] font-bold text-outline uppercase">Precisão Digital</p>
                        </div>
                     </div>
                     {errors.weight && <p className="text-xs text-[#c62828] font-medium mt-1">{errors.weight.message}</p>}
                  </div>

                  {/* Dynamic Calculation Container - Shown when typing weight interactively */}
                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${hasValidWeight ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                     <div className="bg-[#f1f8f3] border border-[#a5d6a7] rounded-xl p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-[#1A5E35] rounded-xl flex items-center justify-center text-white shadow-sm">
                              <TrendingUp className="w-6 h-6" />
                           </div>
                           <div>
                              <p className="text-[10px] font-bold text-[#1A5E35] uppercase tracking-wider mb-1">
                                 Simulador de GPD na Mão
                              </p>
                              <p className="text-2xl font-bold text-[#0D2E1A] flex items-baseline gap-2">
                                 {latestWeighing ? Number((weightValue - latestWeighing.averageWeight).toFixed(2)) : weightValue} <span className="text-xs font-semibold text-outline-variant">g/dia vs Ontem</span>
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <button 
                     type="submit" 
                     form="weight-form"
                     disabled={isSubmitting || !initialFlock}
                     className="w-full flex justify-center items-center gap-2 bg-[#0D2E1A] hover:bg-[#1A5E35] disabled:opacity-70 text-white text-base font-bold px-6 py-4 rounded-xl transition-all shadow-md mt-4"
                  >
                     <span>Finalizar Registro</span>
                     <CheckCircle2 className="w-5 h-5" />
                  </button>

               </form>
            </div>

            {/* Micro-cards Base */}
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-6 print:flex print:flex-wrap print:gap-12 print:mb-8 print:mt-2">
               <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/20 shadow-sm flex flex-col justify-center print:border-none print:shadow-none print:bg-white print:p-0">
                  <p className="text-[10px] font-bold text-outline-variant uppercase tracking-wider mb-2">Última Pesagem</p>
                  <p className="text-2xl font-manrope font-bold text-foreground">
                    {latestWeighing ? `${latestWeighing.averageWeight}g` : '0g'}
                  </p>
                  {latestWeighing && (
                      <p className="text-xs font-medium text-outline mt-1">
                          Registrado em {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(latestWeighing.date))} 
                          {latestWeighing.syncStatus === 'pending' && <span className="text-amber-600 ml-1">(Pendente)</span>}
                      </p>
                  )}
               </div>
               <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/20 shadow-sm flex flex-col justify-center print:border-none print:shadow-none print:bg-white print:p-0">
                  <p className="text-[10px] font-bold text-outline-variant uppercase tracking-wider mb-2">Média da Semana</p>
                  <p className="text-2xl font-manrope font-bold text-foreground">{weekAvg}g</p>
                  <p className="text-xs font-bold text-[#1A5E35] mt-1 flex items-center gap-1">
                     <TrendingUp className="w-3 h-3" /> Base em {last7Logs.length} coletas
                  </p>
               </div>
               <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/20 shadow-sm flex flex-col justify-center print:border-none print:shadow-none print:bg-white print:p-0">
                  <p className="text-[10px] font-bold text-outline-variant uppercase tracking-wider mb-2">GPD Atual</p>
                  <p className="text-2xl font-manrope font-bold text-foreground">{gpd} <span className="text-sm">g/dia</span></p>
                  <p className="text-xs font-medium text-outline mt-1">Ganho base histórico</p>
               </div>
            </div>

         </div>

         {/* Right Side - Widgets (Flex 5/12) */}
         <div className="lg:w-5/12 flex flex-col gap-6 print:w-full">
            
            {/* Widget 1 - Insights */}
            <div className="bg-[#0D2E1A] rounded-2xl p-6 relative overflow-hidden shadow-md h-48 flex flex-col justify-end print:hidden">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img 
                  src="https://images.unsplash.com/photo-1548550023-2bf3f495ce4b?w=500&q=80" 
                  alt="Chicken" 
                  className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
               />
               <div className="relative z-10">
                  <span className="inline-block bg-[#e8f5e9] text-[#1A5E35] text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1.5 rounded-full mb-3 shadow-sm">
                     Insights do Lote
                  </span>
                  <h3 className="text-xl font-manrope font-bold text-white leading-tight mb-2">
                     O Lote {initialFlock?.name || "Desconhecido"} está no dia {currentAge} do ciclo.
                  </h3>
                  <p className="text-sm text-[#a5d6a7] font-medium leading-relaxed">
                     Linhagem mapeada: {breed}.
                  </p>
               </div>
            </div>

            {/* Widget 2 - Gráfico */}
            <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm min-h-[300px] flex flex-col print:border-none print:shadow-none print:p-0 print:mt-4">
               <div className="flex items-center gap-2 mb-8 print:mb-4">
                  <BarChart2 className="w-5 h-5 text-[#1A5E35]" />
                  <h3 className="text-xs font-bold text-[#1A5E35] uppercase tracking-wider">
                     Curva de Crescimento (Evolução Diária)
                  </h3>
               </div>
               
               <div className="flex-1 w-full h-full min-h-[220px]">
                  {barData.length > 0 ? (
                    <>
                      <div className="w-full h-full print:hidden">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                               <XAxis 
                                  dataKey="day" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 10, fill: '#737373', fontWeight: 700 }}
                                  dy={10}
                               />
                               <Bar 
                                  dataKey="val" 
                                  radius={[4, 4, 4, 4]} 
                                  barSize={40}
                                  isAnimationActive={false}
                                  label={{ position: 'top', fill: '#0D2E1A', fontSize: 10, fontWeight: 800, formatter: (val: any) => Number(val) > 0 ? `${val}kg` : '' }}
                               >
                                  {barData.map((entry, index) => (
                                     <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.isToday ? '#1A5E35' : '#e5e5e5'} 
                                     />
                                  ))}
                               </Bar>
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                      
                      {/* Fixed Size Chart exclusively for PDF Print Generation */}
                      <div className="hidden print:block w-[1000px] h-[300px] overflow-hidden ml-4">
                         <BarChart width={1000} height={300} data={barData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                               <XAxis 
                                  dataKey="day" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 10, fill: '#737373', fontWeight: 700 }}
                                  dy={10}
                               />
                               <Bar 
                                  dataKey="val" 
                                  radius={[4, 4, 4, 4]} 
                                  barSize={40}
                                  isAnimationActive={false}
                                  label={{ position: 'top', fill: '#0D2E1A', fontSize: 10, fontWeight: 800, formatter: (val: any) => Number(val) > 0 ? `${val}kg` : '' }}
                               >
                                  {barData.map((entry, index) => (
                                     <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.isToday ? '#0D2E1A' : '#e5e5e5'} 
                                     />
                                  ))}
                               </Bar>
                         </BarChart>
                      </div>
                    </>
                  ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-outline gap-3">
                        <Scale className="w-8 h-8 opacity-30" />
                        <p className="text-sm font-medium">Nenhuma pesagem cadastrada ainda.</p>
                     </div>
                  )}
               </div>
            </div>

            {/* Widget 3 - Aviso de Dica */}
            <div className="bg-[#ffebee] border border-[#ffcdd2] rounded-2xl p-5 flex items-start gap-4 print:hidden">
               <div className="w-8 h-8 rounded-full bg-[#ef5350] flex items-center justify-center flex-shrink-0 mt-1">
                  <Info className="w-4 h-4 text-white" />
               </div>
               <div>
                  <h4 className="text-sm font-bold text-[#b71c1c] mb-1">Dica de Precisão</h4>
                  <p className="text-xs text-[#c62828] font-medium leading-relaxed">
                     Para uma amostragem confiável, certifique-se de pesar aves de diferentes pontos do galpão (frente, meio e fundo).
                  </p>
               </div>
            </div>

         </div>
      </div>
    </main>
    </>
  );
}
