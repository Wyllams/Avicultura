export const dynamic = "force-dynamic";

import Link from "next/link";
import { FarmForm } from "../../FarmForm";
import { getFarmDetails } from "@/app/actions/farm";
import { notFound } from "next/navigation";

export default async function EditarGranjaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const farm = await getFarmDetails(id);

  if (!farm) {
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
        <Link href={`/granjas/${farm.id}`} className="hover:text-[#1A5E35] transition-colors uppercase">{farm.name}</Link>
        <span className="text-surface-container-highest">•</span>
        <span className="text-[#1A5E35]">EDITAR</span>
      </div>

      <header className="mb-8 border-b border-outline-variant/30 pb-6">
        <h1 className="text-4xl font-manrope font-bold text-[#1A5E35] tracking-tight">Editar Granja</h1>
        <p className="text-sm text-on-surface-variant font-medium mt-2">
          Atualize os dados de infraestrutura e localização desta granja.
        </p>
      </header>

      <section>
        <FarmForm 
          farmId={farm.id}
          initialData={{
            name: farm.name,
            city: farm.city || "",
            state: farm.state || "",
            status: farm.status
          }}
        />
      </section>
    </main>
  );
}
