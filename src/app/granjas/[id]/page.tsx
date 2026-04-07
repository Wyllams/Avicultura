export const dynamic = "force-dynamic";

import { 
  Printer, 
  TrendingUp, 
  CheckCircle2,
  Info,
  MapPin,
  ArrowLeft,
  AlertTriangle,
  Building2,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { getFarmDetails } from "@/app/actions/farm";
import { notFound } from "next/navigation";
import { PrintButton } from "./PrintButton";

export default async function GranjaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const farm = await getFarmDetails(id);

  if (!farm) {
    notFound();
  }

  // Calculate totals
  const galpoes = farm.barns || [];
  const activeBarnsCount = galpoes.filter((b: any) => b.status === "EM_OPERACAO").length;
  const inactiveBarnsCount = galpoes.filter((b: any) => b.status === "INATIVO" || b.status === "MANUTENCAO").length;
  
  let totalBirds = 0;
  let totalCapacity = 0;
  let activeFlockCount = 0;

  galpoes.forEach((barn: any) => {
    totalCapacity += barn.capacity || 0;
    barn.flocks?.forEach((flock: any) => {
      if (flock.status === "ACTIVE") {
        totalBirds += flock.housedBirds || 0;
        activeFlockCount++;
      }
    });
  });

  // Calculate real efficiency: capacity utilization
  const efficiencyPct = totalCapacity > 0 ? Math.round((totalBirds / totalCapacity) * 100) : 0;
  
  // Total area
  const totalAreaM2 = galpoes.reduce((sum: number, b: any) => sum + (b.area || 0), 0);

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 flex flex-col font-inter">
      


      {/* Header */}
      <header className="mb-8 border-b border-outline-variant/30">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/granjas"
              className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-outline" />
            </Link>
            <div>
              <h1 className="text-4xl font-manrope font-bold text-[#1A5E35] tracking-tight">{farm.name}</h1>
              <p className="text-sm text-outline font-medium mt-1">
                {farm.city ? `${farm.city}, ${farm.state}` : "Localização não informada"} · {galpoes.length} galpões
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <PrintButton />
          </div>
        </div>


      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-outline-variant/30 p-6 rounded-2xl shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1A5E35]"></div>
          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">AVES ALOJADAS</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-foreground font-manrope">{totalBirds.toLocaleString()}</p>
            {activeFlockCount > 0 && (
              <span className="text-xs font-medium text-outline">{activeFlockCount} lote{activeFlockCount > 1 ? "s" : ""} ativo{activeFlockCount > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
        <div className="bg-white border border-outline-variant/30 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">STATUS DA GRANJA</p>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${farm.status === 'ATIVO' ? 'bg-[#1A5E35]' : 'bg-[#c62828]'}`}></div>
            <p className={`text-2xl font-bold font-manrope ${farm.status === 'ATIVO' ? 'text-[#1A5E35]' : 'text-[#c62828]'}`}>
               {farm.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
            </p>
          </div>
        </div>
        <div className="bg-white border border-outline-variant/30 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">GALPÕES</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-foreground font-manrope">{galpoes.length}</p>
            <span className="text-xs font-medium text-outline">{activeBarnsCount} em operação</span>
          </div>
        </div>
        <div className="bg-[#e8f5e9] border border-[#a5d6a7]/50 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
          <p className="text-xs font-bold text-[#2e7d32] uppercase tracking-wider mb-2">STATUS SANITÁRIO</p>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-[#1A5E35]" fill="#a5d6a7" />
            <p className="text-2xl font-bold text-[#1A5E35] font-manrope">Regularizado</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid 65/35 */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 pb-8">
        
        {/* Left Column (Info / Galpões) */}
        <div className="flex flex-col gap-6">
          
          {/* Informações Gerais */}
          <section className="bg-white rounded-3xl p-8 border border-outline-variant/30 shadow-sm relative">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-[#1A5E35] font-manrope">Informações Gerais</h2>
              <Info className="w-5 h-5 text-outline shrink-0" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Details */}
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">LOCALIZAÇÃO</p>
                  <p className="text-sm text-foreground font-medium pr-4 leading-relaxed">
                    {farm.city ? `${farm.city}, ` : ''}{farm.state || 'Localização não preenchida'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">ÁREA TOTAL COBERTA</p>
                  <p className="text-sm text-foreground font-medium">{totalAreaM2.toLocaleString()} m²</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">CAPACIDADE TOTAL</p>
                  <p className="text-sm text-foreground font-medium">{totalCapacity.toLocaleString()} aves</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">ID DO SISTEMA</p>
                  <p className="text-sm text-foreground font-medium truncate" title={farm.id}>{farm.id.split('-')[0]}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">STATUS</p>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    farm.status === 'ATIVO' 
                      ? 'bg-[#e8f5e9] text-[#2e7d32]' 
                      : 'bg-[#ffebee] text-[#c62828]'
                  }`}>
                    {farm.status}
                  </span>
                </div>
              </div>
              
              {/* Placeholder MAP Image */}
              <div className="bg-surface-container rounded-2xl overflow-hidden relative h-40 md:h-auto border border-outline-variant/50 flex items-center justify-center grayscale opacity-80 min-h-[160px]">
                <img 
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=400&h=200&fit=crop" 
                  alt="Mapa" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-[#f8f9fa]/50 backdrop-blur-[2px]"></div>
                <div className="relative z-10 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center translate-y-4 translate-x-8">
                  <MapPin className="w-4 h-4 text-[#1A5E35]" fill="#1A5E35" />
                </div>
              </div>
            </div>
          </section>

          {/* Lista de Galpões */}
          <section className="bg-white rounded-3xl p-8 border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#1A5E35] font-manrope">Galpões ({galpoes.length})</h2>

            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-surface-container-high">
                    <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-wider">NOME</th>
                    <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-wider">ÁREA</th>
                    <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-wider">CAPACIDADE</th>
                    <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-wider">LOTE ATIVO</th>
                    <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-wider">STATUS</th>
                    <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-wider w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {galpoes.length === 0 && (
                     <tr>
                        <td colSpan={6} className="py-8 text-center text-outline text-sm">Nenhum galpão registrado nesta granja.</td>
                     </tr>
                  )}
                  {galpoes.map((galpao: any) => {
                    const activeFlock = galpao.flocks?.find((f: any) => f.status === 'ACTIVE');
                    
                    return (
                    <tr key={galpao.id} className="border-b border-surface-container-low last:border-0 hover:bg-surface-container-lowest/50 transition-colors group">
                      <td className="py-4">
                        <Link href={`/granjas/${farm.id}/galpoes/${galpao.id}`} className="flex items-center gap-3 group/link">
                          <div className="w-9 h-9 rounded-lg bg-[#e8f5e9] flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-[#1A5E35]" />
                          </div>
                          <span className="font-bold text-[#1A5E35] text-sm group-hover/link:underline">{galpao.name}</span>
                        </Link>
                      </td>
                      <td className="py-4 text-sm font-medium text-foreground">
                        {galpao.area} m²
                      </td>
                      <td className="py-4 text-sm font-medium text-foreground">
                        {galpao.capacity?.toLocaleString()} <span className="text-outline font-normal text-xs">aves</span>
                      </td>
                      <td className="py-4 text-sm font-medium text-foreground">
                        {activeFlock 
                          ? <span className="px-2 py-1 bg-[#e8f5e9] text-[#1A5E35] rounded-md text-xs font-bold">{activeFlock.name}</span> 
                          : <span className="text-outline text-xs">Sem lote</span>
                        }
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          galpao.status === 'EM_OPERACAO' 
                            ? 'bg-[#e8f5e9] text-[#2e7d32]' 
                            : galpao.status === 'MANUTENCAO'
                              ? 'bg-[#fff3e0] text-[#e65100]'
                              : 'bg-[#ffebee] text-[#c62828]'
                        }`}>
                          {galpao.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-4">
                        <Link href={`/granjas/${farm.id}/galpoes/${galpao.id}`} className="text-outline hover:text-[#1A5E35] transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </section>

        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Eficiência Card */}
          <section className="bg-[#1A5E35] rounded-3xl p-8 shadow-sm text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[#0D2E1A]/20"></div>
            <div className="absolute bottom-0 right-0 w-3/4 h-24 opacity-20 pointer-events-none flex items-end">
               <TrendingUp className="w-full h-full text-white mix-blend-overlay stroke-[1px] translate-y-4" />
            </div>

            <div className="relative z-10">
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-6">OCUPAÇÃO DA GRANJA</p>
              
              <div className="flex items-end justify-between mb-2">
                <div className="w-[70%] h-2 bg-white/20 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min(efficiencyPct, 100)}%` }}></div>
                </div>
                <span className="text-3xl font-manrope font-bold">{efficiencyPct}%</span>
              </div>
              
              <p className="text-xs text-white/80 leading-relaxed font-medium mt-4">
                {totalBirds > 0 
                  ? `${totalBirds.toLocaleString()} aves alojadas de ${totalCapacity.toLocaleString()} de capacidade total.`
                  : 'Nenhuma ave alojada no momento nesta granja.'
                }
              </p>
            </div>
          </section>

          {/* Quick Stats */}
          <section className="bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-sm">
            <h3 className="text-sm font-bold text-outline uppercase tracking-wider mb-4">Resumo Rápido</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-surface-container-low last:border-0">
                <span className="text-sm text-outline font-medium">Galpões Ativos</span>
                <span className="text-sm font-bold text-[#1A5E35]">{activeBarnsCount}</span>
              </div>
              {inactiveBarnsCount > 0 && (
                <div className="flex items-center justify-between py-2 border-b border-surface-container-low">
                  <span className="text-sm text-outline font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#e65100]" />
                    Inativos / Manutenção
                  </span>
                  <span className="text-sm font-bold text-[#e65100]">{inactiveBarnsCount}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-surface-container-low">
                <span className="text-sm text-outline font-medium">Lotes Ativos</span>
                <span className="text-sm font-bold text-foreground">{activeFlockCount}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-surface-container-low">
                <span className="text-sm text-outline font-medium">Área Total</span>
                <span className="text-sm font-bold text-foreground">{totalAreaM2.toLocaleString()} m²</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-outline font-medium">Capacidade Total</span>
                <span className="text-sm font-bold text-foreground">{totalCapacity.toLocaleString()}</span>
              </div>
            </div>
          </section>


        </div>

      </div>

    </main>
  );
}
