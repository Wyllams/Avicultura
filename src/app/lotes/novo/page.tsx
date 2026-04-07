export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAvailableBarns } from "@/app/actions/lotes";
import { getFarms } from "@/app/actions/farm";
import { FlockForm } from "../FlockForm";

export default async function LoteCreatePage() {
  const { barns, error } = await getAvailableBarns();
  const farms = await getFarms();
  
  if (error) {
    return (
      <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-manrope font-bold text-tertiary">Erro: {error}</h1>
      </main>
    )
  }

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col mb-8">
        <Link 
          href="/lotes" 
          className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm mb-4 group"
        >
          <ArrowLeft className="w-4 h-4" />
          VOLTAR
        </Link>
        <h1 className="text-3xl font-manrope font-bold text-[#1A5E35] tracking-tight mb-2">Criar Novo Lote (Alojamento)</h1>
        <p className="text-sm text-outline font-medium">Insira as informações técnicas para o alojamento de novas aves no sistema.</p>
      </div>

      <FlockForm availableBarns={barns || []} allFarms={farms || []} />
    </main>
  );
}
