"use client";

import React from "react";
import Link from "next/link";
import { Syringe, Stethoscope, ShieldAlert, ClipboardList } from "lucide-react";

export default function SanidadeHubPage() {
  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full flex flex-col items-center justify-center gap-8 min-h-[calc(100vh-4rem)]">
      
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-4">
         <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight flex items-center justify-center gap-3">
            <ShieldAlert className="w-8 h-8 text-[#1A5E35]" /> Central de Sanidade
         </h1>
         <p className="text-sm font-medium text-outline mt-3 max-w-xl">
            Escolha o tipo de registro clínico ou operacional que deseja lançar para o lote ativo.
         </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
         
         {/* CARD 01 - Registrar Vacinação */}
         <Link href="/sanidade/vacinacao/novo" className="group">
            <div className="bg-white rounded-2xl p-8 border border-outline-variant/30 shadow-sm hover:shadow-md transition-all h-full flex flex-col hover:border-[#1A5E35]/50 overflow-hidden relative">
               
               <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#1A5E35]/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Syringe className="w-16 h-16 text-[#1A5E35]/10" />
               </div>

               <div className="w-14 h-14 bg-[#e8f5e9] rounded-2xl flex items-center justify-center mb-6 border border-[#a5d6a7]/50 relative z-10 group-hover:bg-[#1A5E35] transition-colors">
                  <Syringe className="w-7 h-7 text-[#2e7d32] group-hover:text-white transition-colors" />
               </div>
               
               <h2 className="text-xl font-bold text-[#0D2E1A] mb-3 relative z-10">Registrar Vacinação</h2>
               <p className="text-sm font-medium text-outline flex-1 relative z-10 leading-relaxed">
                  Acessar a tela W-28. Lançamento de eventos de vacinação e posologia técnica. Monitoramento preventivo do plantel.
               </p>
               
               <div className="mt-8 flex items-center text-xs font-bold text-[#1A5E35] group-hover:text-[#0D2E1A] transition-colors relative z-10 uppercase tracking-widest gap-2">
                  Abrir Módulo &rarr;
               </div>
            </div>
         </Link>

         {/* CARD 02 - Registrar Visita Técnica */}
         <Link href="/sanidade/visitas/novo" className="group">
            <div className="bg-white rounded-2xl p-8 border border-outline-variant/30 shadow-sm hover:shadow-md transition-all h-full flex flex-col hover:border-[#1A5E35]/50 overflow-hidden relative">
               
               <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#1A5E35]/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Stethoscope className="w-16 h-16 text-[#1A5E35]/10" />
               </div>

               <div className="w-14 h-14 bg-[#e8f5e9] rounded-2xl flex items-center justify-center mb-6 border border-[#a5d6a7]/50 relative z-10 group-hover:bg-[#1A5E35] transition-colors">
                  <Stethoscope className="w-7 h-7 text-[#2e7d32] group-hover:text-white transition-colors" />
               </div>
               
               <h2 className="text-xl font-bold text-[#0D2E1A] mb-3 relative z-10">Registrar Visita Técnica</h2>
               <p className="text-sm font-medium text-outline flex-1 relative z-10 leading-relaxed">
                  Acessar a tela W-29. Registre a passagem do RT (Responsável Técnico), observações clínicas e mortalidades detectadas.
               </p>
               
               <div className="mt-8 flex items-center text-xs font-bold text-[#1A5E35] group-hover:text-[#0D2E1A] transition-colors relative z-10 uppercase tracking-widest gap-2">
                  Abrir Módulo &rarr;
               </div>
            </div>
         </Link>

         {/* CARD 03 - Protocolo Sanitário do Lote */}
         <Link href="/sanidade/protocolos" className="group">
            <div className="bg-white rounded-2xl p-8 border border-outline-variant/30 shadow-sm hover:shadow-md transition-all h-full flex flex-col hover:border-[#1A5E35]/50 overflow-hidden relative">
               
               <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#1A5E35]/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ClipboardList className="w-16 h-16 text-[#1A5E35]/10" />
               </div>

               <div className="w-14 h-14 bg-[#e8f5e9] rounded-2xl flex items-center justify-center mb-6 border border-[#a5d6a7]/50 relative z-10 group-hover:bg-[#1A5E35] transition-colors">
                  <ClipboardList className="w-7 h-7 text-[#2e7d32] group-hover:text-white transition-colors" />
               </div>
               
               <h2 className="text-xl font-bold text-[#0D2E1A] mb-3 relative z-10">Protocolo Sanitário & Auto-Auditoria</h2>
               <p className="text-sm font-medium text-outline flex-1 relative z-10 leading-relaxed">
                  Acessar a tela W-32. Realize a verificação de conformidade PNSA (IN 56/2007) estrutural e nutra o Dossiê do lote.
               </p>
               
               <div className="mt-8 flex items-center text-xs font-bold text-[#1A5E35] group-hover:text-[#0D2E1A] transition-colors relative z-10 uppercase tracking-widest gap-2">
                  Abrir Módulo &rarr;
               </div>
            </div>
         </Link>

      </div>

    </main>
  );
}
