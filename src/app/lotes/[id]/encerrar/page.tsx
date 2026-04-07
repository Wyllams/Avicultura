import { getFlockOverview, getFlockPreCloseStatus } from "@/app/actions/lotes";
import { EncerrarLoteClient } from "./EncerrarLoteClient";

export default async function EncerrarLotePage({ params }: { params: { id: string } }) {
  const [overview, preCloseStatus] = await Promise.all([
     getFlockOverview(params.id),
     getFlockPreCloseStatus(params.id)
  ]);

  if (overview.error || !overview.flock || !preCloseStatus || preCloseStatus.error) {
    return (
      <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-manrope font-bold text-tertiary">Erro: {overview.error || "Erro ao carregar dados do lote."}</h1>
      </main>
    )
  }

  // Cast preCloseStatus appropriately
  return <EncerrarLoteClient flock={overview.flock} preCloseStatus={preCloseStatus as any} />;
}
