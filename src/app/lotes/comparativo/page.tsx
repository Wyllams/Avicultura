import { getTopComparisons } from "@/app/actions/lotes";
import { ComparativoLotesClient } from "./ComparativoLotesClient";

export default async function ComparativoLotesPage() {
  const { flocks, error } = await getTopComparisons();

  if (error) {
    return (
      <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-manrope font-bold text-tertiary">Erro: {error}</h1>
      </main>
    )
  }

  return <ComparativoLotesClient topFlocks={flocks || []} />;
}
