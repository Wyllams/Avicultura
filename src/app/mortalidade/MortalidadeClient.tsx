"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Plus,
  Calendar,
  Activity,
  AlertCircle,
  TrendingDown,
  Search,
  FileQuestion,
  FileText
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const realData = payload.find((p) => p.dataKey === 'mortality');
    if(!realData) return null;

    return (
      <div className="bg-[#0D2E1A] text-white p-4 rounded-xl shadow-xl flex flex-col gap-2 min-w-[150px]">
        <p className="font-bold text-sm mb-1">{label}</p>
        <div className="flex justify-between items-center text-xs">
           <span className="opacity-80">Baixas:</span>
           <span className="font-bold text-[#e57373]">{realData.value} aves</span>
        </div>
      </div>
    );
  }
  return null;
};

export function MortalidadeClient({ flock }: { flock: any }) {
  const router = useRouter();

  // Basic Calculations
  const now = new Date();
  const housedDate = new Date(flock.housingDate);
  const isClosed = flock.status === 'CLOSED';
  const end = flock.slaughterDate ? new Date(flock.slaughterDate) : now;
  const timeDiff = end.getTime() - housedDate.getTime();
  const ageDays = Math.max(1, Math.floor(timeDiff / (1000 * 3600 * 24)));

  const logs = flock.mortalityLogs || [];
  
  // Totals
  let totalMortality = 0;
  let todayMortality = 0;
  
  const todayStr = now.toISOString().split("T")[0];

  logs.forEach((m: any) => {
    totalMortality += m.quantity;
    const logDate = new Date(m.date).toISOString().split("T")[0];
    if (logDate === todayStr) {
      todayMortality += m.quantity;
    }
  });

  const viabilidade = flock.housedBirds > 0 ? ((flock.housedBirds - totalMortality) / flock.housedBirds) * 100 : 0;
  const percentMortality = flock.housedBirds > 0 ? (totalMortality / flock.housedBirds) * 100 : 0;

  // Formatting for Chart
  const dailyDataMap = new Map<string, number>();
  logs.forEach((m: any) => {
    const logDate = new Date(m.date).toISOString().split("T")[0];
    const existing = dailyDataMap.get(logDate) || 0;
    dailyDataMap.set(logDate, existing + m.quantity);
  });

  const chartData = Array.from(dailyDataMap.entries())
    .sort()
    .map(([date, quantity]) => {
      const dDiff = new Date(date).getTime() - housedDate.getTime();
      const dDays = Math.max(1, Math.floor(dDiff / (1000 * 3600 * 24)));
      return {
        name: `Dia ${dDays}`,
        dateStr: new Date(date).toLocaleDateString('pt-BR'),
        mortality: quantity
      }
    });

  // Calculate Average Daily Mortality
  const avgMortality = ageDays > 0 ? totalMortality / ageDays : 0;
  const todayTrend = todayMortality - avgMortality;
  const safetyLimitObj = flock.housedBirds * 0.005; // 0.5% daily safety limit (fake rule)

  return (
    <main className="flex-1 p-4 lg:p-8 bg-surface-container-lowest font-inter min-h-screen">
      <header className="max-w-[1400px] mx-auto w-full mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-manrope font-bold text-foreground">Histórico de Mortalidade</h1>
          <div className="flex items-center gap-2 mt-2 text-sm text-outline font-medium">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> Lote: <strong className="text-foreground">{flock.name}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1">Fase do Ciclo: <strong className="text-[#1A5E35]">Alojado (Dia {ageDays})</strong></span>
          </div>
        </div>
        <div className="flex items-center gap-3 print:hidden">
           <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-container-high text-[#1A5E35] text-sm font-bold rounded-lg transition-colors border border-outline-variant/30">
              <FileText className="w-4 h-4" /> Exportar PDF
           </button>
           {!isClosed && (
            <Link href={`/mortalidade/novo?loteId=${flock.id}`}>
               <button className="flex items-center gap-2 px-4 py-2 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
                  <Plus className="w-4 h-4" /> Novo Registro
               </button>
            </Link>
           )}
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto w-full space-y-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                 <h3 className="text-xs font-bold text-outline uppercase tracking-wider">MORTALIDADE ACUMULADA TOTAL</h3>
                 <Activity className="w-5 h-5 text-outline" />
              </div>
              <div className="flex items-baseline gap-3">
                 <p className="text-4xl lg:text-5xl font-bold font-manrope text-[#1A5E35]">{percentMortality.toFixed(2)}%</p>
                 <span className={`text-sm font-bold ${percentMortality < 4 ? 'text-[#81c784]' : 'text-[#e57373]'}`}>
                   {percentMortality < 4 ? 'Status Normal' : 'Alerta'}
                 </span>
              </div>
              <div className="w-full h-1.5 bg-surface-container rounded-full mt-4 overflow-hidden">
                 <div className={`h-full ${percentMortality < 4 ? 'bg-[#1A5E35]' : 'bg-[#e57373]'}`} style={{ width: `${Math.min(percentMortality, 100)}%` }} />
              </div>
           </div>

           <div className="bg-white rounded-2xl p-6 border border-[#e57373]/30 shadow-sm relative overflow-hidden shadow-[0_4px_24px_rgba(229,115,115,0.05)]">
              <div className="flex justify-between items-start mb-6">
                 <h3 className="text-xs font-bold text-outline uppercase tracking-wider">MORTALIDADE HOJE</h3>
                 <div className="w-8 h-8 rounded-full bg-[#ffebee] flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-[#c62828]" />
                 </div>
              </div>
              <div className="flex items-baseline gap-2">
                 <p className="text-4xl lg:text-5xl font-bold font-manrope text-[#c62828]">{todayMortality}</p>
                 <span className="text-sm font-bold text-outline">Aves</span>
              </div>
              {todayTrend > 0 && (
                <p className="text-xs font-bold text-[#c62828] mt-3 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> +{todayTrend.toFixed(0)} acima da média diária
                </p>
              )}
           </div>

           <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                 <h3 className="text-xs font-bold text-outline uppercase tracking-wider">DIAS DO CICLO</h3>
                 <Calendar className="w-5 h-5 text-outline" />
              </div>
              <div className="flex items-baseline gap-2">
                 <p className="text-4xl lg:text-5xl font-bold font-manrope text-foreground">{ageDays}</p>
                 <span className="text-sm font-bold text-outline">dias hoje</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container rounded-full mt-4 overflow-hidden">
                 <div className="h-full bg-foreground" style={{ width: `${Math.min((ageDays/45)*100, 100)}%` }} />
              </div>
           </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-3xl p-6 border border-outline-variant/30 shadow-sm flex flex-col">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h2 className="text-lg font-bold font-manrope text-foreground">Análise Diária de Mortalidade</h2>
                 <p className="text-xs font-medium text-outline">Evolução de perdas por dia em relação ao limite seguro (0,5%)</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#0D2E1A]"></div> Total Diário</div>
                 <div className="flex items-center gap-2"><div className="w-4 h-[2px] bg-[#e57373]"></div> Limite de Segurança</div>
              </div>
           </div>
           
           <div className="w-full h-[300px]">
             {chartData.length > 0 ? (
                <>
                   <div className="w-full h-full print:hidden">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#757575' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#757575' }} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                            <ReferenceLine y={safetyLimitObj} stroke="#e57373" strokeDasharray="3 3" />
                            <Bar dataKey="mortality" fill="#0D2E1A" radius={[4, 4, 0, 0]} activeBar={{ fill: '#1A5E35' }} isAnimationActive={false} />
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="hidden print:block w-[1000px] h-[300px] ml-4">
                         <BarChart width={1000} height={300} data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#757575' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#757575' }} />
                            <ReferenceLine y={safetyLimitObj} stroke="#e57373" strokeDasharray="3 3" />
                            <Bar dataKey="mortality" fill="#0D2E1A" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                         </BarChart>
                   </div>
                </>
             ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-outline gap-3">
                  <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center"><Activity className="w-6 h-6 opacity-50"/></div>
                  <p className="text-sm font-medium">Nenhum registro de mortalidade computado para este lote.</p>
                </div>
             )}
           </div>
        </div>

        {/* List Section */}
        <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
           <div className="p-6 border-b border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-bold font-manrope text-foreground">Registros Diários</h2>
              <div className="relative print:hidden">
                 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                 <input type="text" placeholder="Buscar registros..." className="w-full sm:w-64 pl-9 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-[#1A5E35] transition-colors" />
              </div>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                 <thead>
                    <tr className="bg-surface-container-lowest/50 text-xs font-bold text-outline tracking-wider uppercase">
                       <th className="p-4 pl-6 border-b border-outline-variant/30">Data</th>
                       <th className="p-4 border-b border-outline-variant/30">Dia do Ciclo</th>
                       <th className="p-4 border-b border-outline-variant/30">Quantidade (Aves)</th>
                       <th className="p-4 border-b border-outline-variant/30">Causa Registrada</th>
                       <th className="p-4 border-b border-outline-variant/30">Criado Em</th>
                    </tr>
                 </thead>
                 <tbody>
                    {logs.length > 0 ? (
                      logs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log: any) => {
                        const lDate = new Date(log.date);
                        const dayOfCycle = Math.max(1, Math.floor((lDate.getTime() - housedDate.getTime()) / (1000 * 3600 * 24)));
                        const isWarning = log.quantity > safetyLimitObj;

                        return (
                          <tr key={log.id || log.syncId} className="hover:bg-surface-container-lowest transition-colors border-b border-outline-variant/10 last:border-0 group">
                             <td className="p-4 pl-6 text-sm font-bold text-foreground">
                               {lDate.toLocaleDateString('pt-BR')}
                             </td>
                             <td className="p-4 text-sm text-outline font-medium">Dia {dayOfCycle}</td>
                             <td className="p-4 text-sm">
                                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold ${isWarning ? 'bg-[#ffebee] text-[#c62828]' : 'bg-surface-container text-foreground'}`}>
                                  {log.quantity}
                                </span>
                             </td>
                             <td className="p-4 text-sm font-medium">
                               {log.cause ? (
                                  <span className="flex items-center gap-2 text-[#c62828]"><AlertCircle className="w-4 h-4"/> {log.cause}</span>
                               ) : (
                                  <span className="flex items-center gap-2 text-outline"><FileQuestion className="w-4 h-4"/> Mortandade Natural</span>
                               )}
                             </td>
                             <td className="p-4 text-xs font-medium text-outline">
                               {new Date(log.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                             </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-outline text-sm font-medium">Nenhuma baixa foi registrada para este lote.</td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

      </div>
    </main>
  );
}
