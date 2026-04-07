"use client";

import React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  ArrowLeft,
  Info,
  Bell,
  CheckCircle2,
  HelpCircle,
  Save,
  History
} from "lucide-react";

// Schema do formulário
const formSchema = z.object({
  productName: z.string().min(1, "Campo obrigatório").max(100),
  category: z.string().min(1, "Selecione uma categoria"),
  unit: z.string().min(1, "Selecione a unidade"),
  minStock: z.number().nonnegative("Valor inválido"),
});

type FormValues = z.infer<typeof formSchema>;

export default function W27CriarEditarProdutoPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
       productName: "Ração Inicial Frango de Corte",
       category: "Feed (Ração)",
       unit: "kg (Quilogramas)",
       minStock: 500
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      console.log("Dados do Produto (W-27):", data);
      
      toast.success("Produto configurado com sucesso!", {
        description: `O catálogo '${data.productName}' foi atualizado.`,
      });
    } catch {
      toast.error("Ocorreu um erro ao salvar configurações.");
    }
  };

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6 relative">
      
      {/* Top Banner & Return */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
         <div>
            <div className="flex items-center gap-2 mb-4">
               <Link href="/estoque/itens" className="text-xs font-bold text-outline hover:text-[#0D2E1A] flex items-center gap-1 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Produtos
               </Link>
               <span className="text-xs text-outline font-medium">/</span>
               <span className="text-xs font-bold text-[#1A5E35]">Editar</span>
            </div>
            
            <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
               Informações do Insumo
            </h1>
            <p className="text-sm font-medium text-outline mt-1 max-w-xl">
               Configure as especificações e alertas de segurança do produto.
            </p>
         </div>

         {/* Extracted form actions to the header for better UX mirroring the design logic */}
         <div className="flex flex-col-reverse sm:flex-row items-center gap-4">
            <Link href="/estoque/itens">
               <button type="button" className="w-full sm:w-auto px-6 py-2.5 bg-surface-container border border-outline-variant/30 hover:bg-outline-variant/20 text-[#0D2E1A] text-sm font-bold rounded-xl transition-all shadow-sm">
                  Descartar
               </button>
            </Link>
            <button
               onClick={handleSubmit(onSubmit)}
               disabled={isSubmitting}
               className="w-full sm:w-auto px-6 py-2.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md disabled:bg-[#0D2E1A]/50"
            >
               {isSubmitting ? (
                  <>Salvando...</>
               ) : (
                  <>
                     <Save className="w-4 h-4" /> Salvar Alterações
                  </>
               )}
            </button>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mt-2 pb-8">
         {/* Left Side: Form Area - lg:w-[65%] */}
         <div className="lg:w-[65%] flex flex-col gap-6">
            
            <form id="productForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
               
               {/* 1. Dados Gerais */}
               <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                     <Info className="w-5 h-5 text-[#1A5E35]" />
                     <h2 className="text-sm font-bold text-[#0D2E1A]">Dados Gerais</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-[#0D2E1A] mb-2">
                           Nome do Produto
                        </label>
                        <input
                           type="text"
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A]"
                           {...register("productName")}
                        />
                        {errors.productName && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.productName.message}</p>}
                     </div>

                     <div>
                        <label className="block text-[10px] font-bold text-[#0D2E1A] mb-2">
                           Categoria
                        </label>
                        <select
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A]"
                           {...register("category")}
                        >
                           <option value="Feed (Ração)">Feed (Ração)</option>
                           <option value="Vacina">Vacina</option>
                           <option value="Medicamento">Medicamento</option>
                           <option value="Outros">Outros</option>
                        </select>
                        {errors.category && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.category.message}</p>}
                     </div>

                     <div>
                        <label className="block text-[10px] font-bold text-[#0D2E1A] mb-2">
                           Unidade de Medida
                        </label>
                        <select
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A]"
                           {...register("unit")}
                        >
                           <option value="kg (Quilogramas)">kg (Quilogramas)</option>
                           <option value="g (Gramas)">g (Gramas)</option>
                           <option value="Doses">Doses</option>
                           <option value="L (Litros)">L (Litros)</option>
                           <option value="Unidades">Unidades</option>
                        </select>
                        {errors.unit && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.unit.message}</p>}
                     </div>
                  </div>
               </div>

               {/* 2. Regras de Inventário */}
               <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm flex flex-col md:flex-row gap-8">
                  <div className="flex-1">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                           <Bell className="w-5 h-5 text-[#1A5E35]" />
                           <h2 className="text-sm font-bold text-[#0D2E1A]">Regras de Inventário</h2>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#2e7d32] bg-[#e8f5e9] px-2 py-1 rounded-md">Monitoramento Ativo</span>
                     </div>

                     <div>
                        <label className="block text-[10px] font-bold text-[#0D2E1A] mb-2">
                           Nível de Estoque Mínimo
                        </label>
                        <div className="relative max-w-[200px]">
                           <input
                              type="number"
                              className="w-full bg-surface-container-lowest border border-outline-variant/50 pl-4 pr-12 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] transition-all text-[#0D2E1A]"
                              {...register("minStock", { valueAsNumber: true })}
                           />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-outline">kg</span>
                        </div>
                        {errors.minStock && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.minStock.message}</p>}
                     </div>
                  </div>

                  <div className="md:w-[280px] bg-[#e8f5e9] rounded-xl p-4 border border-[#a5d6a7]/50 flex items-start gap-3">
                     <Info className="w-4 h-4 text-[#2e7d32] shrink-0 mt-0.5" />
                     <p className="text-[10px] leading-relaxed font-bold text-[#1A5E35]">
                        <span className="text-[#0D2E1A]">Nota:</span> O sistema enviará um alerta crítico para os gestores quando o estoque atingir este valor. Recomenda-se definir uma margem de segurança de 15%.
                     </p>
                  </div>
               </div>
            </form>

            {/* Histórico Table */}
            <div className="mt-4">
               <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-outline" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-outline">Histórico de Alterações</h3>
               </div>
               <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs bg-white">
                     <thead>
                        <tr className="border-b border-outline-variant/20 bg-surface-container-lowest/50 text-outline">
                           <th className="px-5 py-4 font-bold">Data</th>
                           <th className="px-5 py-4 font-bold">Usuário</th>
                           <th className="px-5 py-4 font-bold">Ação</th>
                           <th className="px-5 py-4 font-bold text-right">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-outline-variant/10 text-[#0D2E1A]">
                        <tr>
                           <td className="px-5 py-4 text-outline font-medium">14/10/2023 - 09:15</td>
                           <td className="px-5 py-4 font-bold text-[#1A5E35]">Ricardo Silva</td>
                           <td className="px-5 py-4 font-medium max-w-[200px] truncate">Ajuste de Estoque Mínimo</td>
                           <td className="px-5 py-4 text-right">
                              <span className="inline-block px-2 py-0.5 rounded-full bg-[#1A5E35]/10 text-[#1A5E35] font-bold text-[9px] uppercase tracking-widest">
                                 CONCLUÍDO
                              </span>
                           </td>
                        </tr>
                        <tr>
                           <td className="px-5 py-4 text-outline font-medium">02/10/2023 - 14:30</td>
                           <td className="px-5 py-4 font-bold text-[#1A5E35]">Ana Clara (Nutrição)</td>
                           <td className="px-5 py-4 font-medium max-w-[200px] truncate">Alteração de Categoria</td>
                           <td className="px-5 py-4 text-right">
                              <span className="inline-block px-2 py-0.5 rounded-full bg-[#1A5E35]/10 text-[#1A5E35] font-bold text-[9px] uppercase tracking-widest">
                                 CONCLUÍDO
                              </span>
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </div>

         </div>

         {/* Right Side: Analytics & Tips - lg:w-[35%] */}
         <div className="lg:w-[35%] flex flex-col gap-6">
            
            {/* Estado Atual Box (Dark Green) */}
            <div className="bg-[#1A5E35] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-12 blur-2xl pointer-events-none" />
               
               <div className="flex items-center gap-2 mb-6 relative z-10">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <h3 className="text-sm font-bold text-white">Estado Atual</h3>
               </div>
               
               <div className="space-y-4 mb-8 relative z-10">
                  <div className="flex justify-between items-center text-sm">
                     <span className="font-bold text-white/70">Saldo em estoque</span>
                     <span className="font-bold text-lg text-white">1.240 <span className="text-[10px] font-normal tracking-wide">kg</span></span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="font-bold text-white/70">Última entrada</span>
                     <span className="font-bold text-sm text-white">12 Out 2023</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="font-bold text-white/70">Giro mensal</span>
                     <span className="font-bold text-lg text-white">4.800 <span className="text-[10px] font-normal tracking-wide">kg</span></span>
                  </div>
               </div>

               <div className="relative z-10 mt-2">
                  <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
                     <div className="h-full bg-[#a5d6a7] rounded-full" style={{ width: '85%' }}></div>
                  </div>
                  <p className="text-[8px] font-extrabold uppercase tracking-widest text-[#a5d6a7] mt-2">
                     85% DO ESTOQUE MÁXIMO OCUPADO
                  </p>
               </div>
            </div>

            {/* Dicas de Cadastro */}
            <div className="bg-[#e8f5e9]/50 rounded-2xl p-6 border border-[#a5d6a7]/30 shadow-sm flex flex-col gap-4">
               <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2e7d32]" />
                  <h3 className="text-sm font-bold text-[#0D2E1A]">Dicas de Cadastro</h3>
               </div>
               
               <ul className="space-y-4">
                  <li className="flex gap-3">
                     <div className="w-1 h-1 rounded-full bg-[#1A5E35] mt-1.5 shrink-0"></div>
                     <p className="text-xs font-medium text-[#0D2E1A]/80 leading-relaxed">
                        Use nomes descritivos claros (ex: Fabricante + Produto + Fase).
                     </p>
                  </li>
                  <li className="flex gap-3">
                     <div className="w-1 h-1 rounded-full bg-[#1A5E35] mt-1.5 shrink-0"></div>
                     <p className="text-xs font-medium text-[#0D2E1A]/80 leading-relaxed">
                        Revise as unidades de medida para evitar erros em relatórios de pesagem.
                     </p>
                  </li>
                  <li className="flex gap-3">
                     <div className="w-1 h-1 rounded-full bg-[#1A5E35] mt-1.5 shrink-0"></div>
                     <p className="text-xs font-medium text-[#0D2E1A]/80 leading-relaxed">
                        O estoque mínimo é usado para automatizar ordens de compra.
                     </p>
                  </li>
               </ul>
            </div>

            {/* Help Banner Image */}
            <div className="bg-gradient-to-br from-[#80313f] to-[#4a1820] rounded-2xl p-6 shadow-md relative overflow-hidden h-[180px] flex items-end justify-start group cursor-pointer transition-transform hover:-translate-y-1">
               <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-transparent" />
               <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 opacity-20 pointer-events-none">
                   {/* Decorative circle representing an abstract shape since we can't load the user's specific image */}
                   <div className="w-full h-full rounded-full bg-white blur-xl" />
               </div>

               <div className="relative z-20 flex flex-col gap-2 w-full">
                  <p className="text-[13px] font-bold text-white leading-tight">
                     Precisa de ajuda com a categorização?
                     <br />
                     <span className="text-[#ffcdd2]">Fale com o suporte.</span>
                  </p>
               </div>
               
               {/* Minimalist Question Mark icon as decoration */}
               <div className="absolute top-4 right-4 text-white/30">
                  <HelpCircle className="w-8 h-8" />
               </div>
            </div>

         </div>
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center text-[10px] font-bold text-outline uppercase tracking-wider px-2 mt-4">
         <span>ID do Produto: #AGRO-IT-88219</span>
         <span>v2.4.0-stable</span>
      </div>

    </main>
  );
}
