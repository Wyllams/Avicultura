"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  ArrowLeft,
  ClipboardCheck,
  ShieldAlert,
  Droplets,
  Bird,
  Ban,
  Bug,
  Trash2,
  FileSearch,
  Truck,
  History,
  CheckCircle,
  XCircle,
  Download
} from "lucide-react";
import { getFarms } from "@/app/actions/farm";
import { registerPnsaAudit, getPnsaAudits } from "@/app/actions/sanidade";
import { generatePnsaPdf } from "@/lib/pdf/pnsaPdf";

// Itens de auditoria mapeados pela IN 56/2007 MAPA
const AUDIT_ITEMS = [
  { id: "waterQuality", label: "Limpeza e Cloração de Água", icon: Droplets, desc: "Atesta a potabilidade e limpeza dos bebedouros." },
  { id: "birdNets", label: "Telas Antipássaros (Malha ≤ 1\")", icon: Bird, desc: "Isolamento físico contra aves de vida livre." },
  { id: "sanitaryBarrier", label: "Barreira Sanitária e Vestiários", icon: Ban, desc: "Fluxo obrigatório de banho e troca de roupas." },
  { id: "pestControl", label: "Controle de Pragas e Roedores", icon: Bug, desc: "Iscas ativas e mapeamento perimetral preventivo." },
  { id: "compostBin", label: "Composteira (Destinação)", icon: Trash2, desc: "Tratamento adequado de carcaças e dejetos." },
  { id: "traceability", label: "Rastreabilidade (GTAs de Origem)", icon: FileSearch, desc: "Nota fiscal e GTA arquivados e validados no sistema." },
  { id: "vehicleRegistry", label: "Registro de Visitas e Veículos", icon: Truck, desc: "Funcionamento do Arco de Desinfecção/Rodolúvio." }
];

// Schema Zod dinâmico
const schemaObj: Record<string, z.ZodTypeAny> = {
  farmId: z.string().min(1, "Selecione uma granja"),
  visitDate: z.string().min(1, "A data da auditoria é obrigatória"),
  auditor: z.string().min(1, "Obrigatório informar o Auditor/RT"),
  notes: z.string().optional(),
};

AUDIT_ITEMS.forEach(item => {
  schemaObj[item.id] = z.string().min(1, "Obrigatório").refine(val => val === "CONFORME" || val === "NAO_CONFORME", {
    message: "Obrigatório"
  });
});

const formSchema = z.object(schemaObj);
type FormValues = z.infer<typeof formSchema>;

interface FarmOption {
  id: string;
  name: string;
}

interface AuditRecord {
  id: string;
  visitDate: string;
  auditor: string;
  complianceScore: number;
  notes?: string | null;
  waterQuality: string;
  birdNets: string;
  sanitaryBarrier: string;
  pestControl: string;
  compostBin: string;
  traceability: string;
  vehicleRegistry: string;
  nonConformReasons?: Record<string, string> | null;
  farm: { id: string; name: string };
}

export default function W32ProtocoloSanitarioPage() {
  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
       visitDate: new Date().toISOString().split('T')[0],
       auditor: "",
       farmId: "",
       notes: "",
    }
  });

  const [complianceScore, setComplianceScore] = useState(0);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [pastAudits, setPastAudits] = useState<AuditRecord[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const watchAllFields = watch();

  // Carregar granjas e histórico
  useEffect(() => {
    async function loadData() {
      try {
        const [farmsData, auditsResult] = await Promise.all([
          getFarms(),
          getPnsaAudits()
        ]);
        setFarms(farmsData.map((f: any) => ({ id: f.id, name: f.name })));
        if (auditsResult && 'audits' in auditsResult && auditsResult.audits) {
          const mapped = (auditsResult.audits as any[]).map((a: any) => ({
            ...a,
            farm: Array.isArray(a.farm) ? a.farm[0] : a.farm,
          }));
          setPastAudits(mapped as AuditRecord[]);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        toast.error("Erro ao carregar granjas.");
      } finally {
        setLoadingFarms(false);
      }
    }
    loadData();
  }, []);

  // Calcular score de conformidade em tempo real
  useEffect(() => {
    let score = 0;
    let answered = 0;
    
    AUDIT_ITEMS.forEach(item => {
      const val = watchAllFields[item.id as keyof FormValues];
      if (val) {
         answered++;
         if (val === "CONFORME") score++;
      }
    });

    const percentage = answered === 0 ? 0 : Math.round((score / AUDIT_ITEMS.length) * 100);
    setComplianceScore(percentage);
  }, [watchAllFields]);

  const onSubmit = async (data: FormValues) => {
    try {
      // Filtrar apenas os motivos que realmente são NÃO CONFORME
      const activeReasons: Record<string, string> = {};
      AUDIT_ITEMS.forEach(item => {
        if (data[item.id as keyof FormValues] === "NAO_CONFORME" && reasons[item.id]) {
          activeReasons[item.id] = reasons[item.id];
        }
      });

      const result = await registerPnsaAudit({
        farmId: data.farmId as string,
        visitDate: data.visitDate as string,
        auditor: data.auditor as string,
        waterQuality: data.waterQuality as string,
        birdNets: data.birdNets as string,
        sanitaryBarrier: data.sanitaryBarrier as string,
        pestControl: data.pestControl as string,
        compostBin: data.compostBin as string,
        traceability: data.traceability as string,
        vehicleRegistry: data.vehicleRegistry as string,
        complianceScore,
        notes: (data.notes as string) || undefined,
        nonConformReasons: activeReasons,
      });

      if (result.error) {
        toast.error("Erro ao salvar auditoria.", { description: result.error });
        return;
      }

      if (complianceScore < 100) {
         toast.warning("Auditoria finalizada com pendências.", {
            description: `Score de Conformidade: ${complianceScore}%`,
         });
      } else {
         toast.success("Granja 100% Conforme!", {
            description: `Auditoria PNSA registrada com sucesso.`,
         });
      }
      
      // Recarregar histórico
      const auditsResult = await getPnsaAudits();
      if (auditsResult && 'audits' in auditsResult && auditsResult.audits) {
        const mapped = (auditsResult.audits as any[]).map((a: any) => ({
          ...a,
          farm: Array.isArray(a.farm) ? a.farm[0] : a.farm,
        }));
        setPastAudits(mapped as AuditRecord[]);
      }

      // Resetar formulário
      reset({
        visitDate: new Date().toISOString().split('T')[0],
        auditor: "",
        farmId: "",
        notes: "",
      });
      setReasons({});

    } catch {
      toast.error("Erro inesperado ao registrar a auditoria.");
    }
  };

  const onError = (formErrors: any) => {
    // Verificar quais campos do checklist faltam
    const missingItems = AUDIT_ITEMS.filter(item => formErrors[item.id]);
    
    if (missingItems.length > 0) {
      toast.error(`Preencha todos os itens do checklist.`, {
        description: `${missingItems.length} item(ns) sem resposta: ${missingItems.map((item, i) => `${i + 1}. ${item.label}`).join(", ")}`,
        duration: 6000,
      });
    } else if (formErrors.farmId) {
      toast.error("Selecione uma granja antes de salvar.");
    } else if (formErrors.auditor) {
      toast.error("Informe o nome do Auditor / RT.");
    } else {
      toast.error("Preencha todos os campos obrigatórios.");
    }
  };

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6 relative">
      
      <form id="pnsaAuditForm" onSubmit={handleSubmit(onSubmit, onError)} className="flex flex-col gap-6">

         {/* Top Header & Return */}
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
            <div>
               <Link href="/sanidade" className="inline-flex mb-4">
                  <span className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">
               <ArrowLeft className="w-4 h-4" /> Voltar
                  
            </span>
               </Link>
               
               <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4 text-[#833C46]" />
                  <span className="text-[10px] font-bold text-[#833C46] uppercase tracking-wider">Módulo de Auditoria</span>
               </div>
               <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
                  Auto-Auditoria PNSA
               </h1>
               <p className="text-sm font-medium text-outline mt-1 max-w-xl leading-relaxed">
                  Avaliação completa baseada na IN 56/2007 do MAPA. Atualize estes indicadores periodicamente para nutrir o seu Dossiê Sanitário.
               </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
               <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 border border-[#0D2E1A] bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-xl transition-all shadow-md disabled:bg-[#0D2E1A]/50"
               >
                  <ClipboardCheck className="w-4 h-4" /> {isSubmitting ? "Salvando..." : "Salvar Auditoria"}
               </button>
            </div>
         </div>

         <div className="flex flex-col lg:flex-row gap-6 mt-2 pb-8 items-start">
            
            {/* Left Side: Form Area - lg:w-2/3 */}
            <div className="lg:w-2/3 flex flex-col gap-6 w-full">
               
               {/* Metadata Section */}
               <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
                  <h2 className="text-sm font-bold text-[#0D2E1A] mb-6 flex items-center gap-2">
                     <ClipboardCheck className="w-5 h-5 text-[#1A5E35]" /> Detalhes da Auditoria
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Granja */}
                     <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-[#0D2E1A] mb-2">
                           Granja
                        </label>
                        <select
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A]"
                           {...register("farmId")}
                           disabled={loadingFarms}
                        >
                           <option value="">{loadingFarms ? "Carregando..." : "Selecione a granja"}</option>
                           {farms.map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                           ))}
                        </select>
                        {errors.farmId && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.farmId?.message as string}</p>}
                     </div>

                     {/* Data */}
                     <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-[#0D2E1A] mb-2">
                           Data Referência
                        </label>
                        <input
                           type="date"
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A] font-mono"
                           {...register("visitDate")}
                        />
                        {errors.visitDate && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.visitDate?.message as string}</p>}
                     </div>

                     {/* Auditor */}
                     <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-[#0D2E1A] mb-2">
                           Auditor / Responsável Técnico
                        </label>
                        <input
                           type="text"
                           placeholder="Ex: Dr. Ricardo Silva (CRMV-4588)"
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A]"
                           {...register("auditor")}
                        />
                        {errors.auditor && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.auditor?.message as string}</p>}
                     </div>
                  </div>
               </div>

               {/* Checklist PNSA */}
               <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm flex flex-col gap-4">
                  <h2 className="text-sm font-bold text-[#0D2E1A] mb-2 flex items-center gap-2">
                     <ShieldAlert className="w-5 h-5 text-[#1A5E35]" /> Itens de Verificação Estrutural PNSA
                  </h2>
                  
                  {AUDIT_ITEMS.map((item, index) => {
                     const Icon = item.icon;
                     const err = errors[item.id as keyof FormValues];

                     const currentVal = watchAllFields[item.id as keyof FormValues];
                     const isNaoConforme = currentVal === "NAO_CONFORME";

                     return (
                        <div key={item.id} className={`flex flex-col p-4 bg-surface-container-lowest border rounded-xl gap-3 transition-all ${
                           isNaoConforme ? "border-[#833C46]/40 bg-red-50/30" : "border-outline-variant/30 hover:border-outline-variant/60"
                        }`}>
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex gap-4 items-start">
                                 <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                    isNaoConforme ? "bg-red-50 border-[#833C46]/20" : "bg-surface-container border-outline-variant/20"
                                 }`}>
                                    <Icon className={`w-5 h-5 ${isNaoConforme ? "text-[#833C46]" : "text-[#637D68]"}`} />
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-[#0D2E1A]">{index + 1}. {item.label}</p>
                                    <p className="text-[11px] font-medium text-outline mt-0.5">{item.desc}</p>
                                    {err && <p className="text-[#c62828] text-xs font-bold mt-1 sm:hidden">{err.message as string}</p>}
                                 </div>
                              </div>

                              {/* Radio Switches */}
                              <Controller
                                 name={item.id as keyof FormValues}
                                 control={control}
                                 render={({ field }) => (
                                    <div className="flex items-center gap-2 bg-surface-container p-1 rounded-lg shrink-0">
                                       <button
                                          type="button"
                                          onClick={() => {
                                             field.onChange("CONFORME");
                                             // Limpar motivo se voltar pra conforme
                                             setReasons(prev => { const n = {...prev}; delete n[item.id]; return n; });
                                          }}
                                          className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                                             field.value === "CONFORME" 
                                                ? "bg-[#1A5E35] text-white shadow-sm" 
                                                : "text-outline hover:bg-white hover:text-[#0D2E1A]"
                                          }`}
                                       >
                                          CONFORME
                                       </button>
                                       <button
                                          type="button"
                                          onClick={() => field.onChange("NAO_CONFORME")}
                                          className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                                             field.value === "NAO_CONFORME" 
                                                ? "bg-[#833C46] text-white shadow-sm" 
                                                : "text-outline hover:bg-white hover:text-[#0D2E1A]"
                                          }`}
                                       >
                                          NÃO CONFORME
                                       </button>
                                    </div>
                                 )}
                              />
                           </div>

                           {/* Campo de Motivo (aparece só quando NÃO CONFORME) */}
                           {isNaoConforme && (
                              <div className="animate-in slide-in-from-top-2 duration-300 mt-1">
                                 <label className="block text-[10px] uppercase tracking-wider font-bold text-[#833C46] mb-1.5">
                                    Motivo da Não Conformidade
                                 </label>
                                 <textarea
                                    placeholder="Descreva o motivo da não conformidade, as condições observadas e as ações corretivas recomendadas..."
                                    value={reasons[item.id] || ""}
                                    onChange={(e) => setReasons(prev => ({ ...prev, [item.id]: e.target.value }))}
                                    className="w-full bg-white border border-[#833C46]/30 px-4 py-3 text-sm font-medium rounded-xl focus:outline-none focus:border-[#833C46] transition-all text-[#0D2E1A] min-h-[80px] resize-y placeholder:text-outline/50"
                                 />
                              </div>
                           )}
                        </div>
                     );
                  })}
               </div>

               {/* Nota Técnica */}
               <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
                  <h2 className="text-sm font-bold text-[#0D2E1A] mb-4 flex items-center gap-2">
                     <FileSearch className="w-5 h-5 text-[#1A5E35]" /> Observações / Nota Técnica
                  </h2>
                  <textarea
                     placeholder="Descreva observações adicionais, recomendações de adequação ou prazos de correção para os itens não conformes..."
                     className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-medium rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A] min-h-[120px] resize-y"
                     {...register("notes")}
                  />
               </div>

            </div>

            {/* Right Side: Scoreboard - lg:w-1/3 (Sticky) */}
            <div className="lg:w-1/3 w-full sticky top-8 flex flex-col gap-6">
               
               {/* Histórico de Auditorias */}
               <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-2 mb-2">
                     <History className="w-4 h-4 text-[#1A5E35]" />
                     <h3 className="text-sm font-bold text-[#0D2E1A]">Últimas Auditorias</h3>
                  </div>
                  
                  {pastAudits.length === 0 ? (
                     <p className="text-xs font-medium text-outline text-center py-4">Nenhuma auditoria registrada ainda.</p>
                  ) : (
                     <div className="flex flex-col gap-3">
                        {pastAudits.slice(0, 5).map(audit => (
                           <div key={audit.id} className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
                              <div className="flex items-center gap-3">
                                 {audit.complianceScore === 100 ? (
                                    <CheckCircle className="w-5 h-5 text-[#1A5E35] shrink-0" />
                                 ) : (
                                    <XCircle className="w-5 h-5 text-[#833C46] shrink-0" />
                                 )}
                                 <div>
                                    <p className="text-xs font-bold text-[#0D2E1A] truncate max-w-[120px]">{audit.farm?.name || "Granja"}</p>
                                    <p className="text-[10px] text-outline font-medium">
                                       {new Date(audit.visitDate).toLocaleDateString('pt-BR')} · {audit.auditor}
                                    </p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <span className={`text-xs font-extrabold ${audit.complianceScore === 100 ? 'text-[#1A5E35]' : audit.complianceScore >= 70 ? 'text-[#f59e0b]' : 'text-[#833C46]'}`}>
                                    {audit.complianceScore}%
                                 </span>
                                 <button
                                    type="button"
                                    onClick={() => generatePnsaPdf(audit)}
                                    className="p-1.5 bg-[#1A5E35] hover:bg-[#0D2E1A] text-white rounded-lg transition-colors shadow-sm"
                                    title="Baixar PDF"
                                 >
                                    <Download className="w-3.5 h-3.5" />
                                 </button>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>

               {/* Realtime Score */}
               <div className="bg-[#0D2E1A] rounded-2xl p-8 border border-[#1A5E35] shadow-lg flex flex-col items-center justify-center text-center relative overflow-hidden">
                  
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#1A5E35]/20 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl pointer-events-none"></div>

                  <h3 className="text-xs font-extrabold text-[#a5d6a7] uppercase tracking-wider mb-8 relative z-10">Índice PNSA (Amostral)</h3>
                  
                  <div className="relative w-40 h-40 flex items-center justify-center z-10 mb-6">
                     <svg className="w-full h-full transform -rotate-90">
                        <circle cx="80" cy="80" r="70" fill="transparent" stroke="#1A5E35" strokeWidth="12" className="opacity-30" />
                        <circle 
                           cx="80" cy="80" r="70" fill="transparent" 
                           stroke={complianceScore === 100 ? "#4caf50" : complianceScore >= 70 ? "#ffb300" : "#ef5350"} 
                           strokeWidth="12" 
                           strokeDasharray={439.8} 
                           strokeDashoffset={439.8 - (439.8 * complianceScore) / 100}
                           strokeLinecap="round"
                           className="transition-all duration-1000 ease-out"
                        />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-manrope font-extrabold text-white">{complianceScore}%</span>
                     </div>
                  </div>

                  <p className="text-sm font-medium text-white/80 leading-relaxed relative z-10 max-w-[250px]">
                     {complianceScore === 100 
                        ? "Excelente! A granja atende a todos os requisitos higiênico-sanitários da instrução normativa MAPA." 
                        : complianceScore >= 50 
                           ? "Atenção necessária. Existem inconformidades estruturais que devem ser priorizadas."
                           : "Risco Alto. Os parâmetros fundamentais de biosseguridade estão comprometidos."}
                  </p>
               </div>

               {/* Nota Técnica Legal */}
               <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-2 mb-2">
                     <ShieldAlert className="w-4 h-4 text-[#833C46]" />
                     <h3 className="text-sm font-bold text-[#0D2E1A]">Nota Técnica</h3>
                  </div>
                  <p className="text-xs font-medium text-outline leading-relaxed">
                     Esta auto-auditoria apenas constrói inteligência de dados interna. O certificado de validade legal da PNSA ainda exige uma inspeção <em>in-loco</em> do médico veterinário oficial do estado se solicitado pelo fiscal agrícola estadual.
                  </p>
               </div>

            </div>
         </div>
      </form>
    </main>
  );
}
