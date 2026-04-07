"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  Bell,
  HelpCircle,
  Tractor,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building2,
  Bird,
  Weight,
  Info,
  Lock,
  ArrowLeft
} from "lucide-react";
import { closeFlock } from "@/app/actions/lotes";

const encerrarLoteSchema = z.object({
  dataAbate: z.string().min(1, "A data do abate é obrigatória"),
  destino: z.string().min(1, "Selecione o abatedouro de destino"),
  avesEntregues: z.number().positive("Número de aves deve ser maior que zero"),
  pesoTotal: z.number().positive("Peso total deve ser maior que zero"),
});

type EncerrarLoteForm = z.infer<typeof encerrarLoteSchema>;

export function EncerrarLoteClient({
  flock,
  preCloseStatus
}: {
  flock: any;
  preCloseStatus: { missingWeight: boolean; missingFeed: boolean; daysSinceWeight: number; daysSinceFeed: number };
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedWarning, setAcceptedWarning] = useState(!(preCloseStatus.missingWeight || preCloseStatus.missingFeed));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EncerrarLoteForm>({
    resolver: zodResolver(encerrarLoteSchema),
    defaultValues: {
       dataAbate: new Date().toISOString().split("T")[0]
    }
  });

  const onSubmit = async (data: EncerrarLoteForm) => {
    setIsSubmitting(true);
    try {
      const res = await closeFlock(flock.id, new Date(data.dataAbate));
      if (res.error) {
         toast.error(res.error);
      } else {
         toast.success("Lote encerrado com sucesso! Relatório gerado.");
         router.push(`/lotes/${flock.id}`);
      }
    } catch {
      toast.error("Erro ao encerrar o lote.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const housedDate = new Date(flock.housingDate);
  const now = new Date();
  const housedDays = Math.max(1, Math.floor((now.getTime() - housedDate.getTime()) / (1000 * 3600 * 24)));
  
  let feedTotal = 0;
  flock.feedLogs?.forEach((f: any) => feedTotal += f.quantityKg);

  if (!acceptedWarning) {
     return (
        <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in max-w-3xl mx-auto w-full mt-10">
           <div className="bg-[#fff3e0] border-2 border-[#ffb74d] rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-white rounded-full flex justify-center items-center">
                    <AlertTriangle className="w-6 h-6 text-[#e65100]" />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold text-[#e65100] font-manrope">Atenção antes de encerrar</h2>
                    <p className="text-sm font-medium text-[#e65100]/80">Os seguintes dados estão incompletos para o lote {flock.name}:</p>
                 </div>
              </div>

              <div className="space-y-3 bg-white/50 p-6 rounded-2xl mb-8">
                 {preCloseStatus.missingWeight ? (
                    <p className="text-sm font-bold text-[#c62828] flex items-center gap-2">
                       ❌ Nenhuma pesagem registrada nos últimos 7 dias (Última: {preCloseStatus.daysSinceWeight} dias atrás)
                    </p>
                 ) : (
                    <p className="text-sm font-bold text-[#2e7d32] flex items-center gap-2">
                       ✅ Pesagem atualizada
                    </p>
                 )}
                 
                 {preCloseStatus.missingFeed ? (
                    <p className="text-sm font-bold text-[#c62828] flex items-center gap-2">
                       ❌ Consumo de ração não registrado nos últimos 3 dias (Última: {preCloseStatus.daysSinceFeed} dias atrás)
                    </p>
                 ) : (
                    <p className="text-sm font-bold text-[#2e7d32] flex items-center gap-2">
                       ✅ Consumo de ração atualizado
                    </p>
                 )}
                 <p className="text-sm font-bold text-[#2e7d32] flex items-center gap-2">
                    ✅ Mortalidade atualizada até hoje
                 </p>
              </div>

              <p className="text-sm text-[#e65100]/90 font-medium mb-8 leading-relaxed">
                 Os KPIs finais (CA, Viabilidade, IP) serão calculados com os dados parciais disponíveis e podem não refletir o resultado real do lote.
              </p>

              <div className="flex items-center justify-end gap-4">
                 <button onClick={() => router.back()} className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">\n                    <ArrowLeft className="w-4 h-4" /> Voltar e completar dados\n                 </button>
                 <button onClick={() => setAcceptedWarning(true)} className="px-6 py-3 font-bold text-white bg-[#e65100] hover:bg-[#ef6c00] rounded-xl shadow-sm transition-colors">
                    Encerrar mesmo assim
                 </button>
              </div>
           </div>
        </main>
     )
  }

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-6xl mx-auto w-full flex flex-col gap-8">
      
      <div className="flex items-center justify-between pb-4 border-b border-surface-container-high/50">
         <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="hover:bg-surface-container p-2 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-outline" /></button>
            <h1 className="text-sm font-bold text-[#1A5E35]">Encerrar Lote / Abate</h1>
         </div>
      </div>

      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-[#f0f4f1] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-[160px] border border-outline-variant/20">
            <Tractor className="absolute -right-4 -bottom-4 w-32 h-32 text-[#dcecd8] opacity-50 rotate-[-15deg] pointer-events-none" strokeWidth={1} />
            
            <div className="relative z-10">
               <p className="text-[11px] font-bold text-outline mb-1">Lote Atual</p>
               <p className="text-2xl font-bold font-manrope text-[#1A5E35] tracking-tight">{flock.name}</p>
            </div>
            
            <div className="relative z-10 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
               <div className="text-outline font-medium">Idade Aproximada:</div>
               <div className="font-bold text-foreground text-right">{housedDays} dias</div>
               
               <div className="text-outline font-medium">Aves Iniciais:</div>
               <div className="font-bold text-foreground text-right">{flock.housedBirds.toLocaleString('pt-BR')}</div>
               
               <div className="text-outline font-medium text-[11px]">Consumo Acumulado:</div>
               <div className="font-bold text-foreground text-right text-[11px]">{(feedTotal).toLocaleString('pt-BR')} kg</div>
            </div>
         </div>

         <div className="md:col-span-2 bg-[#ffeb3b]/20 rounded-2xl p-6 shadow-sm border border-[#fbc02d]/30 flex flex-col justify-center h-[160px]">
            <h3 className="text-[#f57f17] font-bold text-lg mb-2">Momento Cítico de Gestão</h3>
            <p className="text-sm font-medium text-[#f57f17]/90 leading-relaxed max-w-xl">
               O encerramento do lote travará as edições dos índices diários. O boletim final e certificado PNSA serão gerados baseados nestas métricas. Preencha os dados do romaneio de abate com precisão.
            </p>
         </div>
      </div>

      {/* Formulário Principal */}
      <section className="bg-[#f8f9fa] rounded-3xl p-8 border border-outline-variant/30 shadow-sm relative">
         <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground font-manrope">Romaneio de Abate</h2>
            <p className="text-xs text-outline font-medium mt-1">Insira os dados finais recebidos do abatedouro para consolidar os resultados do lote.</p>
         </div>

         <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
               <div>
                  <label className="block text-xs font-bold text-foreground mb-2">Data Real do Abate</label>
                  <div className="relative">
                     <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                     <input
                        type="date"
                        {...register("dataAbate")}
                        className="w-full bg-white border border-outline-variant/50 rounded-lg pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#1A5E35] transition-colors shadow-sm"
                     />
                  </div>
                  {errors.dataAbate && <p className="text-xs text-[#c62828] mt-1 font-medium">{errors.dataAbate.message}</p>}
               </div>

               <div>
                  <label className="block text-xs font-bold text-foreground mb-2">Destino (Abatedouro/Frigorífico)</label>
                  <div className="relative">
                     <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                     <select
                        {...register("destino")}
                        className="w-full bg-white border border-outline-variant/50 rounded-lg pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#1A5E35] transition-colors shadow-sm appearance-none"
                     >
                        <option value="">Selecione o Abatedouro</option>
                        <option value="Abatedouro Regional A">Abatedouro Regional A</option>
                        <option value="Matadouro Aurora C">Matadouro Aurora C</option>
                        <option value="Outro (Validado MAPA)">Outro (Validado MAPA)</option>
                     </select>
                  </div>
                  {errors.destino && <p className="text-xs text-[#c62828] mt-1 font-medium">{errors.destino.message}</p>}
               </div>

               <div>
                  <label className="block text-xs font-bold text-foreground mb-2">Nº Total Aves Processadas</label>
                  <div className="relative">
                     <Bird className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                     <input
                        type="number"
                        {...register("avesEntregues", { valueAsNumber: true })}
                        placeholder="Ex: 24500"
                        className="w-full bg-white border border-outline-variant/50 rounded-lg pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#1A5E35] transition-colors shadow-sm font-mono"
                     />
                  </div>
                  {errors.avesEntregues && <p className="text-xs text-[#c62828] mt-1 font-medium">{errors.avesEntregues.message}</p>}
               </div>

               <div>
                  <label className="block text-xs font-bold text-foreground mb-2">Peso Líquido Total (kg)</label>
                  <div className="relative">
                     <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                     <input
                        type="number"
                        step="0.01"
                        {...register("pesoTotal", { valueAsNumber: true })}
                        placeholder="Ex: 75200.5"
                        className="w-full bg-white border border-outline-variant/50 rounded-lg pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#1A5E35] transition-colors shadow-sm font-mono"
                     />
                  </div>
                  {errors.pesoTotal && <p className="text-xs text-[#c62828] mt-1 font-medium">{errors.pesoTotal.message}</p>}
               </div>
            </div>

            <div className="bg-[#e8f5e9] border border-[#a5d6a7] p-5 rounded-2xl flex items-start gap-4 mt-8">
               <div className="w-8 h-8 rounded-full bg-white flex justify-center items-center shrink-0 shadow-sm">
                  <Info className="w-5 h-5 text-[#1A5E35]" />
               </div>
               <div>
                  <h4 className="text-sm font-bold text-[#1A5E35] mb-1">Informação Automática</h4>
                  <p className="text-xs text-[#1A5E35]/80 font-medium leading-relaxed max-w-3xl">
                     Os cálculos de performance serão gerados e travados na nossa "Central de Relatórios". O Lote deixará de constar no painel operacional (Ativo).
                  </p>
               </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-6 border-t border-outline-variant/20">
               <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2.5 bg-surface-container hover:bg-surface-container-high text-foreground text-sm font-bold rounded-lg transition-colors"
               >
                  Cancelar
               </button>
               <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-2.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-70 group"
               >
                  {isSubmitting ? "Encerrando..." : "Confirmar Encerramento e Gerar Relatório"}
                  {!isSubmitting && <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />}
               </button>
            </div>
         </form>
      </section>

    </main>
  );
}
