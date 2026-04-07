"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getMortalidadeData } from "@/app/actions/relatorios";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function W40MortalidadePage() {
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
      const result = await getMortalidadeData(flockId as string);
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

  const msPerDay = 1000 * 60 * 60 * 24;
  const housingDate = new Date(reportData.housingDate).getTime();

  let accumulatedDead = 0;
  
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
          
          <div className="border-b-2 border-[#1A5E35] pb-4 mb-6">
             <h1 className="text-2xl font-extrabold uppercase tracking-widest text-[#0D2E1A]">Relatório de Mortalidade</h1>
             <p className="text-xs font-bold text-outline uppercase mt-1">Acompanhamento Diário de Baixas do Lote</p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-10 text-sm bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant/30">
             <div>
                <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Galpão</span>
                <span className="font-bold">{reportData.barnName}</span>
             </div>
             <div>
                <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Lote Ativo</span>
                <span className="font-bold">{reportData.flockName}</span>
             </div>
             <div>
                <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Alojamento Inicial</span>
                <span className="font-bold text-[#1A5E35]">{reportData.housedBirds} aves</span>
             </div>
          </div>

          <h2 className="text-sm font-black bg-[#e8f5e9] text-[#1A5E35] px-3 py-2 uppercase tracking-widest border-l-4 border-[#1A5E35] mb-4">
             Registros de Baixa
          </h2>
          
          {reportData.mortalityLogs && reportData.mortalityLogs.length > 0 ? (
             <table className="w-full text-xs text-left border-collapse mt-4">
                <thead>
                   <tr className="border-b border-outline-variant/50">
                      <th className="py-2 px-2 font-black uppercase text-outline">Data</th>
                      <th className="py-2 px-2 font-black uppercase text-outline text-center">Idade (Dias)</th>
                      <th className="py-2 px-2 font-black uppercase text-outline text-right">Qtd. Mortas</th>
                      <th className="py-2 px-2 font-black uppercase text-outline">Causa Assinalada</th>
                      <th className="py-2 px-2 font-black uppercase text-outline text-right">Acumulado</th>
                   </tr>
                </thead>
                <tbody>
                   {reportData.mortalityLogs.map((log: any) => {
                      accumulatedDead += log.quantity;
                      const ageInDays = Math.floor((new Date(log.date).getTime() - housingDate) / msPerDay);
                      
                      return (
                         <tr key={log.id} className="border-b border-outline-variant/30">
                            <td className="py-2 px-2 font-medium">{new Date(log.date).toLocaleDateString("pt-BR")}</td>
                            <td className="py-2 px-2 text-center">{ageInDays >= 0 ? ageInDays : 0}</td>
                            <td className="py-2 px-2 font-bold text-right text-[#c62828]">{log.quantity}</td>
                            <td className="py-2 px-2 text-outline">{log.cause || "Não informada"}</td>
                            <td className="py-2 px-2 font-bold text-right">{accumulatedDead}</td>
                         </tr>
                      );
                   })}
                   <tr className="border-t-2 border-[#0D2E1A] bg-surface-container">
                      <td colSpan={2} className="py-3 px-2 font-black uppercase text-right">TOTAL DE MORTALIDADE:</td>
                      <td className="py-3 px-2 font-black text-right text-[#c62828]">{accumulatedDead} aves</td>
                      <td colSpan={2} className="py-3 px-2 font-bold text-right">
                         Viabilidade: {reportData.housedBirds > 0 ? (((reportData.housedBirds - accumulatedDead) / reportData.housedBirds) * 100).toFixed(2) : 0}%
                      </td>
                   </tr>
                </tbody>
             </table>
          ) : (
             <p className="text-xs text-outline italic">Excelente desempenho! Nenhuma mortalidade registrada para este lote até o momento.</p>
          )}

          <div className="mt-32 text-center w-64 mx-auto border-t border-outline">
             <p className="text-xs font-bold mt-2">Responsável Geral</p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
