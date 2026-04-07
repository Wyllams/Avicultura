export const dynamic = "force-dynamic";

import { getFlocks } from "@/app/actions/lotes";
import { LotesClient } from "./LotesClient";

export default async function LotesListPage() {
  const { flocks, error } = await getFlocks();

  if (error) {
    return (
      <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-manrope font-bold text-tertiary">Erro ao buscar lotes: {error}</h1>
      </main>
    );
  }

  return <LotesClient initialData={flocks || []} />;
}
