export const dynamic = "force-dynamic";

import { getMortalityHistory } from "@/app/actions/mortalidade";
import { MortalidadeClient } from "./MortalidadeClient";

export const revalidate = 0; // Ensures data is fresh when navigating back

export default async function MortalidadePage({
  searchParams,
}: {
  searchParams: { loteId?: string };
}) {
  const { flock, error, needsFlock } = await getMortalityHistory(searchParams.loteId);

  if (error) {
    return (
      <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in max-w-[1400px] mx-auto w-full">
        <h1 className="text-3xl font-manrope font-bold text-tertiary">
          Erro: {error}
        </h1>
        {needsFlock && (
          <p className="mt-4 text-outline font-medium">Você precisa ter pelo menos um lote ativo para gerenciar a mortalidade.</p>
        )}
      </main>
    );
  }

  return <MortalidadeClient flock={flock} />;
}
