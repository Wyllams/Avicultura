export const dynamic = "force-dynamic";

import Link from "next/link";
import { BarnForm } from "../../BarnForm";
import { getBarnDetails, getFarmDetails } from "@/app/actions/farm";
import { notFound } from "next/navigation";

export default async function EditarGalpaoPage({ params }: { params: Promise<{ id: string, galpaoId: string }> }) {
  const { id: farmId, galpaoId: barnId } = await params;

  const barn = await getBarnDetails(barnId);

  if (!barn || barn.farmId !== farmId) {
    notFound();
  }

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 flex flex-col font-inter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] font-bold text-outline uppercase tracking-widest mb-4">
        <span>INÍCIO</span>
        <span className="text-surface-container-highest">•</span>
        <Link href="/granjas" className="hover:text-[#1A5E35] transition-colors">GRANJAS</Link>
        <span className="text-surface-container-highest">•</span>
        <Link href={`/granjas/${farmId}`} className="hover:text-[#1A5E35] transition-colors">DETALHES DA GRANJA</Link>
        <span className="text-surface-container-highest">•</span>
        <Link href={`/granjas/${farmId}/galpoes/${barn.id}`} className="hover:text-[#1A5E35] transition-colors uppercase">{barn.name}</Link>
        <span className="text-surface-container-highest">•</span>
        <span className="text-[#1A5E35]">EDITAR</span>
      </div>

      <header className="mb-8 border-b border-outline-variant/30 pb-6">
        <h1 className="text-4xl font-manrope font-bold text-[#1A5E35] tracking-tight">Editar Galpão</h1>
        <p className="text-sm text-on-surface-variant font-medium mt-2">
          Atualize os dados de infraestrutura e viabilidade deste galpão.
        </p>
      </header>

      <section>
        <BarnForm 
          farmId={farmId}
          barnId={barn.id}
          initialData={{
             name: barn.name,
             area: barn.area,
             capacity: barn.capacity,
             status: barn.status
          }}
        />
      </section>
    </main>
  );
}
