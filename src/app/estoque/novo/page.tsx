"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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

// Schema do formulário
const formSchema = z.object({
  productName: z.string().min(1, "Campo obrigatório").max(100),
  quantity: z.number().positive("A quantidade deve ser > 0"),
  price: z.number().nonnegative("O preço não pode ser negativo"),
  entryDate: z.string().min(1, "Data é obrigatória"),
  nfNumber: z.string().min(1, "Número da NF é obrigatório"),
  provider: z.string().min(1, "Selecione um fornecedor"),
});

type FormValues = z.infer<typeof formSchema>;

export default function W25EntradaEstoquePage() {
  const [totalCalculado, setTotalCalculado] = useState(0);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
       productName: "",
       entryDate: new Date().toISOString().split('T')[0],
       nfNumber: "",
       provider: ""
    }
  });

  const watchQuantity = watch("quantity");
  const watchPrice = watch("price");

  useEffect(() => {
     const val = (watchQuantity || 0) * (watchPrice || 0);
     setTotalCalculado(val);
  }, [watchQuantity, watchPrice]);

  const onSubmit = async (data: FormValues) => {
    try {
      // Simulação fake de API/Dexie DB
      await new Promise((resolve) => setTimeout(resolve, 800));
      console.log("Dados do Lançamento (W-25):", data);
      
      toast.success("Carga registrada com sucesso!", {
        description: `Nota Fiscal: ${data.nfNumber} - ${data.productName}`,
      });
      // Poderia redirecionar para router.push('/estoque') ou dar reset()
    } catch (_error) {
      toast.error("Ocorreu um erro ao salvar o registro físico.");
    }
  };

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6">
      
      {/* Navigation Return */}
      <div>
         <Link href="/estoque" className="inline-flex mb-4">
            <span className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">
               <ArrowLeft className="w-4 h-4" /> Voltar
            
            </span>
         </Link>

         {/* Header */}
         <div>
            <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
               Registro de Entrada
            </h1>
            <p className="text-sm font-medium text-outline mt-1 max-w-xl">
               Lançamento de mercadorias e insumos no almoxarifado central.
            </p>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mt-2 pb-8">
         {/* Form Area - w-2/3 */}
         <div className="lg:w-2/3 bg-white rounded-2xl p-8 border border-outline-variant/30 shadow-sm flex flex-col">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 flex-1">
               
               {/* 1. Informações do Produto */}
               <div>
                  <div className="flex items-center gap-2 mb-6">
                     <Package className="w-5 h-5 text-[#1A5E35]" />
                     <h2 className="text-sm font-bold text-[#0D2E1A]">Informações do Produto</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                           Produto
                        </label>
                        <input
                           type="text"
                           placeholder="Buscar por nome ou código SKU..."
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all"
                           {...register("productName")}
                        />
                        {errors.productName && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.productName.message}</p>}
                     </div>

                     <div>
                        <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                           Quantidade
                        </label>
                        <div className="relative">
                           <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all font-mono"
                              {...register("quantity", { valueAsNumber: true })}
                           />
                           <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                              <span className="text-[10px] font-bold text-outline bg-surface-container-low px-2 py-0.5 rounded">UNIDADES</span>
                           </div>
                        </div>
                        {errors.quantity && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.quantity.message}</p>}
                     </div>

                     <div>
                        <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                           Preço Unitário (R$)
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
                  </div>
               </div>

               <hr className="border-outline-variant/20" />

               {/* 2. Documentação & Logística */}
               <div>
                  <div className="flex items-center gap-2 mb-6">
                     <FileText className="w-5 h-5 text-[#1A5E35]" />
                     <h2 className="text-sm font-bold text-[#0D2E1A]">Documentação & Logística</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div>
                        <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                           Data de Entrada
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
                           Número da NF
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
                           Fornecedor
                        </label>
                        <select
                           className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-bold rounded-xl focus:outline-none focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] transition-all"
                           {...register("provider")}
                        >
                           <option value="">Selecione um fornecedor cadastrado</option>
                           <option value="AgroPlus S.A.">AgroPlus S.A.</option>
                           <option value="BioFarm Solutions">BioFarm Solutions</option>
                           <option value="VetLog Brasil">VetLog Brasil</option>
                           <option value="GrainCorp Logística">GrainCorp Logística</option>
                        </select>
                        {errors.provider && <p className="text-[#c62828] text-xs font-bold mt-1.5">{errors.provider.message}</p>}
                     </div>
                  </div>
               </div>

               {/* Action Buttons */}
               <div className="mt-auto pt-6 flex flex-col-reverse sm:flex-row justify-end items-center gap-4">
                  <Link href="/estoque">
                     <button type="button" className="w-full sm:w-auto px-6 py-3 bg-surface-container border border-outline-variant/30 hover:bg-outline-variant/20 text-[#0D2E1A] text-sm font-bold rounded-xl transition-all shadow-sm">
                        Cancelar
                     </button>
                  </Link>
                  <button
                     type="submit"
                     disabled={isSubmitting}
                     className="w-full sm:w-auto px-6 py-3 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md disabled:bg-[#0D2E1A]/50"
                  >
                     {isSubmitting ? (
                        <>Salvando...</>
                     ) : (
                        <>
                           <Save className="w-4 h-4" /> Save Entry
                        </>
                     )}
                  </button>
               </div>
            </form>
         </div>

         {/* Right Sidebar - Analytics/Status - w-1/3 */}
         <div className="lg:w-1/3 flex flex-col gap-6">
            
            {/* Cargo Box (Dark Green) */}
            <div className="bg-[#1A5E35] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 blur-2xl pointer-events-none" />
               <h3 className="text-sm font-bold text-white mb-6 relative z-10">Resumo da Carga</h3>
               
               <div className="space-y-4 mb-6 relative z-10">
                  <div className="flex justify-between items-center text-sm">
                     <span className="font-bold text-white/70">Previsão de Total</span>
                     <span className="font-manrope font-extrabold text-lg flex items-center">
                        <span className="text-xs mr-1 text-white/60">R$</span>
                        {totalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                     </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="font-bold text-white/70">Impacto no Giro</span>
                     <span className="font-bold text-[#a5d6a7]">+0.0%</span>
                  </div>
               </div>

               <p className="text-[10px] italic text-[#a5d6a7]/80 leading-relaxed relative z-10 border-t border-white/10 pt-4">
                  Certifique-se de que os dados da Nota Fiscal coincidem com a carga física antes de salvar.
               </p>
            </div>

            {/* Warehouse Ocuppancy */}
            <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
               <h3 className="text-sm font-bold text-[#0D2E1A] mb-5">Ocupação do Armazém</h3>

               <div className="space-y-6">
                  {/* Hangar A */}
                  <div className="flex gap-4 items-center">
                     <div className="bg-[#e8f5e9] p-2.5 rounded-lg border border-[#a5d6a7]/50">
                        <Warehouse className="w-4 h-4 text-[#2e7d32]" />
                     </div>
                     <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[10px] font-bold text-[#0D2E1A] uppercase tracking-widest">Hangar A</span>
                           <span className="text-[10px] font-bold text-[#2e7d32]">82%</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                           <div className="h-full bg-[#1A5E35] rounded-full" style={{ width: '82%' }}></div>
                        </div>
                     </div>
                  </div>

                  {/* Silo Central */}
                  <div className="flex gap-4 items-center">
                     <div className="bg-surface-container p-2.5 rounded-lg border border-outline-variant/30">
                        <ClipboardList className="w-4 h-4 text-outline" />
                     </div>
                     <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Silo Central</span>
                           <span className="text-[10px] font-bold text-outline">45%</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                           <div className="h-full bg-[#637D68] rounded-full" style={{ width: '45%' }}></div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Tip Banner Placeholder */}
            <div className="bg-[#0b2414] rounded-2xl p-6 shadow-md relative overflow-hidden h-[160px] flex items-end justify-start">
               {/* Simulating an image backdrop with gradients */}
               <div className="absolute inset-0 bg-gradient-to-tr from-[#0D2E1A] to-transparent z-10" />
               <div className="absolute inset-0 opacity-20">
                  {/* Placeholder SVG background representing stacked pallets */}
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                     <pattern id="pallet" width="40" height="20" patternUnits="userSpaceOnUse">
                        <rect width="38" height="18" fill="none" stroke="#fff" strokeWidth="1"/>
                        <line x1="0" y1="9" x2="38" y2="9" stroke="#fff" strokeWidth="0.5" />
                     </pattern>
                     <rect width="100%" height="100%" fill="url(#pallet)" />
                  </svg>
               </div>

               <div className="relative z-20 flex flex-col gap-1 w-full">
                  <div className="flex items-center gap-1">
                     <ScanLine className="w-3.5 h-3.5 text-[#a5d6a7]" />
                     <p className="text-[11px] font-bold text-[#a5d6a7]">Tip Profissional</p>
                  </div>
                  <p className="text-xs font-medium text-white/90 leading-tight">
                     Escaneie o QR Code da NF para preenchimento automático.
                  </p>
               </div>
            </div>

         </div>
      </div>
    </main>
  );
}
