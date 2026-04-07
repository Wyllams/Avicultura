"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

const strokeColors = ["#1A5E35", "#757575", "#c62828", "#f57c00"];

export function ComparativoLotesClient({ topFlocks }: { topFlocks: any[] }) {
  const router = useRouter();

  // Sort topFlocks by ID just for deterministic comparison lines or by IP
  const sortedFlocks = [...topFlocks].sort((a, b) => b.ip - a.ip);
  const bestFlock = sortedFlocks[0];

  // Prepare chart data for GPD or Weights
  // We need a common X-Axis over days (e.g. 7, 14, 21, 28, 35, 42)
  const chartData = useMemo(() => {
    const daysMap = new Map<number, any>();
    
    topFlocks.forEach((flock, index) => {
       const housed = new Date(flock.housingDate).getTime();
       const idLabel = `lote${index}`;

       flock.weightLogs?.forEach((wLog: any) => {
          const logTime = new Date(wLog.date).getTime();
          const day = Math.floor((logTime - housed) / (1000 * 3600 * 24));
          
          // Group by weeks roughly, or just push real days
          const bucket = Math.round(day / 7) * 7 || 1; // 1, 7, 14, 21...
          
          if (!daysMap.has(bucket)) {
             daysMap.set(bucket, { name: `DIA ${bucket.toString().padStart(2, '0')}` });
          }
          
          const obj = daysMap.get(bucket);
          // GPD is weight / day
          obj[idLabel] = bucket > 0 ? Math.round(wLog.averageWeight / bucket) : 0;
       });
    });

    return Array.from(daysMap.values()).sort((a, b) => 
       parseInt(a.name.replace('DIA ', '')) - parseInt(b.name.replace('DIA ', ''))
    );
  }, [topFlocks]);

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between pb-4 border-b border-surface-container-high/50">
         <div className="flex items-center gap-4">
            <button 
               onClick={() => router.back()} 
               className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline transition-colors"
            >
               <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-sm font-bold text-[#1A5E35]">Comparativo de Lotes (Fechados)</h1>
         </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
         <div className="flex items-center gap-6 bg-white p-2 rounded-xl shadow-sm border border-outline-variant/30 text-[11px] font-bold text-outline">
            <div className="flex items-center gap-2 px-3">
               <span className="uppercase tracking-widest opacity-70">ÚLTIMOS {topFlocks.length} LOTES ENCERRADOS</span>
            </div>
         </div>
      </div>

      {topFlocks.length === 0 ? (
         <div className="p-8 text-center text-outline bg-surface-container rounded-2xl">
            Nenhum lote encerrado encontrado para comparação.
         </div>
      ) : (
         <>
         <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="bg-[#1A5E35] rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-lg">
               <div>
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest mb-6">
                     <span className="w-2 h-2 rounded-full bg-[#81c784]" /> Melhor Performance
                  </div>
                  <h2 className="text-4xl font-extrabold font-manrope mb-1">{bestFlock.name}</h2>
                  <p className="text-xs font-medium text-white/70">Linhagem {bestFlock.breed}</p>
               </div>

               <div className="relative z-10 space-y-5 mt-12">
                  <div>
                     <p className="text-[10px] uppercase tracking-widest text-[#a5d6a7] font-bold mb-1">ÍNDICE DE PRODUÇÃO (IP)</p>
                     <div className="flex items-end justify-between">
                        <p className="text-5xl font-bold font-manrope leading-none">{bestFlock.ip || 0}</p>
                     </div>
                  </div>
                  <div className="pt-5 border-t border-white/20">
                     <p className="text-[10px] uppercase tracking-widest text-[#a5d6a7] font-bold mb-1">CONVERSÃO ALIMENTAR</p>
                     <div className="flex items-end justify-between">
                        <p className="text-3xl font-bold font-manrope leading-none">{bestFlock.ca || 0}</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="xl:col-span-2 bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-sm flex flex-col">
               <div className="flex items-start justify-between mb-8">
                  <div>
                     <h3 className="text-lg font-bold text-foreground">Evolução do GPD (g/dia)</h3>
                     <p className="text-xs font-medium text-outline">Comparativo entre os lotes carregados</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                     {topFlocks.map((f, i) => (
                        <div key={f.id} className="flex items-center gap-1.5 text-foreground">
                           <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: strokeColors[i % strokeColors.length]}} /> {f.name}
                        </div>
                     ))}
                  </div>
               </div>
               
               <div className="flex-1 w-full min-h-[250px]">
                  {chartData.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9E9E9E' }} style={{ fontWeight: 700 }} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9E9E9E' }} style={{ fontWeight: 600 }} />
                           <Tooltip />
                           {topFlocks.map((f, i) => (
                              <Line key={f.id} type="monotone" dataKey={`lote${i}`} stroke={strokeColors[i % strokeColors.length]} strokeWidth={i===0?3:2} dot={false} strokeDasharray={i > 0 ? "5 5" : ""} />
                           ))}
                        </LineChart>
                     </ResponsiveContainer>
                  ) : (
                     <div className="w-full h-full flex justify-center items-center text-sm font-medium text-outline">Sem histórico de pesos para exibir curvas.</div>
                  )}
               </div>
            </div>
         </div>

         <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-8 pb-4 mt-6">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-sm font-bold text-foreground">Relatório Analítico Consolidado</h3>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b border-surface-container-high">
                        <th className="py-3 px-2 text-[9px] font-bold text-outline uppercase tracking-widest min-w-[200px]">Identificação do Lote</th>
                        <th className="py-3 px-2 text-[9px] font-bold text-outline uppercase tracking-widest">Alojamento</th>
                        <th className="py-3 px-2 text-[9px] font-bold text-outline uppercase tracking-widest">CA Real</th>
                        <th className="py-3 px-2 text-[9px] font-bold text-outline uppercase tracking-widest">Viabilidade (%)</th>
                        <th className="py-3 px-2 text-[9px] font-bold text-outline uppercase tracking-widest">IP (Índice)</th>
                     </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-surface-container-high">
                     {sortedFlocks.map(f => (
                        <tr key={f.id} className="hover:bg-surface-container-lowest transition-colors">
                           <td className="py-5 px-2">
                              <p className="font-bold text-foreground">{f.name}</p>
                              <p className="text-[10px] text-outline font-medium mt-0.5">{f.breed}</p>
                           </td>
                           <td className="py-5 px-2 font-bold text-foreground">{f.housedBirds?.toLocaleString('pt-BR')} aves</td>
                           <td className={`py-5 px-2 font-bold ${f.ca < 1.6 ? 'text-[#1A5E35]' : 'text-foreground'}`}>{f.ca}</td>
                           <td className="py-5 px-2 font-bold text-foreground">{f.viabilidade}%</td>
                           <td className="py-5 px-2 font-bold text-foreground">{f.ip}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
         </>
      )}
    </main>
  );
}
