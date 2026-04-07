export const dynamic = "force-dynamic";

import { getWeighingHistory } from "@/app/actions/pesagens";
import { PesagensHistoricoClient } from "./PesagensHistoricoClient";

export const revalidate = 0; // Ensures data is fresh

export default async function PesagensHistoricoPage({
  searchParams,
}: {
  searchParams: { loteId?: string };
}) {
  const { flock, error, needsFlock } = await getWeighingHistory(searchParams.loteId);

  if (error) {
       return (
           <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in max-w-[1400px] mx-auto w-full">
               <div className="bg-[#ffebee] border border-[#ffcdd2] rounded-xl p-6">
                   <h2 className="text-xl font-bold text-[#b71c1c] mb-2">Erro</h2>
                   <p className="text-[#c62828]">{error}</p>
                   {needsFlock && (
                       <p className="text-sm mt-2 text-[#d32f2f]">
                           Crie um lote na aba Lotes para visualizar o histórico.
                       </p>
                   )}
               </div>
           </main>
       );
  }

  return <PesagensHistoricoClient initialFlock={flock} />;
}
