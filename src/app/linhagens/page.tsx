"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Leaf, 
  TrendingUp, 
  ShieldCheck, 
  History,
  Activity,
  FileSpreadsheet,
  ArrowLeft,
  Loader2,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getBreeds, createBreed, deleteBreed, type Breed } from "@/app/actions/linhagens";

const linhagemSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  fornecedor: z.string().min(3, "Fornecedor deve ter no mínimo 3 caracteres"),
  metaGmd: z.string().min(1, "Campo obrigatório").refine((val) => !isNaN(Number(val.replace(",","."))), { message: "Deve ser um número" }),
  metaCa: z.string().min(1, "Campo obrigatório").refine((val) => !isNaN(Number(val.replace(",","."))), { message: "Deve ser um número" }),
  padrao: z.boolean()
});

type LinhagemFormValues = z.infer<typeof linhagemSchema>;

// Chart data generated from DB (or mock if none)
const mockChartData = [
  { name: 'Sem 1', gmd: 20 },
  { name: 'Sem 2', gmd: 35 },
  { name: 'Sem 3', gmd: 55 },
  { name: 'Sem 4', gmd: 75 },
  { name: 'Sem 5', gmd: 95 },
];

export default function W46LinhagensPage() {
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isPadrao, setIsPadrao] = useState(false);

  const form = useForm<LinhagemFormValues>({
    resolver: zodResolver(linhagemSchema),
    defaultValues: {
      nome: "",
      fornecedor: "",
      metaGmd: "",
      metaCa: "",
      padrao: false
    }
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getBreeds();
    if (result.data) {
      setBreeds(result.data);
    } else {
      toast.error(result.error || "Erro ao carregar linhagens");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onSubmit = async (data: LinhagemFormValues) => {
    setSubmitting(true);
    const formData = new FormData();
    formData.append("nome", data.nome);
    formData.append("fornecedor", data.fornecedor);
    formData.append("metaGmd", data.metaGmd);
    formData.append("metaCa", data.metaCa);
    formData.append("padrao", data.padrao.toString());

    const result = await createBreed(formData);
    
    if (result.success) {
      toast.success("Linhagem salva com sucesso!", {
        description: `${data.nome} adicionado ao sistema.`
      });
      form.reset();
      setIsPadrao(false);
      fetchData(); // reload
    } else {
      toast.error("Erro ao salvar", { description: result.error });
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir a linhagem ${name}?`)) return;
    
    const loadingId = toast.loading("Excluindo...");
    const result = await deleteBreed(id);
    if (result.success) {
      toast.success("Excluído com sucesso", { id: loadingId });
      fetchData();
    } else {
      toast.error(result.error || "Erro ao excluir", { id: loadingId });
    }
  }

  // KPIs
  const avgGmd = breeds.length > 0 
    ? (breeds.reduce((sum, b) => sum + b.targetGmd, 0) / breeds.length).toFixed(1) 
    : "0.0";
  const avgCa = breeds.length > 0 
    ? (breeds.reduce((sum, b) => sum + b.targetCa, 0) / breeds.length).toFixed(2) 
    : "0.00";

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full max-w-[1400px] mx-auto pb-24">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
         <div>
            <Link href="/configuracoes" className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm mb-4 group">
               <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
               Voltar para Configurações
            </Link>
            <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
               Linhagens Cadastradas
            </h1>
            <p className="text-sm font-medium text-outline mt-2 max-w-2xl leading-relaxed">
               Gerencie as variedades genéticas e seus respectivos padrões zootécnicos de referência para crescimento e conversão alimentar.
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* ESQUERDA: LISTAGEM E GRÁFICO */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          
          {/* Header da Listagem */}
          <div className="flex items-center justify-between mb-2 mt-2">
             <h2 className="text-sm font-extrabold text-[#1A5E35] uppercase tracking-wider">Ativos no Sistema</h2>
             <span className="px-3 py-1 bg-[#e8f5e9] text-[#2e7d32] text-[10px] font-bold rounded-full border border-[#c8e6c9]">
                {loading ? "..." : `${breeds.length} LINHAGENS`}
             </span>
          </div>

          {/* Lista de Linhagens */}
          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#1A5E35] animate-spin mb-4" />
                <p className="text-sm font-bold text-outline">Carregando linhagens...</p>
              </div>
            ) : breeds.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center bg-white rounded-2xl border border-outline-variant/30 text-center px-4">
                <AlertTriangle className="w-10 h-10 text-[#833C46]/50 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-[#0D2E1A] mb-1">Nenhuma linhagem cadastrada</h3>
                <p className="text-xs text-outline font-medium">Use o formulário ao lado para adicionar o primeiro padrão genético.</p>
              </div>
            ) : (
              breeds.map((item) => (
               <div key={item.id} className="bg-white rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex items-start gap-5 hover:border-[#1A5E35]/30 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0 border border-outline-variant/50">
                     <Leaf className="w-6 h-6 text-[#1A5E35]" />
                  </div>
                  <div className="flex-1">
                     <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-bold text-[#0D2E1A]">{item.name}</h3>
                        {item.isDefault && (
                           <span className="px-2 py-0.5 bg-[#1A5E35] text-white text-[9px] font-black uppercase tracking-wider rounded">PADRÃO</span>
                        )}
                     </div>
                     <p className="text-xs font-medium text-outline mb-3">Fornecedor: {item.supplier}</p>
                     <div className="flex items-center gap-4 text-[11px] font-bold text-outline">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low rounded border border-outline-variant/30">
                           <TrendingUp className="w-3.5 h-3.5 text-[#1A5E35]" /> GMD: {item.targetGmd}g
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low rounded border border-outline-variant/30">
                           <Activity className="w-3.5 h-3.5 text-[#1A5E35]" /> CA: {item.targetCa}
                        </div>
                     </div>
                  </div>
                  <div className="flex flex-col gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                     <button 
                       onClick={() => handleDelete(item.id, item.name)}
                       className="text-outline hover:text-[#c62828] p-1 bg-surface-container-low rounded hover:bg-[#ffebee] transition-colors"
                     >
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
               </div>
              ))
            )}
          </div>

          {/* Gráfico Comparativo */}
          <div className="bg-[#1A5E35] rounded-2xl p-6 md:p-8 mt-2 shadow-md relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
             
             <div className="relative z-10 mb-6 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-manrope font-extrabold text-white">Curva de Referência (GMD)</h3>
                  <p className="text-white/80 text-xs font-medium mt-1 max-w-sm">
                    Curva padrão de amostragem para comparação com lotes reais.
                  </p>
                </div>
             </div>

             <div className="h-48 w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={mockChartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0D2E1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#a5d6a7', fontWeight: 'bold' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="gmd" 
                        stroke="#ffffff" 
                        strokeWidth={4} 
                        dot={{ r: 5, fill: "#1A5E35", stroke: "#ffffff", strokeWidth: 2 }} 
                        activeDot={{ r: 8, fill: "#a5d6a7", stroke: "#ffffff" }} 
                      />
                   </LineChart>
                </ResponsiveContainer>
             </div>
          </div>

        </div>

        {/* DIREITA: CADASTRO E IMPORT */}
        <div className="col-span-1 flex flex-col gap-6">
          
          {/* Formulário Cadastro Rápido */}
          <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm relative overflow-hidden">
             
             {submitting && (
               <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#1A5E35] animate-spin" />
               </div>
             )}

             <h2 className="text-sm font-extrabold text-[#0D2E1A] tracking-wider uppercase mb-6 flex items-center gap-2">
               <Plus className="w-4 h-4 text-[#1A5E35]" /> Cadastro Rápido
              </h2>
             
             <form id="linhagem-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-extrabold text-outline uppercase tracking-wider">Nome da Linhagem</label>
                   <input 
                      {...form.register("nome")}
                      placeholder="Ex: Cobb 500 Vantress"
                      className="w-full bg-white border border-outline-variant/50 focus:border-[#1A5E35] px-4 py-2.5 rounded-lg text-sm font-bold text-[#0D2E1A] focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 transition-all placeholder:font-medium placeholder:text-outline/50"
                   />
                   {form.formState.errors.nome && <p className="text-[10px] text-[#c62828] mt-1">{form.formState.errors.nome.message}</p>}
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-extrabold text-outline uppercase tracking-wider">Fornecedor / Origem</label>
                   <input 
                      {...form.register("fornecedor")}
                      placeholder="Genética Global Ltda"
                      className="w-full bg-white border border-outline-variant/50 focus:border-[#1A5E35] px-4 py-2.5 rounded-lg text-sm font-bold text-[#0D2E1A] focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 transition-all placeholder:font-medium placeholder:text-outline/50"
                   />
                   {form.formState.errors.fornecedor && <p className="text-[10px] text-[#c62828] mt-1">{form.formState.errors.fornecedor.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-outline uppercase tracking-wider">Meta GMD (g)</label>
                      <input 
                         {...form.register("metaGmd")}
                         placeholder="65.0"
                         className="w-full bg-white border border-outline-variant/50 focus:border-[#1A5E35] px-4 py-2.5 rounded-lg text-sm font-bold text-[#0D2E1A] focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 transition-all placeholder:font-medium text-center"
                      />
                      {form.formState.errors.metaGmd && <p className="text-[10px] text-[#c62828] mt-1">{form.formState.errors.metaGmd.message}</p>}
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-outline uppercase tracking-wider">Meta CA</label>
                      <input 
                         {...form.register("metaCa")}
                         placeholder="1.60"
                         className="w-full bg-white border border-outline-variant/50 focus:border-[#1A5E35] px-4 py-2.5 rounded-lg text-sm font-bold text-[#0D2E1A] focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 transition-all placeholder:font-medium text-center"
                      />
                      {form.formState.errors.metaCa && <p className="text-[10px] text-[#c62828] mt-1">{form.formState.errors.metaCa.message}</p>}
                   </div>
                </div>

                <div className="flex items-center gap-3 py-2">
                   <button 
                     type="button"
                     onClick={() => {
                        setIsPadrao(!isPadrao);
                        form.setValue("padrao", !isPadrao);
                     }}
                     className={`w-10 h-5 flex items-center rounded-full transition-colors px-1 ${isPadrao ? 'bg-[#1A5E35]' : 'bg-outline-variant/30'}`}
                   >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform ${isPadrao ? 'translate-x-4.5' : 'translate-x-0'}`}></div>
                   </button>
                   <span className="text-xs font-bold text-outline cursor-pointer" onClick={() => { setIsPadrao(!isPadrao); form.setValue("padrao", !isPadrao) }}>
                     Definir como Padrão
                   </span>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full py-3.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white font-extrabold text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center disabled:opacity-70 disabled:active:scale-100"
                >
                   {submitting ? "Salvando..." : "Salvar Linhagem"}
                </button>
             </form>
          </div>

          {/* Import Manual */}
          <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm opacity-60">
             <div className="w-10 h-10 bg-[#ffebee] rounded-xl flex items-center justify-center mb-4 border border-[#ffcdd2]">
                <FileSpreadsheet className="w-5 h-5 text-[#c62828]" />
                <span className="absolute text-[8px] font-black text-[#c62828] -mt-6 ml-10 bg-[#ffebee] px-1 rounded uppercase">XLS/CSV</span>
             </div>
             
             <h3 className="text-sm font-bold text-[#0D2E1A] mb-2">Importação em Massa</h3>
             <p className="text-xs font-medium text-outline mb-5 leading-relaxed">
                Importe as tabelas oficiais do manual em formato padrão CSV. (Em breve)
             </p>
             <button disabled className="text-xs font-bold text-[#1A5E35]/50 flex items-center gap-1 transition-colors uppercase tracking-wider cursor-not-allowed">
                Importar Manual &rarr;
             </button>
          </div>

        </div>

      </div>

      {/* KPI BOTTOM CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-white rounded-2xl p-5 md:p-6 border border-outline-variant/30 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-[#e8f5e9] rounded-full flex items-center justify-center shrink-0 border border-[#c8e6c9]">
               <TrendingUp className="w-4 h-4 text-[#2e7d32]" />
            </div>
            <div>
               <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-outline mb-0.5">Média GMD Base</h4>
               <p className="text-xl font-black text-[#0D2E1A]">{avgGmd}g</p>
            </div>
         </div>

         <div className="bg-white rounded-2xl p-5 md:p-6 border border-outline-variant/30 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-surface-container-low rounded-full flex items-center justify-center shrink-0 border border-outline-variant/50">
               <Activity className="w-4 h-4 text-outline" />
            </div>
            <div>
               <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-outline mb-0.5">Conversão Média Ideal</h4>
               <p className="text-xl font-black text-[#0D2E1A]">{avgCa}</p>
            </div>
         </div>

         <div className="bg-white rounded-2xl p-5 md:p-6 border border-outline-variant/30 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-[#e3f2fd] rounded-full flex items-center justify-center shrink-0 border border-[#bbdefb]">
               <History className="w-4 h-4 text-[#1565c0]" />
            </div>
            <div>
               <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-outline mb-0.5">Última Atualização</h4>
               <p className="text-xl font-black text-[#0D2E1A]">Hoje</p>
            </div>
         </div>

         <div className="bg-white rounded-2xl p-5 md:p-6 border border-outline-variant/30 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-[#e8f5e9] rounded-full flex items-center justify-center shrink-0 border border-[#c8e6c9]">
               <ShieldCheck className="w-4 h-4 text-[#2e7d32]" />
            </div>
            <div>
               <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-outline mb-0.5">Status Paramétrico</h4>
               <p className="text-sm font-black text-[#2e7d32]">Sincronizado</p>
            </div>
         </div>
      </div>

    </main>
  );
}
