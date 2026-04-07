import Link from "next/link";
import { FarmForm } from "../FarmForm";

export default function NovaGranjaPage() {
  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 flex flex-col font-inter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] font-bold text-outline uppercase tracking-widest mb-4">
        <span>INÍCIO</span>
        <span className="text-surface-container-highest">•</span>
        <Link href="/granjas" className="hover:text-[#1A5E35] transition-colors">GRANJAS</Link>
        <span className="text-surface-container-highest">•</span>
        <span className="text-[#1A5E35]">NOVA GRANJA</span>
      </div>

      <header className="mb-8 border-b border-outline-variant/30 pb-6">
        <h1 className="text-4xl font-manrope font-bold text-[#1A5E35] tracking-tight">Nova Granja</h1>
        <p className="text-sm text-on-surface-variant font-medium mt-2">
          Cadastre uma nova unidade de produção para sua empresa.
        </p>
      </header>

      <section>
        <FarmForm />
      </section>
    </main>
  );
}
