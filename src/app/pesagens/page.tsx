import { getWeighingHistory } from "../actions/pesagens";
import PesagensClient from "./PesagensClient";

export default async function PesagensPage({
   searchParams,
}: {
   searchParams: { loteId?: string };
}) {
   const { flock, error, needsFlock } = await getWeighingHistory(searchParams.loteId);

   if (error) {
       return (
           <main className="flex-1 p-8 bg-surface-container-lowest">
               <div className="bg-[#ffebee] border border-[#ffcdd2] rounded-xl p-6">
                   <h2 className="text-xl font-bold text-[#b71c1c] mb-2">Erro</h2>
                   <p className="text-[#c62828]">{error}</p>
                   {needsFlock && (
                       <p className="text-sm mt-2 text-[#d32f2f]">
                           Crie um lote na aba Lotes para começar a registrar pesagens.
                       </p>
                   )}
               </div>
           </main>
       );
   }

   // Fetch global farms/flocks logic could also be passed if we want the Header Selector, 
   // but for now we just pass the flock details and its weight history to the Client.
   return (
      <PesagensClient 
         initialFlock={flock} 
      />
   );
}

