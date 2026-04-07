export const dynamic = "force-dynamic";

import { getActiveFlocks } from "@/app/actions/mortalidade";
import { MortalidadeForm } from "./MortalidadeForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const revalidate = 0;

export default async function NovoRegistroMortalidadePage({
  searchParams,
}: {
  searchParams: { loteId?: string };
}) {
  const { flocks, error } = await getActiveFlocks();

  if (error) {
    return (
      <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in max-w-[1400px] mx-auto w-full">
        <h1 className="text-3xl font-manrope font-bold text-tertiary">Erro ao buscar lotes ativos</h1>
        <p className="mt-4 text-outline font-medium">{error}</p>
      </main>
    );
  }

  if (!flocks || flocks.length === 0) {
    return (
      <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in max-w-[1400px] mx-auto w-full">
         <div className="mb-8">
           <Link href="/mortalidade">
             <button className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm mb-4 group">
               <ArrowLeft className="w-4 h-4" /> VOLTAR
             </button>
           </Link>
         </div>
        <h1 className="text-3xl font-manrope font-bold text-tertiary">Nenhum lote ativo</h1>
        <p className="mt-4 text-outline font-medium">Você precisa ter pelo menos um lote ativo para registrar mortalidade.</p>
      </main>
    );
  }

  // Se tiver um loteId na URL e ele existir nos ativos, usamos ele como inicial, senão o primeiro da lista.
  let initialFlockId = flocks[0].id;
  if(searchParams.loteId && flocks.find(f => f.id === searchParams.loteId)) {
     initialFlockId = searchParams.loteId;
  }

  return <MortalidadeForm activeFlocks={flocks} initialFlockId={initialFlockId} />;
}
