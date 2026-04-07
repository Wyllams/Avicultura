import { getFeedHistory, getActiveFlocks } from "@/app/actions/racao";
import { RacaoClient } from "./RacaoClient";

export const revalidate = 0; // Ensures data is fresh when navigating back

export default async function RacaoPage({
  searchParams,
}: {
  searchParams: { loteId?: string };
}) {
  const { flock, error, needsFlock } = await getFeedHistory(searchParams.loteId);
  const { flocks: activeFlocks } = await getActiveFlocks();

  if (error) {
    return (
      <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in max-w-[1400px] mx-auto w-full">
        <div className="bg-[#ffebee] border border-[#ffcdd2] rounded-xl p-6">
           <h2 className="text-xl font-bold text-[#b71c1c] mb-2">Erro</h2>
           <p className="text-[#c62828]">{error}</p>
           {needsFlock && (
               <p className="text-sm mt-2 text-[#d32f2f]">
                   Crie um lote na aba Lotes para começar a visualizar o consumo de ração.
               </p>
           )}
        </div>
      </main>
    );
  }

  return <RacaoClient initialFlock={flock} activeFlocks={activeFlocks || []} />;
}
