"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getDesempenhoData } from "@/app/actions/relatorios";
import { ArrowLeft, Printer, Loader2, Activity, Percent, Scale, Package } from "lucide-react";
import { toast } from "sonner";

function W38DesempenhoPageContent() {
  const searchParams = useSearchParams();
  const flockId = searchParams.get("flockId");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    if (!flockId) {
      toast.error("Lote não selecionado.");
      router.push("/relatorios");
      return;
    }

    async function fetchData() {
      const result = await getDesempenhoData(flockId as string);
      if (result.error) {
        toast.error(result.error);
        router.push("/relatorios");
        return;
      } else {
        setReportData(result.data);
      }
      setLoading(false);
    }
    fetchData();
  }, [flockId, router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A5E35]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-surface min-h-screen">
      {/* Top Action Bar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-outline-variant/30 px-6 py-4 flex items-center justify-between shadow-sm">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-bold text-outline hover:text-[#0D2E1A] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Voltar
        </button>
        <button 
          onClick={() => window.print()}
          className="bg-[#1A5E35] hover:bg-[#0D2E1A] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2"
        >
          <Printer className="w-4 h-4" /> Exportar PDF / Imprimir
        </button>
      </div>

      {/* Report Paper - A4 Style */}
      <div className="p-4 md:p-8 print:p-0 flex justify-center">
        <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-xl print:shadow-none p-10 print:p-0 text-[#0D2E1A]">
          
          <div className="border-b-2 border-[#1A5E35] pb-4 mb-6 flex justify-between items-end">
             <div>
                <h1 className="text-2xl font-extrabold uppercase tracking-widest text-[#0D2E1A]">Relatório de Desempenho</h1>
                <p className="text-xs font-bold text-outline uppercase mt-1">Fechamento Zootécnico do Lote</p>
             </div>
             <div className="text-right">
                <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Lote</span>
                <span className="font-bold text-lg text-[#1A5E35]">{reportData.flockName}</span>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-10 text-sm bg-surface-container px-6 py-4 rounded-2xl">
             <div>
                <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Granja</span>
                <span className="font-bold">{reportData.farmName}</span>
             </div>
             <div>
                <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Galpão</span>
                <span className="font-bold">{reportData.barnName}</span>
             </div>
             <div>
                <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Idade do Lote</span>
                <span className="font-bold">{reportData.ageInDays} dias</span>
             </div>
             <div>
                <span className="block text-[10px] uppercase font-black tracking-wider text-outline">População</span>
                <span className="font-bold">{reportData.housedBirds} aves alojadas originais</span>
             </div>
          </div>

          <h2 className="text-sm font-black bg-[#e8f5e9] text-[#1A5E35] px-3 py-2 uppercase tracking-widest border-l-4 border-[#1A5E35] mb-6">
             Indicadores Chave (KPIs)
          </h2>

          <div className="grid grid-cols-2 gap-6 mb-12">
             <div className="border border-outline-variant/40 rounded-xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#1A5E35]/10 flex items-center justify-center">
                   <Percent className="w-6 h-6 text-[#1A5E35]" />
                </div>
                <div>
                   <p className="text-[10px] uppercase font-black tracking-wider text-outline">Viabilidade</p>
                   <p className="text-2xl font-extrabold">{reportData.viabilidade}%</p>
                   <p className="text-[10px] font-medium text-outline">Vivas: {reportData.aliveBirds} / Mortas: {reportData.totalDead}</p>
                </div>
             </div>

             <div className="border border-outline-variant/40 rounded-xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#1A5E35]/10 flex items-center justify-center">
                   <Package className="w-6 h-6 text-[#1A5E35]" />
                </div>
                <div>
                   <p className="text-[10px] uppercase font-black tracking-wider text-outline">CA - Conversão Alimentar</p>
                   <p className="text-2xl font-extrabold">{(Number(reportData.conversaoAlimentar)).toLocaleString('pt-BR')}</p>
                   <p className="text-[10px] font-medium text-outline">Razão Kg de ração por Kg consumido</p>
                </div>
             </div>

             <div className="border border-outline-variant/40 rounded-xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#1A5E35]/10 flex items-center justify-center">
                   <Scale className="w-6 h-6 text-[#1A5E35]" />
                </div>
                <div>
                   <p className="text-[10px] uppercase font-black tracking-wider text-outline">GPD - Ganho de Peso Diário</p>
                   <p className="text-2xl font-extrabold">{reportData.gpd}g/dia</p>
                   <p className="text-[10px] font-medium text-outline">Peso Atual Médio: {reportData.currentWeightKg} kg</p>
                </div>
             </div>

             <div className="border border-outline-variant/40 bg-surface-container rounded-xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#1A5E35] flex items-center justify-center">
                   <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                   <p className="text-[10px] uppercase font-black tracking-wider text-[#1A5E35]">IEP - Índice Eficiên. Produtiva</p>
                   <p className="text-3xl font-black text-[#1A5E35]">{reportData.iep}</p>
                   <p className="text-[10px] font-bold text-[#1A5E35]/70">Score Internacional Zootécnico</p>
                </div>
             </div>
          </div>

          <h2 className="text-sm font-black bg-[#e8f5e9] text-[#1A5E35] px-3 py-2 uppercase tracking-widest border-l-4 border-[#1A5E35] mb-6">
             Consumo de Ração
          </h2>
          <div className="mb-10 text-sm">
             <p className="font-bold border-b border-outline-variant/40 pb-2 mb-2 flex justify-between">
                <span>Ração Total Consumida pelo Lote:</span>
                <span>{reportData.totalFeedConsumedKg} Kg</span>
             </p>
          </div>

          <div className="mt-32 text-center w-64 mx-auto border-t border-outline">
             <p className="text-xs font-bold mt-2">Gerente de Produção / Supervisor</p>
          </div>
          
          <div className="mt-16 text-center text-[10px] text-outline print:block hidden">
             Relatório Zootécnico - Emissão Privada via Avicultura SaaS
             <br /> Emitido em {new Date().toLocaleString("pt-BR")}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function W38DesempenhoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando...</div>}>
      <W38DesempenhoPageContent />
    </Suspense>
  );
}
