"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  LineChart, 
  Line, 
  XAxis, 
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";
import { 
  Wheat, 
  Pill, 
  Syringe, 
  AlertTriangle, 
  TrendingUp, 
  Minus, 
  ShoppingCart,
  Plus,
  History,
  List
} from "lucide-react";

import { FarmSelector } from "@/components/FarmSelector";
import { getUserFarms, type FarmOption } from "@/app/actions/dashboard";
import { getEstoqueDashboardData, type EstoqueDashboardData } from "@/app/actions/estoque";
import { GerarPedidoModal } from "@/components/GerarPedidoModal";

function EstoqueDashboardComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [dashData, setDashData] = useState<EstoqueDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartDays, setChartDays] = useState<number>(7);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // 1. Carregar granjas (Mesmo fluxo do dashboard)
  useEffect(() => {
    async function loadFarms() {
      const result = await getUserFarms();
      if (result.needsOnboarding) {
        router.push("/onboarding");
        return;
      }
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      setFarms(result.farms);

      const paramFarmId = searchParams.get("farmId");
      const storedFarmId = typeof window !== "undefined" ? localStorage.getItem("selectedFarmId") : null;
      const farmIds = result.farms.map((f) => f.id);

      const chosen =
        (paramFarmId && farmIds.includes(paramFarmId) ? paramFarmId : null) ||
        (storedFarmId && farmIds.includes(storedFarmId) ? storedFarmId : null) ||
        result.farms[0]?.id ||
        "";

      setSelectedFarmId(chosen);
    }
    loadFarms();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Load Dashboard Data
  useEffect(() => {
    if (!selectedFarmId) return;

    async function loadDashboard() {
      setLoading(true);
      const result = await getEstoqueDashboardData(selectedFarmId, chartDays);
      if (result.error) {
        setError(result.error);
      } else {
        setDashData(result.data || null);
        setError(null);
      }
      setLoading(false);
    }
    loadDashboard();
  }, [selectedFarmId, chartDays]);

  const handleFarmChange = useCallback(
    (farmId: string) => {
      setSelectedFarmId(farmId);
      localStorage.setItem("selectedFarmId", farmId);
      router.replace(`/estoque?farmId=${farmId}`, { scroll: false });
    },
    [router]
  );

  const formatNumber = (n: number) => n.toLocaleString("pt-BR");

  if (loading && !dashData) {
    return (
      <main className="flex-1 p-8 bg-surface-container-lowest font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6">
        <div className="flex justify-between items-center mb-2">
            <div>
                <div className="h-8 bg-surface-container rounded-md w-64 mb-2 animate-pulse" />
                <div className="h-4 bg-surface-container rounded-md w-96 animate-pulse" />
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-[140px] bg-white rounded-2xl border border-outline-variant/30 animate-pulse" />)}
        </div>
      </main>
    );
  }

  if (error) {
     return (
       <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in max-w-[1400px] mx-auto w-full flex items-center justify-center">
         <div className="bg-[#ffebee] border border-[#ffcdd2] rounded-xl p-6 text-center">
            <h2 className="text-xl font-bold text-[#b71c1c] mb-2">Erro ao carregar Estoque</h2>
            <p className="text-[#c62828]">{error}</p>
         </div>
       </main>
     );
  }

  const kpis = dashData?.kpis;
  const chartData = dashData?.tendenciaChart || [];
  const alerts = kpis?.alerts || [];
  const latestMoves = dashData?.lastMovements || [];

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter max-w-[1400px] mx-auto w-full flex flex-col gap-6">
      
      {/* Header with FarmSelector */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
         <div>
            <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
            Visão Geral do Estoque
            </h1>
            <p className="text-sm font-medium text-outline mt-1">
            Controle de insumos e monitoramento de consumo em tempo real.
            </p>
         </div>
         
         {/* Top Right Actions & Farm Selector */}
         <div className="flex flex-col md:flex-row items-end xl:items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
                <Link href="/estoque/historico">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-surface-container-low text-[#1A5E35] border border-outline-variant/30 text-xs font-bold rounded-xl transition-all shadow-sm">
                    <History className="w-4 h-4" /> Histórico
                </button>
                </Link>
                <Link href="/estoque/itens">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-xs font-bold rounded-xl transition-all shadow-sm">
                    <List className="w-4 h-4" /> Lista de Itens
                </button>
                </Link>
            </div>
            
            <div className="w-full md:w-auto xl:min-w-[280px]">
                <FarmSelector
                  farms={farms}
                  selectedFarmId={selectedFarmId}
                  onFarmChange={handleFarmChange}
                />
            </div>
         </div>
      </div>

      {/* 3 Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* KPI 1 - Ração */}
         <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between h-[140px]">
            <div className="flex justify-between items-start mb-2">
               <p className="text-[12px] font-bold text-[#0D2E1A]">Ração Total</p>
               <div className="w-8 h-8 bg-[#e8f5e9] rounded-lg flex items-center justify-center">
                  <Wheat className="w-4 h-4 text-[#2e7d32]" />
               </div>
            </div>
            <div>
               <p className="text-3xl font-manrope font-extrabold text-[#0D2E1A]">
                  {formatNumber(kpis?.totalRacaoKg || 0)} <span className="text-sm font-medium text-outline">kg</span>
               </p>
            </div>
            <div className="mt-auto">
               <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#e8f5e9] rounded-md">
                  <TrendingUp className="w-3 h-3 text-[#2e7d32]" />
                  <span className="text-[10px] font-bold text-[#2e7d32]">Dados Dinâmicos do Prisma</span>
               </div>
            </div>
         </div>

         {/* KPI 2 - Medicamentos */}
         <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between h-[140px]">
            <div className="flex justify-between items-start mb-2">
               <p className="text-[12px] font-bold text-[#0D2E1A]">Medicamentos</p>
               <div className="w-8 h-8 bg-surface-container rounded-lg flex items-center justify-center">
                  <Pill className="w-4 h-4 text-[#1A5E35]" />
               </div>
            </div>
            <div>
               <p className="text-3xl font-manrope font-extrabold text-[#0D2E1A]">
                  {formatNumber(kpis?.totalMedicamentos || 0)} <span className="text-sm font-medium text-outline">unid</span>
               </p>
            </div>
            <div className="mt-auto">
               <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface-container flex rounded-md">
                  <Minus className="w-3 h-3 text-outline" />
                  <span className="text-[10px] font-bold text-outline">Geral (Estoque Físico)</span>
               </div>
            </div>
         </div>

         {/* KPI 3 - Vacinas */}
         <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between h-[140px] relative">
            <div className="flex justify-between items-start mb-2">
               <p className="text-[12px] font-bold text-[#0D2E1A]">Vacinas</p>
               <div className="w-8 h-8 bg-[#e8f5e9] rounded-lg flex items-center justify-center">
                  <Syringe className="w-4 h-4 text-[#1A5E35]" />
               </div>
            </div>
            <div>
               <p className="text-3xl font-manrope font-extrabold text-[#0D2E1A]">
                  {formatNumber(kpis?.totalVacinas || 0)} <span className="text-sm font-medium text-outline">doses</span>
               </p>
            </div>
            <div className="mt-auto">
                {alerts.some(a => a.title.toLowerCase().includes("vacina")) ? (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#ffebee] border border-[#ffcdd2] rounded-md">
                        <AlertTriangle className="w-3 h-3 text-[#c62828]" />
                        <span className="text-[10px] font-bold text-[#c62828]">Reabastecimento necessário</span>
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface-container flex rounded-md">
                        <Minus className="w-3 h-3 text-outline" />
                        <span className="text-[10px] font-bold text-outline">Estoque Saudável</span>
                     </div>
                )}
            </div>
         </div>
      </div>

      {/* Main Content Sections */}
      <div className="flex flex-col xl:flex-row gap-6 mt-2">
         
         {/* Left Side (Charts and Storage) */}
         <div className="xl:w-[70%] flex flex-col gap-6">
            
            {/* Chart Card */}
            <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
               <div className="flex items-start justify-between mb-8">
                  <div>
                     <h2 className="text-lg font-bold text-[#0D2E1A] mb-1">Tendência de Consumo</h2>
                     <p className="text-xs font-medium text-outline">Volume de Insumos distribuídos nos últimos {chartDays} dias</p>
                  </div>
                  <div>
                     <select 
                        value={chartDays}
                        onChange={(e) => setChartDays(Number(e.target.value))}
                        className="bg-surface-container-lowest border border-outline-variant/50 text-xs font-bold text-[#0D2E1A] px-3 py-1.5 rounded-lg focus:outline-none"
                    >
                        <option value={7}>Últimos 7 dias</option>
                        <option value={15}>Últimos 15 dias</option>
                        <option value={30}>Últimos 30 dias</option>
                     </select>
                  </div>
               </div>

               <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis 
                           dataKey="label" 
                           axisLine={false} 
                           tickLine={false} 
                           tick={{ fontSize: 10, fill: '#737373', fontWeight: 700 }}
                           dy={10}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0D2E1A', border: 'none', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ fontWeight: 'bold' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#0D2E1A' }}/>
                        <Line
                           type="monotone"
                           dataKey="Ração"
                           stroke="#1A5E35"
                           strokeWidth={4}
                           dot={{ r: 4, fill: "#ffffff", stroke: "#1A5E35", strokeWidth: 2 }}
                           activeDot={{ r: 7, fill: "#1A5E35", stroke: "#ffffff" }}
                        />
                        <Line
                           type="monotone"
                           dataKey="Medicamentos"
                           stroke="#3b82f6" // Blue
                           strokeWidth={3}
                           dot={{ r: 3, fill: "#ffffff", stroke: "#3b82f6", strokeWidth: 2 }}
                           activeDot={{ r: 6, fill: "#3b82f6", stroke: "#ffffff" }}
                        />
                        <Line
                           type="monotone"
                           dataKey="Vacinas"
                           stroke="#f59e0b" // Amber
                           strokeWidth={3}
                           dot={{ r: 3, fill: "#ffffff", stroke: "#f59e0b", strokeWidth: 2 }}
                           activeDot={{ r: 6, fill: "#f59e0b", stroke: "#ffffff" }}
                        />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Bottom Sub-KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
                  <div>
                     <p className="text-[10px] uppercase font-bold text-[#1A5E35] tracking-widest mb-4">Ração P/ Fase Inicial</p>
                     <p className="text-2xl font-manrope font-extrabold text-[#0D2E1A] flex items-end gap-2">
                        {kpis?.racaoFaseInicialPercent || 0}%
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Cálculo de Reserva</span>
                     </p>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mt-4">
                     <div className="h-full bg-[#1A5E35] rounded-full transition-all duration-1000" style={{ width: `${kpis?.racaoFaseInicialPercent || 0}%` }}></div>
                  </div>
               </div>

               <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
                  <div>
                     <p className="text-[10px] uppercase font-bold text-[#1A5E35] tracking-widest mb-4">Ração P/ Engorda</p>
                     <p className="text-2xl font-manrope font-extrabold text-[#0D2E1A] flex items-end gap-2">
                        {kpis?.racaoFaseEngordaPercent || 0}%
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Cálculo de Reserva</span>
                     </p>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mt-4">
                     <div className="h-full bg-[#1A5E35] rounded-full transition-all duration-1000" style={{ width: `${kpis?.racaoFaseEngordaPercent || 0}%` }}></div>
                  </div>
               </div>
            </div>
         </div>

         {/* Right Side (Alerts and Last Entries) */}
         <div className="xl:w-[30%] flex flex-col gap-6">
            
            {/* Critical Alerts */}
            <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex-1">
               <div className="flex items-center gap-2 mb-6">
                  <AlertTriangle className="w-4 h-4 text-[#c62828]" />
                  <h3 className="text-sm font-bold text-[#c62828]">Alertas Críticos</h3>
               </div>

               {alerts.length > 0 ? (
                   <div className="flex flex-col gap-3">
                      {alerts.map((alert, idx) => (
                         <div key={idx} className={`border rounded-xl p-4 flex gap-4 items-start ${alert.severity === 'high' ? 'bg-[#ffebee] border-[#ffcdd2]' : 'bg-surface-container-lowest border-outline-variant/40'}`}>
                            <div className={`p-2 rounded-lg shrink-0 border ${alert.severity === 'high' ? 'bg-white border-[#ffcdd2]' : 'bg-white border-outline-variant/40'}`}>
                                {alert.title.toLowerCase().includes('vacina') ? (
                                   <Syringe className={`w-4 h-4 ${alert.severity === 'high' ? 'text-[#c62828]' : 'text-outline'}`} />
                                ) : alert.title.toLowerCase().includes('medicamento') ? (
                                   <Pill className={`w-4 h-4 ${alert.severity === 'high' ? 'text-[#c62828]' : 'text-outline'}`} />
                                ) : (
                                   <Wheat className={`w-4 h-4 ${alert.severity === 'high' ? 'text-[#c62828]' : 'text-outline'}`} />
                                )}
                            </div>
                            <div>
                               <p className={`text-xs font-bold mb-0.5 ${alert.severity === 'high' ? 'text-[#c62828]' : 'text-[#0D2E1A]'}`}>{alert.title}</p>
                               <p className={`text-[10px] font-medium mb-2 ${alert.severity === 'high' ? 'text-[#c62828]/80' : 'text-outline'}`}>{alert.description}</p>
                               <span className={`px-2 py-0.5 text-white text-[9px] font-bold uppercase tracking-widest rounded-md ${alert.severity === 'high' ? 'bg-[#c62828]' : 'bg-[#1A5E35]'}`}>
                                  {alert.severity === 'high' ? 'Crítico' : 'Mínimo'}
                               </span>
                            </div>
                         </div>
                      ))}
                   </div>
               ) : (
                   <div className="text-center py-6">
                     <p className="text-sm font-bold text-outline">Nenhum alerta de estoque.</p>
                   </div>
               )}

               <button 
                  onClick={() => setIsOrderModalOpen(true)}
                  className="w-full mt-6 bg-[#7f1d1d] hover:bg-[#c62828] text-white text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
               >
                  <ShoppingCart className="w-4 h-4" /> Gerar Pedido de Compra
               </button>
            </div>

            {/* Last Entries */}
            <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm relative">
               <h3 className="text-[10px] uppercase font-bold text-[#1A5E35] tracking-widest mb-4">Últimos Lançamentos</h3>
               
               {latestMoves.length > 0 ? (
                   <div className="flex flex-col gap-4">
                      {latestMoves.map(move => (
                         <div key={move.id} className="flex justify-between items-center border-b border-outline-variant/20 pb-4 last:border-0 last:pb-0">
                            <div>
                               <p className="text-xs font-bold text-[#0D2E1A]">
                                  {move.type === 'IN' ? 'Entrada' : 'Saída'}: {move.itemName}
                               </p>
                               <p className="text-[9px] font-medium text-outline uppercase tracking-widest mt-1">
                                    {new Date(move.date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                               </p>
                            </div>
                            <span className={`text-xs font-bold ${move.type === 'IN' ? 'text-[#1A5E35]' : 'text-[#c62828]'}`}>
                               {move.type === 'IN' ? '+' : '-'}{move.quantity} {move.unit}
                            </span>
                         </div>
                      ))}
                   </div>
               ) : (
                   <div className="text-center py-6">
                     <p className="text-sm font-bold text-outline">Nenhuma movimentação registrada.</p>
                   </div>
               )}

            </div>
            
         </div>
         
      </div>
      
       {dashData && (
          <GerarPedidoModal
            isOpen={isOrderModalOpen}
            onClose={() => setIsOrderModalOpen(false)}
            criticalItems={dashData.criticalItems}
            farmName={dashData.farmName}
          />
       )}
    </main>
  );
}

export default function EstoquePage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center min-h-screen">Carregando Estoque...</div>}>
      <EstoqueDashboardComponent />
    </Suspense>
  );
}
