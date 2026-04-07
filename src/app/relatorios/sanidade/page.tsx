"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSanidadeData } from "@/app/actions/relatorios";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";

function W41SanidadePageContent() {
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
      const result = await getSanidadeData(flockId as string);
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
          
          <div className="border-b-2 border-[#1A5E35] pb-4 mb-6">
             <h1 className="text-2xl font-extrabold uppercase tracking-widest text-[#0D2E1A]">Histórico de Sanidade</h1>
             <p className="text-xs font-bold text-outline uppercase mt-1">Medicações, Receituários e Auditórias Técnicas</p>
          </div>

          <div className="mb-8 p-4 bg-surface-container rounded-xl border border-outline-variant/50">
             <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Lote Analisado</span>
             <span className="font-bold text-lg text-[#1A5E35]">{reportData.flockName}</span>
          </div>

          <h2 className="text-sm font-black bg-[#e8f5e9] text-[#1A5E35] px-3 py-2 uppercase tracking-widest border-l-4 border-[#1A5E35] mb-4">
             Histórico de Medicações e Tratamentos
          </h2>
          
          {reportData.medications && reportData.medications.length > 0 ? (
             <table className="w-full text-xs text-left border-collapse mb-10">
                <thead>
                   <tr className="border-b border-outline-variant/50">
                      <th className="py-2 px-2 font-black uppercase text-outline">Data</th>
                      <th className="py-2 px-2 font-black uppercase text-outline">Medicamento</th>
                      <th className="py-2 px-2 font-black uppercase text-outline">Dosagem</th>
                      <th className="py-2 px-2 font-black uppercase text-outline">Via/Método</th>
                      <th className="py-2 px-2 font-black uppercase text-outline">Carência</th>
                   </tr>
                </thead>
                <tbody>
                   {reportData.medications.map((med: any) => (
                      <tr key={med.id} className="border-b border-outline-variant/30">
                         <td className="py-2 px-2 font-medium">{new Date(med.date).toLocaleDateString("pt-BR")}</td>
                         <td className="py-2 px-2 font-bold">{med.medicationName}</td>
                         <td className="py-2 px-2">{med.dosage}</td>
                         <td className="py-2 px-2">{med.method}</td>
                         <td className="py-2 px-2">{med.withdrawalDays ? `${med.withdrawalDays} dias` : '-'}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          ) : (
             <p className="text-xs text-outline italic mb-10">Nenhuma medicação registrada para este lote.</p>
          )}

          <h2 className="text-sm font-black bg-[#e8f5e9] text-[#1A5E35] px-3 py-2 uppercase tracking-widest border-l-4 border-[#1A5E35] mb-4">
             Registro de Visitas Técnicas (RT)
          </h2>
          
          {reportData.visits && reportData.visits.length > 0 ? (
             <div className="space-y-6">
                {reportData.visits.map((vis: any) => (
                   <div key={vis.id} className="border border-outline-variant/50 rounded-xl p-5">
                      <div className="flex justify-between items-center mb-3 border-b border-outline-variant/30 pb-2">
                         <div>
                            <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Veterinário / Auditor</span>
                            <span className="font-bold">{vis.veterinarian}</span>
                         </div>
                         <div className="text-right">
                            <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Data da Visita</span>
                            <span className="font-bold">{new Date(vis.date).toLocaleDateString("pt-BR")}</span>
                         </div>
                      </div>
                      <p className="text-xs text-justify leading-relaxed whitespace-pre-wrap">
                         {vis.report}
                      </p>
                   </div>
                ))}
             </div>
          ) : (
             <p className="text-xs text-outline italic">Nenhuma visita técnica ou receituário registrado.</p>
          )}

          <div className="mt-32 flex justify-between items-end px-10">
             <div className="text-center w-64 border-t border-outline">
                <p className="text-xs font-bold mt-2">Médico Veterinário (RT)</p>
             </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default function W41SanidadePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando...</div>}>
      <W41SanidadePageContent />
    </Suspense>
  );
}
