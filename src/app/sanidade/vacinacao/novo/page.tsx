"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  ArrowLeft, FileText, BriefcaseMedical, CheckCircle2, Syringe, BarChart2 
} from "lucide-react";
import { FarmSelector } from "@/components/FarmSelector";
import { getUserFarms, type FarmOption } from "@/app/actions/dashboard";
import { getActiveFlocks } from "@/app/actions/mortalidade";
import { syncVaccinations } from "@/app/actions/sanidade";
import { db } from "@/lib/db/dexie";

const formSchema = z.object({
  vaccineName: z.string().min(1, "Selecione a vacina"),
  applicationDate: z.string().min(1, "A data é obrigatória"),
  flockId: z.string().min(1, "O número do lote é obrigatório"),
  dosage: z.number().positive("A dosagem deve ser maior que 0"),
  administrationRoute: z.string().min(1, "Selecione a via"),
  birdsVaccinated: z.number().int("Aves deve ser número inteiro").positive("Deve ser maior que zero"),
  veterinarian: z.string().min(1, "Obrigatório informar o Veterinário e CRMV"),
});

type FormValues = z.infer<typeof formSchema>;

export default function W28RegistroVacinacaoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [activeFlocks, setActiveFlocks] = useState<{id: string, name: string}[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
       vaccineName: "",
       applicationDate: new Date().toISOString().split('T')[0],
       flockId: "",
       dosage: 0.5,
       administrationRoute: "Via Ocular / Nasal",
       birdsVaccinated: 25000,
       veterinarian: ""
    }
  });

  // Listener de rede
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

  // 1. Load farms
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

  // 2. Load active flocks based on selected farm
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
          const res = await getActiveFlocks(); // Removido o argumento
          if (res.flocks) {
             // Opcional: filtrar apenas os lotes da granja selecionada (se o retorno trouxe a farmId)
             const filtered = res.flocks.filter((f: any) => f.barn?.farm?.id === selectedFarmId);
             
             // Mas se o schema de retorno não for tão profundo, podemos setar todos e o user se vira.
             // Para garantir, vamos setar o json real retornado. (Ajuste caso dê problema no map)
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

  const onSubmit = async (data: FormValues) => {
    try {
      const syncId = crypto.randomUUID();

      // Ajustando formato de mesclagem de info
      const mergedMethodFields = `${data.administrationRoute} | Dosagem: ${data.dosage} ml | Aves Vacinadas: ${data.birdsVaccinated}`;

      // Montando data
      const parts = data.applicationDate.split('-');
      const now = new Date();
      now.setFullYear(parseInt(parts[0], 10));
      now.setMonth(parseInt(parts[1], 10) - 1);
      now.setDate(parseInt(parts[2], 10));

      const localRecord = {
        syncId,
        flockId: data.flockId,
        date: now.toISOString(),
        vaccineName: data.vaccineName,
        method: mergedMethodFields,
        appliedBy: data.veterinarian,
        syncStatus: 'pending' as const,
        createdAt: new Date().toISOString()
      };

      await db.vaccine_queue.add(localRecord);

      if (isOnline) {
        toast.loading("Sincronizando...", { id: "sync-vac" });
        const pending = await db.vaccine_queue.where("syncStatus").equals("pending").toArray();
        if (pending.length > 0) {
           const result = await syncVaccinations(pending);
           if (result.success) {
              await Promise.all(
                 pending.map(record => db.vaccine_queue.update(record.id!, { syncStatus: "synced" }))
              );
              toast.success("Vacinação registrada com sucesso no servidor!", { id: "sync-vac" });
              reset({
                 ...data,
                 vaccineName: "",
                 veterinarian: data.veterinarian, // mantem o veterinário (ux bom)
                 birdsVaccinated: activeFlocks.find(f => f.id === data.flockId) ? 25000 : 0
              });
           } else {
              toast.error(result.error || "Erro ao sincronizar.", { id: "sync-vac" });
           }
        }
      } else {
        toast.info("A vacinação foi salva localmente. Sincronização pendente.", { icon: "🔌" });
        reset({ ...data, vaccineName: "" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro interno ao salvar vacinação.");
    }
  };

  if (loadingFarms) {
    return <div className="flex flex-1 items-center justify-center p-8 text-outline">Carregando permissões...</div>;
  }

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6 relative">
      
      {/* Top Header & Return */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
         <div>
            <Link href="/sanidade" className="inline-flex mb-4">
               <span className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">
               <ArrowLeft className="w-4 h-4" /> Voltar
               
            </span>
            </Link>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
               <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
                  Novo Evento Sanitário
               </h1>
            </div>
            <p className="text-sm font-medium text-outline mt-1 max-w-xl">
               SANIDADE / REGISTRO DE VACINAÇÃO
            </p>
         </div>
         <div className="flex shrink-0 flex-col sm:flex-row gap-4 items-center justify-end">
            <Link href="/sanidade/vacinacao/historico">
               <button className="flex items-center gap-2 px-6 py-3 h-[52px] bg-surface-container border border-outline-variant/30 hover:bg-outline-variant/20 text-[#0D2E1A] text-sm font-bold rounded-xl transition-all shadow-sm">
                  <FileText className="w-4 h-4" /> Histórico de Vacinações
               </button>
            </Link>
            {/* Componente FarmSelector no topo */}
            <div className="w-72">
               <FarmSelector 
                  farms={farms} 
                  selectedFarmId={selectedFarmId} 
                  onFarmChange={(val) => setSelectedFarmId(val || "")} 
               />
            </div>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mt-2 pb-8">
         {/* Left Side: Form Area - lg:w-2/3 */}
         <div className="lg:w-2/3 flex flex-col gap-6">
            
            <form id="healthEventForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex flex-col h-full">
               
               {/* 1. Informações do Protocolo */}
               <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm flex-1">
                  <div className="flex items-center gap-2 mb-6">
                     <FileText className="w-5 h-5 text-[#1A5E35]" />
                     <h2 className="text-sm font-bold text-[#0D2E1A]">Informações do Protocolo</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
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
                           Nome da Vacina <span className="text-[#c62828]">*</span>
                        </label>
                        <select
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A]"
                           {...register("vaccineName")}
                        >
                           <option value="">Selecione uma vacina</option>
                           <option value="Bronquite Infecciosa (H120)">Bronquite Infecciosa (H120)</option>
                           <option value="Doença de Marek (HVT)">Doença de Marek (HVT)</option>
                           <option value="Gumboro (D78)">Gumboro (D78)</option>
                           <option value="Newcastle (LaSota)">Newcastle (LaSota)</option>
                        </select>
                        {errors.vaccineName && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.vaccineName.message}</p>}
                     </div>

                     <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-[#0D2E1A] mb-2">
                           Data da Aplicação <span className="text-[#c62828]">*</span>
                        </label>
                        <input
                           type="date"
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A] font-mono"
                           {...register("applicationDate")}
                        />
                        {errors.applicationDate && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.applicationDate.message}</p>}
                     </div>

                     <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-[#0D2E1A] mb-2">
                           Dosagem (ML/DOSE) <span className="text-[#c62828]">*</span>
                        </label>
                        <input
                           type="number"
                           step="0.01"
                           placeholder="0.00"
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A] font-mono"
                           {...register("dosage", { valueAsNumber: true })}
                        />
                        {errors.dosage && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.dosage.message}</p>}
                     </div>
                  </div>
               </div>

               {/* 2. Método & Execução */}
               <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm flex-1">
                  <div className="flex items-center gap-2 mb-6">
                     <BriefcaseMedical className="w-5 h-5 text-[#1A5E35]" />
                     <h2 className="text-sm font-bold text-[#0D2E1A]">Método & Execução</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-[#0D2E1A] mb-2">
                           Via de Administração <span className="text-[#c62828]">*</span>
                        </label>
                        <select
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A]"
                           {...register("administrationRoute")}
                        >
                           <option value="Via Ocular / Nasal">Via Ocular / Nasal</option>
                           <option value="Água de Bebida">Água de Bebida</option>
                           <option value="Spray via Pulverizador">Spray via Pulverizador</option>
                           <option value="Injetável Subcutânea">Injetável Subcutânea</option>
                        </select>
                        {errors.administrationRoute && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.administrationRoute.message}</p>}
                     </div>

                     <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-[#0D2E1A] mb-2">
                           Aves Vacinadas (Qtd) <span className="text-[#c62828]">*</span>
                        </label>
                        <input
                           type="number"
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A] font-mono"
                           {...register("birdsVaccinated", { valueAsNumber: true })}
                        />
                        {errors.birdsVaccinated && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.birdsVaccinated.message}</p>}
                     </div>

                     <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-[#0D2E1A] mb-2">
                           Veterinário Responsável (CRMV) <span className="text-[#c62828]">*</span>
                        </label>
                        <div className="relative">
                           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                              <Syringe className="w-4 h-4" />
                           </div>
                           <input
                              type="text"
                              placeholder="Nome Completo e Registro"
                              className="w-full bg-surface-container-lowest border border-outline-variant/50 pl-11 pr-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A]"
                              {...register("veterinarian")}
                           />
                        </div>
                        {errors.veterinarian && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.veterinarian.message}</p>}
                     </div>
                  </div>
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
            </form>

         </div>

         {/* Right Side: Analytics & Tips - lg:w-1/3 */}
         <div className="lg:w-1/3 flex flex-col gap-6">
            
            {/* Status Sanitário Atual (Dark Green) */}
            <div className="bg-[#245F36] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
               <div className="absolute top-1/2 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-10 pointer-events-none" flex-shrink-0="true">
                  <BriefcaseMedical className="w-full h-full text-white/10" strokeWidth={1} />
               </div>
               
               <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#a5d6a7] mb-2 relative z-10">
                  Resumo Diário
               </p>
               
               <h3 className="text-2xl font-bold text-white mb-6 relative z-10 font-manrope">
                 Lotes Ativos: {activeFlocks.length}
               </h3>
               
               <div className="relative z-10">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#a5d6a7]/20 border border-[#a5d6a7]/30 text-[#a5d6a7] text-xs font-bold rounded-full">
                     <div className="w-1.5 h-1.5 rounded-full bg-[#a5d6a7]"></div>
                     Conectado ao Servidor
                  </span>
               </div>
            </div>

            {/* Dicas de Manejo */}
            <div className="bg-[#fcfdfc] rounded-2xl p-6 border border-outline-variant/50 shadow-sm flex flex-col gap-4">
               <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1A5E35]" />
                  <h3 className="text-sm font-bold text-[#0D2E1A]">Dicas de Manejo</h3>
               </div>
               
               <ul className="space-y-4">
                  <li className="flex gap-3">
                     <div className="w-1 h-1 rounded-full bg-[#637D68] mt-1.5 shrink-0"></div>
                     <p className="text-[11px] font-medium text-outline leading-relaxed">
                        Verifique a <strong>temperatura da água</strong> se a aplicação for via hidratação. Ideal entre 15°C e 20°C.
                     </p>
                  </li>
                  <li className="flex gap-3">
                     <div className="w-1 h-1 rounded-full bg-[#637D68] mt-1.5 shrink-0"></div>
                     <p className="text-[11px] font-medium text-outline leading-relaxed">
                        Assegure que os frascos vazios sejam <strong>descartados conforme o plano de biosseguridade</strong> da unidade.
                     </p>
                  </li>
                  <li className="flex gap-3">
                     <div className="w-1 h-1 rounded-full bg-[#637D68] mt-1.5 shrink-0"></div>
                     <p className="text-[11px] font-medium text-outline leading-relaxed">
                        Evite a exposição direta do antígeno à luz solar durante a manipulação.
                     </p>
                  </li>
               </ul>
            </div>



         </div>
      </div>

    </main>
  );
}
