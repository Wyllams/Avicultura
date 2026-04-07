import { getFlockOverview } from "@/app/actions/lotes";
import { LoteDetalheClient } from "./LoteDetalheClient";

export default async function LoteDetalhePage({ params }: { params: { id: string } }) {
  const { flock, error } = await getFlockOverview(params.id);

  if (error || !flock) {
    return (
      <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in max-w-[1400px] mx-auto w-full">
        <h1 className="text-3xl font-manrope font-bold text-tertiary">Erro: {error || "Lote não encontrado"}</h1>
      </main>
    )
  }

  return <LoteDetalheClient flock={flock} />;
}
