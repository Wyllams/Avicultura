"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getBoletimSanitarioData } from "@/app/actions/relatorios";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function W37BoletimSanitarioPage() {
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
      const result = await getBoletimSanitarioData(flockId as string);
      if (result.error) {
        toast.error(result.error);
        router.push("/relatorios");
        return; // Importante para não continuar a renderização
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
      {/* Top Action Bar - Hidden on print */}
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
          
          {/* Cabeçalho */}
          <div className="border-b-2 border-[#1A5E35] pb-4 mb-6 text-center">
             <h1 className="text-xl font-extrabold uppercase tracking-widest text-[#0D2E1A]">Boletim Sanitário de Lote</h1>
             <p className="text-xs font-bold text-outline uppercase mt-1">Conforme Instrução Normativa MAPA Nº 100/2020</p>
          </div>

          {/* Dados Gerais */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-sm">
             <div>
                <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Identificação da Granja</span>
                <span className="font-bold border-b border-outline-variant/50 block pb-1">{reportData.farmName}</span>
             </div>
             <div>
                <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Identificação do Lote</span>
                <span className="font-bold border-b border-outline-variant/50 block pb-1">{reportData.flockName}</span>
             </div>
             <div>
                <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Linhagem</span>
                <span className="font-bold border-b border-outline-variant/50 block pb-1">{reportData.breed || "Não informada"}</span>
             </div>
             <div>
                <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Aves Alojadas</span>
                <span className="font-bold border-b border-outline-variant/50 block pb-1">{reportData.housedBirds} aves</span>
             </div>
             <div>
                <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Data de Alojamento</span>
                <span className="font-bold border-b border-outline-variant/50 block pb-1">{new Date(reportData.housingDate).toLocaleDateString("pt-BR")}</span>
             </div>
             <div>
                <span className="block text-[10px] uppercase font-black tracking-wider text-outline">Óbitos Acumulados</span>
                <span className="font-bold border-b border-outline-variant/50 block pb-1">{reportData.totalDead} aves perdidas</span>
             </div>
          </div>

          {/* Vacinações */}
          <div className="mb-8">
             <h2 className="text-sm font-black bg-[#e8f5e9] text-[#1A5E35] px-3 py-2 uppercase tracking-widest border-l-4 border-[#1A5E35] mb-4">
                Programa de Vacinação e Medicações
             </h2>
             {reportData.vaccines && reportData.vaccines.length > 0 ? (
                <table className="w-full text-xs text-left border-collapse">
                   <thead>
                      <tr className="border-b border-outline-variant/50">
                         <th className="py-2 px-2 font-black uppercase text-outline">Data</th>
                         <th className="py-2 px-2 font-black uppercase text-outline">Vacina/Produto</th>
                         <th className="py-2 px-2 font-black uppercase text-outline">Método</th>
                         <th className="py-2 px-2 font-black uppercase text-outline">Responsável</th>
                      </tr>
                   </thead>
                   <tbody>
                      {reportData.vaccines.map((vac: any) => (
                         <tr key={vac.id} className="border-b border-outline-variant/30">
                            <td className="py-2 px-2 font-medium">{new Date(vac.date).toLocaleDateString("pt-BR")}</td>
                            <td className="py-2 px-2 font-bold">{vac.vaccineName}</td>
                            <td className="py-2 px-2">{vac.method}</td>
                            <td className="py-2 px-2">{vac.appliedBy || "-"}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             ) : (
                <p className="text-xs text-outline italic">Nenhum registro de vacinação cadastrado para este lote.</p>
             )}
          </div>

          {/* Visitas Técnicas */}
          <div className="mb-16">
             <h2 className="text-sm font-black bg-[#e8f5e9] text-[#1A5E35] px-3 py-2 uppercase tracking-widest border-l-4 border-[#1A5E35] mb-4">
                Acompanhamento Técnico (Visitas)
             </h2>
             {reportData.visits && reportData.visits.length > 0 ? (
                <table className="w-full text-xs text-left border-collapse">
                   <thead>
                      <tr className="border-b border-outline-variant/50">
                         <th className="py-2 px-2 font-black uppercase text-outline">Data</th>
                         <th className="py-2 px-2 font-black uppercase text-outline">RT / Veterinário</th>
                         <th className="py-2 px-2 font-black uppercase text-outline">Observações / Relatório</th>
                      </tr>
                   </thead>
                   <tbody>
                      {reportData.visits.map((vis: any) => (
                         <tr key={vis.id} className="border-b border-outline-variant/30">
                            <td className="py-2 px-2 font-medium align-top">{new Date(vis.date).toLocaleDateString("pt-BR")}</td>
                            <td className="py-2 px-2 font-bold align-top">{vis.veterinarian}</td>
                            <td className="py-2 px-2 text-justify">{vis.report}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             ) : (
                <p className="text-xs text-outline italic">Nenhuma visita técnica registrada.</p>
             )}
          </div>

          {/* Assinatura */}
          <div className="mt-32 flex justify-between items-end px-10">
             <div className="text-center w-64 border-t border-outline">
                <p className="text-xs font-bold mt-2">Responsável Técnico (CRMV)</p>
             </div>
             <div className="text-center w-64 border-t border-outline">
                <p className="text-xs font-bold mt-2">Produtor / Responsável Legal</p>
             </div>
          </div>
          
          <div className="mt-8 text-center text-[10px] text-outline print:block hidden">
             Atesto sob as penas da lei que as informações descritas acima refletem a exata realidade do manejo do lote.
             <br /> Emitido em {new Date().toLocaleString("pt-BR")} via Avicultura App.
          </div>

        </div>
      </div>
    </div>
  );
}
