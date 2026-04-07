export const dynamic = "force-dynamic";

import Link from "next/link";
import { BarnForm } from "../BarnForm";

export default async function NovoGalpaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: farmId } = await params;

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
        <span className="text-[#1A5E35]">NOVO GALPÃO</span>
      </div>

      <header className="mb-8 border-b border-outline-variant/30 pb-6">
        <h1 className="text-4xl font-manrope font-bold text-[#1A5E35] tracking-tight">Novo Galpão</h1>
        <p className="text-sm text-on-surface-variant font-medium mt-2">
          Adicione uma nova instalação avícola a esta unidade.
        </p>
      </header>

      <section>
        <BarnForm farmId={farmId} />
      </section>
    </main>
  );
}
