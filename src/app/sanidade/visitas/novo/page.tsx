"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  ArrowLeft, FileText, Eye, BriefcaseMedical, History, ShieldCheck,
  CheckCircle2, AlertTriangle, CalendarDays, Camera, FileDown, Share2
} from "lucide-react";
import { FarmSelector } from "@/components/FarmSelector";
import { getUserFarms, type FarmOption } from "@/app/actions/dashboard";
import { getActiveFlocks } from "@/app/actions/mortalidade";
import { db } from "@/lib/db/dexie";

const formSchema = z.object({
  flockId: z.string().min(1, "O lote é obrigatório"),
  visitDate: z.string().min(1, "A data da visita é obrigatória"),
  veterinarian: z.string().min(1, "Obrigatório informar o Veterinário Responsável"),
  clinicalObservations: z.string().min(10, "Detalhe melhor as observações clínicas (min 10 caracteres)"),
  prescriptions: z.string().min(1, "Forneça as recomendações ou 'Sem alterações'"),
  nextVisitDate: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export default function W30RegistroVisitaTecnicaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [activeFlocks, setActiveFlocks] = useState<{id: string, name: string}[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
       flockId: "",
       visitDate: new Date().toISOString().split('T')[0],
       veterinarian: "Dr. Ricardo Silva (CRMV-4588)",
       clinicalObservations: "",
       prescriptions: "",
       nextVisitDate: ""
    }
  });

  const selectedFlockId = watch("flockId");
  const visitDate = watch("visitDate");

  useEffect(() => {
    if (visitDate) {
      // Adding 15 days automatically based on visitDate
      const d = new Date(visitDate);
      // d.getTime() could be empty if somehow invalid
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 16); // adjust timezone issue if any, +15 or +16. For isolated date strings, better split and build local.
        const parts = visitDate.split('-');
        const localDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        localDate.setDate(localDate.getDate() + 15);
        setValue("nextVisitDate", localDate.toISOString().split('T')[0]);
      }
    }
  }, [visitDate, setValue]);

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
    async function init() {
      const result = await getUserFarms();
      if (result.farms && result.farms.length > 0) {
        setFarms(result.farms);
        const paramFarmId = searchParams.get("farmId");
        const storedFarmId = localStorage.getItem("selectedFarmId");
        const farmIds = result.farms.map((f: FarmOption) => f.id);
        
        let initialFarmId = result.farms[0].id;
        if (paramFarmId && farmIds.includes(paramFarmId)) {
          initialFarmId = paramFarmId;
        } else if (storedFarmId && farmIds.includes(storedFarmId)) {
          initialFarmId = storedFarmId;
        }
        setSelectedFarmId(initialFarmId);
      }
      setLoadingFarms(false);
    }
    init();
  }, [searchParams]);

  useEffect(() => {
    async function loadFlocks() {
      if (!selectedFarmId) return;

      localStorage.setItem("selectedFarmId", selectedFarmId);
      const params = new URLSearchParams(searchParams.toString());
      if (params.get("farmId") !== selectedFarmId) {
        params.set("farmId", selectedFarmId);
        router.replace(`?${params.toString()}`);
      }

      if (isOnline) {
        try {
          const res = await getActiveFlocks();
          if (res.flocks) {
             const filtered = res.flocks.filter((f: any) => f.barn?.farm?.id === selectedFarmId);
             setActiveFlocks(filtered.length > 0 ? filtered : res.flocks);
             localStorage.setItem(`active_flocks_${selectedFarmId}`, JSON.stringify(res.flocks));
          } else {
             setActiveFlocks([]);
          }
        } catch (e) {
          console.error("Erro ao puxar lotes", e);
        }
      } else {
        const cached = localStorage.getItem(`active_flocks_${selectedFarmId}`);
        if (cached) {
           setActiveFlocks(JSON.parse(cached));
        } else {
           toast.warning("Você está offline e não possui lotes em cache.");
        }
      }
    }
    loadFlocks();
  }, [selectedFarmId, isOnline, router, searchParams]);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const syncId = crypto.randomUUID();
      const reportContent = `OBSERVAÇÕES CLÍNICAS:\n${data.clinicalObservations}\n\nRECOMENDAÇÕES / PRESCRIÇÕES:\n${data.prescriptions}`;

      let base64File = undefined;
      const file = fileInputRef.current?.files?.[0];
      if (file) {
         base64File = await convertFileToBase64(file);
      }

      const localRecord = {
        syncId,
        flockId: data.flockId,
        date: new Date(data.visitDate).toISOString(),
        veterinarian: data.veterinarian,
        report: reportContent,
        pdfBlob: base64File as any, // Dexie will store the Base64 string
        pdfName: file?.name,
        syncStatus: 'pending' as const,
        createdAt: new Date().toISOString()
      };

      await db.visits_queue.add(localRecord);

      if (isOnline) {
        toast.loading("Sincronizando...", { id: "sync-visit" });
        const { syncVisits } = await import("@/app/actions/sanidade");
        const pending = await db.visits_queue.where("syncStatus").equals("pending").toArray();
        if (pending.length > 0) {
           const result = await syncVisits(pending);
           if (result.success) {
              await Promise.all(
                 pending.map((record: any) => db.visits_queue.update(record.id!, { syncStatus: "synced" }))
              );
              toast.success("Visita Técnica registrada com sucesso no servidor!", { id: "sync-visit" });
              router.push("/sanidade/visitas/historico");
           } else {
              toast.error("Salvo localmente, erro ao enviar.", { id: "sync-visit" });
           }
        }
      } else {
        toast.info("A Visita Técnica foi salva localmente e será enviada quando reconectar.", { icon: "🔌" });
        router.push("/sanidade/visitas/historico");
      }
    } catch {
      toast.error("Erro ao registrar a visita técnica.");
    }
  };

  if (loadingFarms) {
    return <div className="flex flex-1 items-center justify-center p-8 text-outline">Carregando permissões...</div>;
  }

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6 relative">
      <form id="technicalVisitForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex flex-col h-full">

         {/* Top Header & Return */}
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
            <div>
               <Link href="/sanidade" className="inline-flex mb-4">
                  <span className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">
                     <ArrowLeft className="w-4 h-4" /> Voltar
                  </span>
               </Link>
               
               <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-[#1A5E35]" />
                  <span className="text-[10px] font-bold text-[#1A5E35] uppercase tracking-wider">PNSA Compliant</span>
               </div>
               <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
                  Registro de Visita Técnica
               </h1>
               <p className="text-sm font-medium text-outline mt-1 max-w-xl leading-relaxed">
                  Formulário oficial para controle sanitário e acompanhamento de lotes. As informações registradas impactam diretamente no índice de conformidade da granja.
               </p>
            </div>

            <div className="flex shrink-0 flex-col sm:flex-row gap-4 items-center justify-end">
               <Link href="/sanidade/visitas/historico">
                  <button type="button" className="flex items-center gap-2 px-5 py-3 h-[52px] bg-surface-container border border-outline-variant/30 hover:bg-outline-variant/20 text-[#0D2E1A] text-sm font-bold rounded-xl transition-all shadow-sm">
                     <History className="w-4 h-4" /> Histórico
                  </button>
               </Link>
               <div className="w-72">
                  <FarmSelector 
                    farms={farms} 
                    selectedFarmId={selectedFarmId} 
                    onFarmChange={(val: string) => setSelectedFarmId(val || "")} 
                  />
               </div>
            </div>
         </div>

         <div className="flex flex-col lg:flex-row gap-6 mt-2 pb-8">
            
            {/* Left Side: Form Area - lg:w-2/3 */}
            <div className="lg:w-2/3 flex flex-col gap-6">
               
               {/* 1. Informações da Visita */}
               <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                     <FileText className="w-5 h-5 text-[#1A5E35]" />
                     <h2 className="text-sm font-bold text-[#0D2E1A]">Informações da Visita</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-[#0D2E1A] mb-2">
                           Lote (Flock) <span className="text-[#c62828]">*</span>
                        </label>
                        <select
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A]"
                           {...register("flockId")}
                        >
                           <option value="">Selecione o Lote Ativo</option>
                           {activeFlocks.map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                           ))}
                        </select>
                        {errors.flockId && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.flockId.message}</p>}
                     </div>

                     <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-[#0D2E1A] mb-2">
                           Data da Visita <span className="text-[#c62828]">*</span>
                        </label>
                        <input
                           type="date"
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A] font-mono"
                           {...register("visitDate")}
                        />
                        {errors.visitDate && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.visitDate.message}</p>}
                     </div>

                     <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-[#0D2E1A] mb-2">
                           Veterinário Responsável <span className="text-[#c62828]">*</span>
                        </label>
                        <select
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A]"
                           {...register("veterinarian")}
                        >
                           <option value="Dr. Ricardo Silva (CRMV-4588)">Dr. Ricardo Silva (CRMV-4588)</option>
                           <option value="Dra. Ana Paula (CRMV-9122)">Dra. Ana Paula (CRMV-9122)</option>
                           <option value="Dr. Joaquim Mendes (CRMV-1022)">Dr. Joaquim Mendes (CRMV-1022)</option>
                        </select>
                        {errors.veterinarian && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.veterinarian.message}</p>}
                     </div>
                  </div>
               </div>

               {/* 2. Observações Clínicas */}
               <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                     <Eye className="w-5 h-5 text-[#f06292]" />
                     <h2 className="text-sm font-bold text-[#0D2E1A]">Observações Clínicas</h2>
                  </div>

                  <div>
                     <textarea
                        rows={4}
                        placeholder="Descreva o estado clínico das aves, comportamento, sinais de patologias ou anomalias observadas no lote..."
                        className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-4 text-sm font-medium rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A] resize-none leading-relaxed"
                        {...register("clinicalObservations")}
                     ></textarea>
                     {errors.clinicalObservations && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.clinicalObservations.message}</p>}
                  </div>
               </div>

               {/* 3. Recomendações e Prescrições (Solid Green) */}
               <div className="bg-[#1A5E35] rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 relative z-10">
                     <BriefcaseMedical className="w-5 h-5 text-white/90" />
                     <h2 className="text-sm font-bold text-white">Recomendações e Prescrições</h2>
                  </div>

                  <div className="relative z-10">
                     <textarea
                        rows={5}
                        placeholder="Indique tratamentos, ajustes de manejo, medicações ou protocolos sanitários específicos..."
                        className="w-full bg-[#0D2E1A]/40 border border-white/10 px-4 py-4 text-sm font-medium rounded-xl focus:outline-none focus:border-white/30 transition-all text-white placeholder:text-white/40 resize-none leading-relaxed"
                        {...register("prescriptions")}
                     ></textarea>
                     {errors.prescriptions && <p className="text-[#ff8a80] text-xs font-bold mt-1.5">{errors.prescriptions.message}</p>}
                  </div>
                  
                  <div className="mt-4 flex items-start gap-2 relative z-10 text-white/70 bg-[#0D2E1A]/20 p-3 rounded-lg">
                     <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                     <p className="text-xs font-medium leading-relaxed">
                        Lembre-se de anexar a receita digital se houver prescrição de medicamentos controlados.
                     </p>
                  </div>

                  {/* Visual flare */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3 blur-2xl pointer-events-none"></div>
               </div>

               {/* Action Buttons */}
               <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end items-center gap-4">
                  <Link href="/sanidade">
                     <button type="button" className="w-full sm:w-auto px-8 py-3 bg-surface-container border border-outline-variant/30 hover:bg-outline-variant/20 text-[#0D2E1A] text-sm font-bold rounded-xl transition-all shadow-sm">
                        Cancelar Registro
                     </button>
                  </Link>
                  <button
                     type="submit"
                     disabled={isSubmitting || activeFlocks.length === 0}
                     className="w-full sm:w-auto px-8 py-3 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center shadow-md disabled:bg-[#0D2E1A]/50"
                  >
                     {isSubmitting ? "Salvando..." : "Salvar Registro"}
                  </button>
               </div>
            </div>

            {/* Right Side: Sidebar - lg:w-1/3 */}
            <div className="lg:w-1/3 flex flex-col gap-6">
               
               {/* 1. Status PNSA */}
               <div className="bg-white rounded-2xl p-6 border border-[#e8f5e9] shadow-sm flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xs font-extrabold text-[#2e7d32] uppercase tracking-wider">Status PNSA</h3>
                     <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${selectedFlockId ? 'bg-[#2e7d32] text-white' : 'bg-surface-container text-outline'}`}>
                        {selectedFlockId ? 'Ativo' : 'Aguardando Lote'}
                     </span>
                  </div>

                  {selectedFlockId ? (
                     <>
                        <ul className="space-y-4">
                           <li className="flex items-start gap-3">
                              <CheckCircle2 className="w-4 h-4 text-[#2e7d32] shrink-0 mt-0.5" />
                              <div>
                                 <p className="text-sm font-bold text-[#0D2E1A]">Vazio Sanitário</p>
                                 <p className="text-[11px] font-medium text-outline leading-tight">Protocolo de 15 dias respeitado.</p>
                              </div>
                           </li>
                           <li className="flex items-start gap-3">
                              <CheckCircle2 className="w-4 h-4 text-[#2e7d32] shrink-0 mt-0.5" />
                              <div>
                                 <p className="text-sm font-bold text-[#0D2E1A]">Controle de Vetores</p>
                                 <p className="text-[11px] font-medium text-outline leading-tight">Barreiras físicas integras.</p>
                              </div>
                           </li>
                           <li className="flex items-start gap-3 bg-[#ffebee]/50 -mx-2 px-2 py-2 rounded-lg border border-[#ffcdd2]/50">
                              <AlertTriangle className="w-4 h-4 text-[#c62828] shrink-0 mt-0.5" />
                              <div>
                                 <p className="text-sm font-bold text-[#b71c1c]">Registro de Água</p>
                                 <p className="text-[11px] font-medium text-[#c62828] leading-tight">Última análise não carregou.</p>
                              </div>
                           </li>
                        </ul>

                        <div className="pt-4 border-t border-outline-variant/30">
                           <div className="flex justify-between items-end mb-2">
                              <span className="text-[10px] uppercase font-bold text-outline tracking-wider">Índice de Conformidade Simulado</span>
                              <span className="text-lg font-extrabold text-[#0D2E1A]">92%</span>
                           </div>
                           <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                              <div className="h-full bg-[#1A5E35] rounded-full" style={{ width: '92%' }}></div>
                           </div>
                        </div>
                     </>
                  ) : (
                     <div className="flex flex-col items-center justify-center py-6 text-center">
                        <History className="w-8 h-8 text-outline mb-3 opacity-50" />
                        <p className="text-sm font-bold text-outline">Lote não selecionado</p>
                        <p className="text-[11px] font-medium text-outline/70 mt-1 max-w-[200px]">Selecione um lote ativo ao lado para ver o status PNSA correspondente.</p>
                     </div>
                  )}
               </div>

               {/* 2. Próxima Visita (Wine color card) */}
               <div className="bg-[#5c242c] rounded-2xl p-6 shadow-md text-white relative overflow-hidden">
                  <h3 className="text-sm font-bold text-white mb-6 relative z-10">Próxima Visita</h3>
                  
                  <div className="relative z-10 space-y-2">
                     <label className="block text-[10px] uppercase tracking-wider font-bold text-white/70">
                        Agendamento Sugerido
                     </label>
                     <div className="relative">
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
                           <CalendarDays className="w-4 h-4" />
                        </div>
                        <input
                           type="date"
                           className="w-full bg-white/10 border border-white/20 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-white/50 transition-all text-white font-mono"
                           {...register("nextVisitDate")}
                        />
                     </div>
                  </div>

                  <p className="text-[11px] font-medium text-white/60 leading-relaxed mt-4 relative z-10">
                     O sistema sugere visitas a cada 15 dias para este estágio do lote (Crescimento II).
                  </p>
                  
                  {/* Visual flare */}
                  <div className="absolute top-4 right-4 w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                     <div className="w-6 h-6 bg-white/5 rounded-full pointer-events-none"></div>
                  </div>
               </div>

               {/* 3. Ações Rápidas */}
               <div className="bg-white rounded-2xl p-2 border border-outline-variant/30 shadow-sm">
                  <h3 className="text-[10px] font-extrabold text-outline uppercase tracking-wider px-4 pt-3 pb-2">Ações Rápidas</h3>
                  
                  <input 
                     type="file" 
                     className="hidden" 
                     ref={fileInputRef} 
                     accept="image/*"
                     onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                           setSelectedPhoto(file.name);
                           toast.success(`Foto "${file.name}" anexada com sucesso. (Simulado)`);
                        }
                     }}
                  />
                  
                  <button 
                     type="button" 
                     onClick={() => fileInputRef.current?.click()}
                     className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-container-lowest rounded-xl transition-colors group"
                  >
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center group-hover:bg-[#e8f5e9] transition-colors">
                           <Camera className="w-4 h-4 text-[#0D2E1A] group-hover:text-[#1A5E35]" />
                        </div>
                        <div className="flex flex-col items-start">
                           <span className="text-sm font-bold text-[#0D2E1A]">Anexar Fotos</span>
                           {selectedPhoto && <span className="text-[10px] text-[#1A5E35] font-medium leading-none">{selectedPhoto}</span>}
                        </div>
                     </div>
                     <span className="text-outline group-hover:translate-x-1 transition-transform">&rsaquo;</span>
                  </button>

                  <button 
                     type="button" 
                     onClick={() => toast.info("Salve o registro primeiro para gerar o Laudo PDF final e assinado.")}
                     className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-container-lowest rounded-xl transition-colors group"
                  >
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center group-hover:bg-[#e8f5e9] transition-colors">
                           <FileDown className="w-4 h-4 text-[#0D2E1A] group-hover:text-[#1A5E35]" />
                        </div>
                        <span className="text-sm font-bold text-[#0D2E1A]">Gerar Laudo PDF</span>
                     </div>
                     <span className="text-outline group-hover:translate-x-1 transition-transform">&rsaquo;</span>
                  </button>
                  
                  <button 
                     type="button" 
                     onClick={() => toast.info("Salve o registro primeiro para habilitar o compartilhamento seguro.")}
                     className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-container-lowest rounded-xl transition-colors group"
                  >
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center group-hover:bg-[#e8f5e9] transition-colors">
                           <Share2 className="w-4 h-4 text-[#0D2E1A] group-hover:text-[#1A5E35]" />
                        </div>
                        <span className="text-sm font-bold text-[#0D2E1A]">Compartilhar</span>
                     </div>
                     <span className="text-outline group-hover:translate-x-1 transition-transform">&rsaquo;</span>
                  </button>
               </div>

            </div>
         </div>
      </form>
    </main>
  );
}
