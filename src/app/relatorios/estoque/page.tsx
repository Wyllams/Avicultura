"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getEstoqueReportData } from "@/app/actions/relatorios";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function W39EstoquePage() {
  const searchParams = useSearchParams();
  const farmId = searchParams.get("farmId");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any[]>([]);

  useEffect(() => {
    if (!farmId) {
      toast.error("Granja não selecionada.");
      router.push("/relatorios");
      return;
    }

    async function fetchData() {
      const result = await getEstoqueReportData(farmId as string);
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
  }, [farmId, router]);

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
             <h1 className="text-2xl font-extrabold uppercase tracking-widest text-[#0D2E1A]">Relatório de Estoque e Consumo</h1>
             <p className="text-xs font-bold text-outline uppercase mt-1">Gabinete de Movimentações (Uso vs Recebimento da Granja)</p>
          </div>

          <div className="mb-6">
             <p className="text-sm">Granja ID: <strong>{farmId}</strong></p>
             <p className="text-sm">Data do Extrato: <strong>{new Date().toLocaleDateString("pt-BR")}</strong></p>
          </div>

          <h2 className="text-sm font-black bg-[#e8f5e9] text-[#1A5E35] px-3 py-2 uppercase tracking-widest border-l-4 border-[#1A5E35] mb-4">
             Entradas e Saídas (Geral)
          </h2>
          
          {reportData && reportData.length > 0 ? (
             <table className="w-full text-xs text-left border-collapse">
                <thead>
                   <tr className="border-b border-outline-variant/50">
                      <th className="py-2 px-2 font-black uppercase text-outline">Data/Hora</th>
                      <th className="py-2 px-2 font-black uppercase text-outline">Item</th>
                      <th className="py-2 px-2 font-black uppercase text-outline">Operação</th>
                      <th className="py-2 px-2 font-black uppercase text-outline text-right">Qtd.</th>
                      <th className="py-2 px-2 font-black uppercase text-outline">Unid.</th>
                      <th className="py-2 px-2 font-black uppercase text-outline">Motivo/Lote</th>
                   </tr>
                </thead>
                <tbody>
                   {reportData.map((mov: any) => (
                      <tr key={mov.id} className="border-b border-outline-variant/30">
                         <td className="py-2 px-2">{new Date(mov.date).toLocaleString("pt-BR")}</td>
                         <td className="py-2 px-2 font-bold">{mov.item.name}</td>
                         <td className="py-2 px-2">
                           <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-black tracking-widest ${mov.type === 'IN' ? 'bg-[#e8f5e9] text-[#1A5E35]' : 'bg-[#ffebee] text-[#c62828]'}`}>
                             {mov.type === 'IN' ? 'ENTRADA' : 'SAÍDA USO'}
                           </span>
                         </td>
                         <td className="py-2 px-2 font-bold text-right">{mov.quantity}</td>
                         <td className="py-2 px-2 text-outline">{mov.item.unit}</td>
                         <td className="py-2 px-2">{mov.reason || "-"}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          ) : (
             <p className="text-xs text-outline italic">Nenhuma movimentação de estoque registrada nesta granja.</p>
          )}

          <div className="mt-32 text-center w-64 border-t border-outline">
             <p className="text-xs font-bold mt-2">Assinatura Encarregado</p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
