import Link from "next/link";
import { 
  Download, 
  Pencil, 
  Hash, 
  Leaf, 
  CalendarDays,
  TrendingUp,
  Home,
  Wrench,
  History,
  ChevronLeft,
  ChevronRight,
  PackagePlus,
  Scale,
  Package
} from "lucide-react";
import { getBarnDetails, getFarmDetails } from "@/app/actions/farm";
import { notFound } from "next/navigation";

export default async function GalpaoDetalhePage({ params }: { params: Promise<{ id: string, galpaoId: string }> }) {
  const { id: farmId, galpaoId: barnId } = await params;

  const [barn, farm] = await Promise.all([
    getBarnDetails(barnId),
    getFarmDetails(farmId)
  ]);

  if (!barn || !farm || barn.farmId !== farmId) {
    notFound();
  }

  // Active flock
  const activeFlock = barn.flocks?.find((f) => f.status === "ACTIVE");

  // Mock data para o histórico // TODO: Connect to real flock history if available
  const historico = barn.flocks?.filter(f => f.status !== "ACTIVE").slice(0, 4) || [];
  
  const today = new Date();
  
  let flockAgeDays = 0;
  if(activeFlock) {
     const housing = new Date(activeFlock.housingDate);
     flockAgeDays = Math.floor((today.getTime() - housing.getTime()) / (1000 * 60 * 60 * 24));
     if(flockAgeDays < 0) flockAgeDays = 0;
  }

  const capacityPct = barn.capacity > 0 && activeFlock ? Math.round(((activeFlock.housedBirds || 0) / barn.capacity) * 100) : 0;

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 flex flex-col font-inter">
      
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] font-bold text-outline uppercase tracking-widest mb-6">
        <span>INÍCIO</span>
        <span className="text-surface-container-highest">•</span>
        <Link href="/granjas" className="hover:text-[#1A5E35] transition-colors">GRANJAS</Link>
        <span className="text-surface-container-highest">•</span>
        <Link href={`/granjas/${farmId}`} className="hover:text-[#1A5E35] transition-colors uppercase">{farm.name}</Link>
        <span className="text-surface-container-highest">•</span>
        <span className="text-[#1A5E35] uppercase">{barn.name}</span>
      </div>

      {/* Header */}
      <header className="mb-8 border-b border-outline-variant/30 pb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-manrope font-bold text-[#1A5E35] tracking-tight">{barn.name}</h1>
            <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                          barn.status === 'EM_OPERACAO' 
                            ? 'bg-[#e8f5e9] text-[#2e7d32]' 
                            : 'bg-[#ffebee] text-[#c62828]'
                        }`}>
              {barn.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-sm text-outline font-medium">Informações detalhadas da infraestrutura e lote atual.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center justify-center gap-2 bg-[#f0f4f1] text-[#1A5E35] px-5 py-3 rounded-xl font-bold hover:bg-[#e2ebe4] transition-colors shadow-sm">
            <Download className="w-5 h-5"/> Exportar Dados
          </button>
          <Link href={`/granjas/${farmId}/galpoes/${barn.id}/editar`} className="flex items-center justify-center gap-2 bg-[#0D2E1A] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#1A5E35] transition-colors shadow-sm">
            <Pencil className="w-5 h-5"/> Editar Galpão
          </Link>
        </div>
      </header>

      {/* KPIs Lote Atual */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        <div className="bg-white rounded-2xl p-6 border-l-4 border-l-[#1A5E35] shadow-sm border-t border-b border-r border-outline-variant/30 flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <p className="text-[10px] items-center font-bold text-outline uppercase tracking-wider">ID DO LOTE ATUAL</p>
             <Hash className="w-4 h-4 text-outline/50" />
          </div>
          <p className="text-2xl font-bold text-foreground font-manrope mb-1 truncate">{activeFlock ? activeFlock.name || activeFlock.id.substring(0,8).toUpperCase() : "N/A"}</p>
          <p className="text-[11px] font-medium text-outline">
            {activeFlock ? `Iniciado em ${new Date(activeFlock.housingDate).toLocaleDateString("pt-BR")}` : "Sem lote alojado"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border-l-4 border-l-[#1A5E35] shadow-sm border-t border-b border-r border-outline-variant/30 flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <p className="text-[10px] font-bold text-outline uppercase tracking-wider">AVES NO GALPÃO</p>
             <Leaf className="w-4 h-4 text-[#81c784]" />
          </div>
          <p className="text-2xl font-bold text-foreground font-manrope mb-1">{activeFlock ? activeFlock.housedBirds?.toLocaleString() : "0"}</p>
          <p className="text-[11px] font-bold text-[#1A5E35]">{capacityPct}% da Capacidade Total</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border-l-4 border-l-[#1A5E35] shadow-sm border-t border-b border-r border-outline-variant/30 flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <p className="text-[10px] font-bold text-outline uppercase tracking-wider">IDADE DO LOTE</p>
             <CalendarDays className="w-4 h-4 text-outline/50" />
          </div>
          <p className="text-2xl font-bold text-foreground font-manrope mb-1">{activeFlock ? `${flockAgeDays} dias` : "0 dias"}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border-l-4 border-l-[#c62828] shadow-sm border-t border-b border-r border-outline-variant/30 flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <p className="text-[10px] font-bold text-outline uppercase tracking-wider">MORTALIDADE ATUAL</p>
             <TrendingUp className="w-4 h-4 text-[#e57373]" />
          </div>
          <p className="text-2xl font-bold text-foreground font-manrope mb-1">0%</p> {/* Mock placeholder, requires querying Mortality log directly for exact barn flock */}
          <p className="text-[11px] font-bold text-[#c62828]">Sem registro hoje</p>
        </div>

      </div>

      {/* Main Content Grid 1/3 e 2/3 */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_2fr] gap-6 mb-8">
        
        {/* Left Column (Especificações Físicas) */}
        <section className="bg-white rounded-3xl overflow-hidden shadow-sm border border-outline-variant/30 flex flex-col">
           {/* Green Header */}
           <div className="bg-[#1A5E35] p-6 flex items-center gap-3">
             <Home className="w-5 h-5 text-white" />
             <h2 className="text-lg font-bold text-white font-manrope">Especificações Físicas</h2>
           </div>
           
           {/* Info Body */}
           <div className="p-8 pb-6 flex flex-col flex-1">
             <div className="grid grid-cols-2 gap-y-8 mb-8">
                <div>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">DIMENSÕES</p>
                  <p className="text-sm font-bold text-foreground">N/A</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">ÁREA TOTAL</p>
                  <p className="text-sm font-bold text-foreground">{barn.area} m²</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">TIPO DE VENTILAÇÃO</p>
                  <p className="text-sm font-bold text-foreground pr-4">N/A</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">CAPACIDADE MÁXIMA</p>
                  <p className="text-sm font-bold text-[#1A5E35]">{barn.capacity} aves</p>
                </div>
             </div>

             <div className="bg-surface-container rounded-2xl p-6 flex items-center gap-4 mb-8 mt-auto">
               <Wrench className="w-6 h-6 text-[#1A5E35]" />
               <div>
                 <p className="text-[10px] font-bold text-outline uppercase tracking-wider">ÚLTIMA MANUTENÇÃO</p>
                 <p className="text-sm font-bold text-foreground mt-1">Registrada no sistema</p>
               </div>
             </div>
           </div>
        </section>

        {/* Right Column (Histórico de Lotes) */}
        <section className="bg-white rounded-3xl p-8 border border-outline-variant/30 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-outline" />
              <h2 className="text-lg font-bold text-foreground font-manrope">Histórico de Lotes</h2>
            </div>
            <button className="text-sm font-bold text-[#1A5E35] hover:opacity-80 transition-opacity">Ver tudo</button>
          </div>

          <table className="w-full text-left mb-6 flex-1">
            <thead>
              <tr className="border-b border-surface-container-high">
                <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-wider">ID LOTE</th>
                <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-wider text-center">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {historico.length === 0 && (
                 <tr>
                    <td colSpan={2} className="py-8 text-center text-outline text-sm">Nenhum lote finalizado.</td>
                 </tr>
              )}
              {historico.map((lote:any, idx:number) => (
                <tr key={idx} className="border-b border-surface-container-low last:border-0 hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="py-5 font-bold text-foreground text-sm max-w-[80px] break-words leading-tight uppercase">{lote.name || lote.id.substring(0,8)}</td>
                  <td className="py-5 text-center">
                    <span className="px-2.5 py-1 bg-surface-container-high text-outline rounded-[4px] text-[9px] font-bold uppercase tracking-widest">
                      {lote.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Table Footer */}
          <div className="flex items-center justify-between border-t border-surface-container-low pt-6 mt-auto">
            <span className="text-xs font-medium text-outline">Exibindo os últimos 4 lotes finalizados neste galpão.</span>
            <div className="flex items-center gap-1">
              <button className="p-1.5 outline outline-1 outline-surface-container-highest rounded-md hover:bg-surface-container text-outline transition-colors disabled:opacity-50">
                <ChevronLeft className="w-4 h-4"/>
              </button>
              <button className="p-1.5 outline outline-1 outline-surface-container-highest rounded-md hover:bg-surface-container text-outline transition-colors disabled:opacity-50">
                <ChevronRight className="w-4 h-4"/>
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* Quick Actions Footer Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <button className="group bg-white rounded-3xl p-6 border border-outline-variant/30 flex items-center gap-5 hover:border-[#1A5E35]/30 hover:shadow-md transition-all text-left">
          <div className="w-14 h-14 rounded-2xl bg-[#e8f5e9] flex items-center justify-center shrink-0 group-hover:bg-[#1A5E35] transition-colors">
            <PackagePlus className="w-6 h-6 text-[#1A5E35] group-hover:text-white transition-colors" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">Lançar Mortalidade</h3>
            <p className="text-[11px] text-outline font-medium">Registrar baixas do dia</p>
          </div>
        </button>

        <button className="group bg-white rounded-3xl p-6 border border-outline-variant/30 flex items-center gap-5 hover:border-[#1A5E35]/30 hover:shadow-md transition-all text-left">
          <div className="w-14 h-14 rounded-2xl bg-[#e8f5e9] flex items-center justify-center shrink-0 group-hover:bg-[#1A5E35] transition-colors">
            <Scale className="w-6 h-6 text-[#1A5E35] group-hover:text-white transition-colors" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">Pesar Aves</h3>
            <p className="text-[11px] text-outline font-medium">Lançar amostragem de peso</p>
          </div>
        </button>

        <button className="group bg-white rounded-3xl p-6 border border-outline-variant/30 flex items-center gap-5 hover:border-[#1A5E35]/30 hover:shadow-md transition-all text-left">
          <div className="w-14 h-14 rounded-2xl bg-[#e8f5e9] flex items-center justify-center shrink-0 group-hover:bg-[#1A5E35] transition-colors">
            <Package className="w-6 h-6 text-[#1A5E35] group-hover:text-white transition-colors" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">Estoque de Ração</h3>
            <p className="text-[11px] text-outline font-medium">Conferir silos do galpão</p>
          </div>
        </button>

      </div>

    </main>
  );
}
