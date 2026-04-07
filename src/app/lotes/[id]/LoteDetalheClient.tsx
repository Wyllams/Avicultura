"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft,
  Scale,
  HeartPulse,
  XSquare,
  Bell,
  LineChart as LineIcon,
  CheckCircle2,
  TrendingUp,
  Droplet
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const realData = payload.find((p) => p.dataKey === 'real');
    
    if(!realData) return null;

    return (
      <div className="bg-[#1A5E35] text-white p-4 rounded-xl shadow-xl flex flex-col gap-2 min-w-[150px]">
        <p className="font-bold text-sm mb-1">{label} (Pesagem)</p>
        <div className="flex justify-between items-center text-xs">
           <span className="opacity-80">Peso:</span>
           <span className="font-bold text-[#81c784]">{realData.value.toLocaleString('pt-BR')}g</span>
        </div>
      </div>
    );
  }
  return null;
};

export function LoteDetalheClient({ flock }: { flock: any }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Vacinações");

  // Calcs
  const now = new Date();
  const housedDate = new Date(flock.housingDate);
  const end = flock.slaughterDate ? new Date(flock.slaughterDate) : now;
  const timeDiff = end.getTime() - housedDate.getTime();
  const ageDays = Math.max(1, Math.floor(timeDiff / (1000 * 3600 * 24)));

  let mortalityTotal = 0;
  flock.mortalityLogs?.forEach((m: any) => mortalityTotal += m.quantity);

  let feedTotal = 0;
  flock.feedLogs?.forEach((f: any) => feedTotal += f.quantityKg);

  const pesos = (flock.weightLogs || []).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pesoAtualG = pesos.length > 0 ? pesos[pesos.length - 1].averageWeight : 0;
  const pesoAtualKg = pesoAtualG / 1000;

  const vivos = flock.housedBirds - mortalityTotal;
  const viabilidade = (vivos / flock.housedBirds) * 100;
  const mortalidadePercent = (mortalityTotal / flock.housedBirds) * 100;
  const ganhoTotalKg = vivos * pesoAtualKg;
  const ca = ganhoTotalKg > 0 ? (feedTotal / ganhoTotalKg) : 0;
  const gpd = (pesoAtualG / ageDays) || 0;
  
  const ip = (ca > 0 && ageDays > 0) ? (viabilidade * pesoAtualKg / (ageDays * ca) * 100) : 0;

  // Chart Data preparation
  const chartData = pesos.map((w: any) => {
      const wDate = new Date(w.date);
      const dDiff = wDate.getTime() - housedDate.getTime();
      const wDays = Math.max(1, Math.floor(dDiff / (1000 * 3600 * 24)));
      return {
          name: `DIA ${wDays}`,
          real: w.averageWeight
      }
  });

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col">
      <header className="flex items-center justify-between mb-8 pb-4 border-b border-surface-container-high">
         <div className="flex items-center gap-6">
            <button 
               onClick={() => router.push('/lotes')} 
               className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-outline transition-colors"
            >
               <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
               <div className="flex items-center gap-4 mb-1">
                  <h1 className="text-3xl font-manrope font-bold text-[#1A5E35]">{flock.name}</h1>
                  <span className={`px-3 py-1 ${flock.status === 'CLOSED' ? 'bg-[#ffebee] text-[#c62828]' : 'bg-[#e8f5e9] text-[#1A5E35]'} text-[10px] font-bold uppercase tracking-widest rounded-full`}>
                     {flock.status === "CLOSED" ? "ENCERRADO" : `DIA ${ageDays} - ATIVO`}
                  </span>
               </div>
               <p className="text-sm font-medium text-outline">{flock.barn.farm.name} - {flock.barn.name}</p>
            </div>
         </div>

         {flock.status === "ACTIVE" && (
            <div className="flex flex-wrap items-center gap-3">
               <Link href={`/pesagens`}>
                  <button className="flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-container-high text-[#1A5E35] text-sm font-bold rounded-lg transition-colors">
                     <Scale className="w-4 h-4" /> Pesar Aves
                  </button>
               </Link>
               <Link href={`/mortalidade`}>
                  <button className="flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-container-high text-[#1A5E35] text-sm font-bold rounded-lg transition-colors">
                     <HeartPulse className="w-4 h-4" /> Mortalidade
                  </button>
               </Link>
               <Link href={`/lotes/${flock.id}/encerrar`}>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-lg transition-colors shadow-sm ml-2">
                     <XSquare className="w-4 h-4" /> Encerrar Lote
                  </button>
               </Link>
            </div>
         )}
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8 h-auto xl:h-[420px]">
         <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-5 border border-outline-variant/30 flex-1 flex flex-col justify-center">
               <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">ÍNDICE PRODUTIVO (IP)</p>
               <div className="flex items-center gap-3">
                  <p className="text-4xl font-bold font-manrope text-[#1A5E35]">{ip.toFixed(1)}</p>
               </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-outline-variant/30 flex-1 flex flex-col justify-center">
               <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">CONVERSÃO ALIMENTAR (CA)</p>
               <div className="flex items-center gap-3">
                  <p className="text-4xl font-bold font-manrope text-foreground">{ca > 0 ? ca.toFixed(3) : '-'}</p>
               </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-outline-variant/30 flex-1 flex flex-col justify-center">
               <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">VIABILIDADE</p>
               <p className="text-4xl font-bold font-manrope text-foreground mb-3">{viabilidade.toFixed(1)}%</p>
               <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-[#1A5E35]" style={{ width: `${viabilidade}%` }} />
               </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-outline-variant/30 flex-1 flex flex-col justify-center">
               <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">GANHO PESO DIÁRIO (GPD)</p>
               <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold font-manrope text-foreground">{gpd.toFixed(1)}g</p>
               </div>
            </div>
         </div>

         <div className="xl:col-span-2 bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
               <div>
                  <h2 className="text-lg font-bold font-manrope text-foreground">Curva de Crescimento</h2>
                  <p className="text-xs font-medium text-outline">Peso registrado da linhagem ({flock.breed})</p>
               </div>
            </div>
            
            <div className="flex-1 w-full min-h-[300px]">
              {chartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#757575' }} dy={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#757575' }} />
                       <Tooltip content={<CustomTooltip />} />
                       <Line type="monotone" dataKey="real" stroke="#1A5E35" strokeWidth={4} dot={{ r: 4, fill: '#1A5E35', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#e8f5e9', stroke: '#1A5E35', strokeWidth: 3 }} />
                    </LineChart>
                 </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-outline text-sm font-medium">Nenhuma pesagem lançada para gerar a curva.</div>
              )}
            </div>
         </div>

         <div className="flex flex-col gap-6">
            <div className="bg-white rounded-3xl p-6 border border-outline-variant/30 flex-1 flex flex-col relative overflow-hidden">
               <div className="flex items-center justify-between mb-8 z-10">
                  <h3 className="text-xs font-bold text-outline uppercase tracking-wider">MORTALIDADE<br/>ACUM.</h3>
                  <div className="w-8 h-8 rounded-lg bg-[#e8f5e9] flex items-center justify-center">
                     <LineIcon className="w-4 h-4 text-[#1A5E35]" />
                  </div>
               </div>
               
               <div className="flex items-center gap-6 mt-auto z-10">
                  <div className="relative w-16 h-16 rounded-full border-4 border-surface-container flex items-center justify-center bg-white shadow-inner">
                     <span className="text-sm font-bold text-[#c62828]">{mortalidadePercent.toFixed(1)}%</span>
                  </div>
                  
                  <div>
                     <p className="text-3xl font-manrope font-bold text-foreground">{mortalityTotal}</p>
                     <p className="text-[10px] font-bold text-outline mb-2">aves mortas</p>
                  </div>
               </div>
            </div>

            <div className="bg-[#1A5E35] rounded-3xl p-6 text-white flex-1 flex flex-col justify-between shadow-md relative overflow-hidden">
               <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
               <div>
                  <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-6">CONSUMO DE RAÇÃO</h3>
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">ACUMULADO TOTAL</p>
                  <p className="text-3xl font-bold font-manrope border-b border-white/20 pb-4 mb-4">{(feedTotal/1000).toFixed(2)} ton</p>
               </div>
            </div>
         </div>
      </div>
    </main>
  );
}
