"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { 
  ArrowLeft,
  Bell,
  Search,
  AlertTriangle,
  Package,
  TrendingUp,
  History,
  Info,
  ArrowRight,
  Loader2
} from "lucide-react";
import { getAlertConfig, saveAlertConfig } from "@/app/actions/configuracoes";

export default function W45AlertasPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaving] = useTransition();

  const [mortalityLimit, setMortalityLimit] = useState(0.5);
  const [feedStock, setFeedStock] = useState("2.5");
  const [medsStock, setMedsStock] = useState("10");
  const [ipMin, setIpMin] = useState(380);

  // Carregar configurações reais do banco
  useEffect(() => {
    async function loadConfig() {
      const result = await getAlertConfig();
      if (result.success && result.data) {
        setMortalityLimit(result.data.mortalityLimit);
        setFeedStock(String(result.data.feedStockTons));
        setMedsStock(String(result.data.medsStockUnits));
        setIpMin(result.data.ipMin);
      } else {
        toast.error("Erro ao carregar configurações", { description: result.error });
      }
      setIsLoading(false);
    }
    loadConfig();
  }, []);

  const handleSave = () => {
    startSaving(async () => {
      const result = await saveAlertConfig({
        mortalityLimit,
        feedStockTons: parseFloat(feedStock) || 2.5,
        medsStockUnits: parseFloat(medsStock) || 10,
        ipMin,
      });

      if (result.success) {
        toast.success("Configurações salvas!", {
          description: "As regras de alerta foram atualizadas com sucesso."
        });
      } else {
        toast.error("Erro ao salvar", { description: result.error });
      }
    });
  };

  const handleDiscard = () => {
    // Recarregar do servidor
    setIsLoading(true);
    getAlertConfig().then(result => {
      if (result.success && result.data) {
        setMortalityLimit(result.data.mortalityLimit);
        setFeedStock(String(result.data.feedStockTons));
        setMedsStock(String(result.data.medsStockUnits));
        setIpMin(result.data.ipMin);
      }
      setIsLoading(false);
      toast.info("Alterações descartadas");
    });
  };

  if (isLoading) {
    return (
      <main className="flex-1 p-8 bg-surface-container-lowest flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#1A5E35] animate-spin" />
          <span className="text-sm font-bold text-outline">Carregando configurações...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full max-w-[1400px] mx-auto pb-24">
      

      <div className="mb-8">
         <Link href="/configuracoes" className="inline-flex mb-4">
            <span className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">
               <ArrowLeft className="w-4 h-4" /> Voltar
            
            </span>
         </Link>
         <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
            Configurações de Alertas
         </h1>
         <p className="text-sm font-medium text-outline mt-2 max-w-2xl leading-relaxed">
            Defina os parâmetros críticos de monitoramento. O sistema enviará notificações automáticas quando os limites forem atingidos.
         </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        
        {/* CARD 1: Mortalidade Diária */}
        <section className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between h-full">
           <div>
              <div className="flex items-start gap-4 mb-6">
                 <div className="w-10 h-10 rounded-xl bg-[#ffebee] flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-[#c62828]" />
                 </div>
                 <div>
                    <h2 className="text-[15px] font-bold text-[#0D2E1A]">Mortalidade Diária</h2>
                    <p className="text-xs font-medium text-outline">Alertas baseados em perdas diárias por lote</p>
                 </div>
              </div>

              <div className="mb-2">
                 <label className="flex justify-between items-end mb-3">
                    <span className="text-[11px] font-bold text-[#1A5E35] uppercase tracking-wider">Limite de Mortalidade Máxima (%)</span>
                    <span className="bg-[#e8f5e9] text-[#1A5E35] font-extrabold text-sm px-2 py-0.5 rounded-md">{mortalityLimit}%</span>
                 </label>
                 <input 
                    type="range" 
                    min="0" max="5" step="0.1"
                    value={mortalityLimit}
                    onChange={(e) => setMortalityLimit(parseFloat(e.target.value))}
                    className="w-full accent-[#1A5E35] h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer"
                 />
              </div>
           </div>

           <div className="bg-[#ffebee] border-l-2 border-[#ef5350] p-4 rounded-r-lg mt-6">
              <p className="text-xs text-[#b71c1c] font-semibold leading-relaxed">
                 Notificações serão disparadas imediatamente para o gerente da granja se o índice for superado.
              </p>
           </div>
        </section>

        {/* CARD 2: Promo Info (Monitoramento 24/7) */}
        <section className="bg-[#1A5E35] rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between h-full">
           {/* Abstract floating circles */}
           <div className="absolute bottom-4 left-6 flex gap-1 items-center">
              <div className="w-6 h-6 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm -mr-3 z-10"></div>
              <div className="w-6 h-6 rounded-full border-2 border-white/20 bg-white/20 backdrop-blur-sm -mr-3 z-20"></div>
              <div className="w-6 h-6 rounded-full border-2 border-white/20 bg-[#a5d6a7] backdrop-blur-sm z-30"></div>
           </div>
           
           <div className="relative z-40">
              <span className="inline-block bg-[#e8f5e9] text-[#1A5E35] text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-sm mb-4">
                 INFORMAÇÃO
              </span>
              <h2 className="text-2xl font-manrope font-extrabold text-white leading-tight mb-3">
                 Monitoramento 24/7 Ativo
              </h2>
              <p className="text-sm text-[#a5d6a7] font-medium leading-relaxed">
                 Nossa tecnologia de Digital Soil processa métricas em tempo real para garantir a saúde total da sua produção.
              </p>
           </div>
        </section>

        {/* CARD 3: Estoque Crítico */}
        <section className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col h-full">
           <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant/30">
                 <Package className="w-5 h-5 text-[#637D68]" />
              </div>
              <div>
                 <h2 className="text-[15px] font-bold text-[#0D2E1A]">Estoque Crítico</h2>
                 <p className="text-xs font-medium text-outline">Alertas de reposição de insumos</p>
              </div>
           </div>

           <div className="space-y-4">
              <div>
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-[#0D2E1A] uppercase tracking-wider">Ração (Toneladas)</label>
                    <span className="text-[10px] font-bold text-[#1A5E35]">Ativar em: {feedStock}t</span>
                 </div>
                 <input 
                    type="number"
                    value={feedStock}
                    onChange={(e) => setFeedStock(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 focus:border-[#1A5E35] px-3 py-2.5 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#1A5E35] transition-all text-[#0D2E1A]"
                 />
              </div>

              <div>
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-[#0D2E1A] uppercase tracking-wider">Medicamentos (Unidades)</label>
                    <span className="text-[10px] font-bold text-[#1A5E35]">Ativar em: {medsStock}un</span>
                 </div>
                 <input 
                    type="number"
                    value={medsStock}
                    onChange={(e) => setMedsStock(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 focus:border-[#1A5E35] px-3 py-2.5 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#1A5E35] transition-all text-[#0D2E1A]"
                 />
              </div>
           </div>
        </section>

        {/* CARD 4: Índice de Produção (IP) */}
        <section className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col h-full lg:col-start-3 lg:-mt-10 lg:row-start-1 lg:row-span-2">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#e8f5e9] flex items-center justify-center shrink-0">
                 <TrendingUp className="w-5 h-5 text-[#1A5E35]" />
              </div>
              <div>
                 <h2 className="text-[15px] font-bold text-[#0D2E1A]">Índice de Produção (IP)</h2>
                 <p className="text-xs font-medium text-outline">Qualidade e eficiência esperada</p>
              </div>
           </div>

           <div className="flex-1 flex flex-col justify-center gap-4">
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 text-center">
                 <p className="text-[10px] font-extrabold text-outline-variant uppercase tracking-widest mb-1">Meta Mínima Esperada</p>
                 <input
                   type="number"
                   value={ipMin}
                   onChange={(e) => setIpMin(parseInt(e.target.value) || 0)}
                   className="text-5xl font-manrope font-extrabold text-[#1A5E35] bg-transparent text-center w-full focus:outline-none focus:ring-0 border-none"
                 />
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/20 flex flex-col items-center">
                    <span className="text-[9px] font-bold text-outline uppercase tracking-wider mb-1">MÉDIA ATUAL</span>
                    <span className="text-xl font-bold text-[#0D2E1A]">402</span>
                 </div>
                 <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/20 flex flex-col items-center">
                    <span className="text-[9px] font-bold text-outline uppercase tracking-wider mb-1">STATUS</span>
                    <div className="flex items-center gap-1.5 mt-1">
                       <span className="w-2 h-2 rounded-full bg-[#1A5E35]"></span>
                       <span className="text-sm font-extrabold text-[#1A5E35]">Otimizado</span>
                    </div>
                 </div>
              </div>
           </div>
        </section>

      </div>

      {/* FOOTER ACTIONS (Bottom Bar) */}
      <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
         <div className="flex items-center gap-2 text-outline">
            <History className="w-4 h-4" />
            <span className="text-xs font-medium">Os dados são salvos diretamente no servidor. Alterações entram em vigor imediatamente.</span>
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
               onClick={handleDiscard}
               className="flex-1 md:flex-none px-6 py-2.5 bg-transparent hover:bg-surface-container text-[#0D2E1A] font-bold text-sm rounded-xl transition-colors"
            >
               Descartar
            </button>
            <button 
               onClick={handleSave}
               disabled={isSaving}
               className="flex-1 md:flex-none px-6 py-2.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white font-extrabold text-sm rounded-xl transition-colors shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
               {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
               Salvar Configurações
            </button>
         </div>
      </div>

      {/* BOTTOM BANNER */}
      <div className="w-full relative rounded-2xl overflow-hidden h-48 group cursor-pointer shadow-md">
         {/* eslint-disable-next-line @next/next/no-img-element */}
         <img 
            src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1400" 
            alt="Data Center" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 mix-blend-overlay"
         />
         <div className="absolute inset-0 bg-gradient-to-r from-[#0D2E1A] via-[#0D2E1A]/80 to-transparent"></div>
         
         <div className="absolute inset-0 p-8 flex justify-center items-start flex-col">
            <h3 className="text-2xl font-manrope font-extrabold text-white mb-2">Excelência em Dados</h3>
            <p className="text-sm font-medium text-white/80 max-w-xl leading-relaxed mb-6">
               Nossas ferramentas de precisão garantem que você nunca perca um detalhe. Configure alertas e tome decisões baseadas em fatos, não em suposições.
            </p>
            <button className="flex items-center gap-2 text-sm font-bold text-[#a5d6a7] group-hover:text-white transition-colors">
               Ver histórico de alertas disparados <ArrowRight className="w-4 h-4" />
            </button>
         </div>
      </div>

    </main>
  );
}
