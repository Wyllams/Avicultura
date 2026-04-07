"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Bird,
  Package,
  Activity,
  Plus,
} from "lucide-react";
import { FarmSelector } from "@/components/FarmSelector";
import { WeatherWidget } from "@/components/WeatherWidget";
import { MortalityChart } from "@/components/MortalityChart";
import {
  getUserFarms,
  getDashboardData,
  type FarmOption,
  type DashboardData,
  type MortalityPoint,
} from "@/app/actions/dashboard";
import Link from "next/link";

import { Suspense } from "react";

function DashboardComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Carregar granjas ao montar
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

      // Determinar granja selecionada (searchParams > localStorage > primeira)
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

  // 2. Carregar dados quando farmId muda
  useEffect(() => {
    if (!selectedFarmId) return;

    async function loadDashboard() {
      setLoading(true);
      const result = await getDashboardData(selectedFarmId, 7);
      if (result.error) {
        setError(result.error);
      } else {
        setDashData(result.data);
        setError(null);
      }
      setLoading(false);
    }
    loadDashboard();
  }, [selectedFarmId]);

  // 3. Trocar granja
  const handleFarmChange = useCallback(
    (farmId: string) => {
      setSelectedFarmId(farmId);
      localStorage.setItem("selectedFarmId", farmId);
      router.replace(`/dashboard?farmId=${farmId}`, { scroll: false });
    },
    [router]
  );

  // 4. Buscar chart mortalidade por período
  const handleMortalityPeriodChange = useCallback(
    async (days: number): Promise<MortalityPoint[]> => {
      const result = await getDashboardData(selectedFarmId, days);
      return result.data?.mortalityChart || [];
    },
    [selectedFarmId]
  );

  const kpis = dashData?.kpis;
  const flocks = dashData?.flocks || [];
  const hasFlocks = flocks.length > 0;

  // ========== LOADING STATE ==========
  if (loading && !dashData) {
    return (
      <main className="min-h-screen bg-background p-8 font-inter">
        <header className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm text-on-surface-variant font-medium mb-1">Visão Geral</p>
            <h1 className="text-3xl font-manrope font-bold text-foreground tracking-tight">Dashboard Principal</h1>
          </div>
        </header>
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface-container-highest p-6 rounded-2xl animate-pulse">
              <div className="w-10 h-10 rounded-full bg-surface-container mb-4" />
              <div className="h-8 bg-surface-container rounded w-16 mb-2" />
              <div className="h-4 bg-surface-container rounded w-24" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  // ========== ERROR STATE ==========
  if (error && !dashData) {
    return (
      <main className="min-h-screen bg-background p-8 font-inter flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-tertiary mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground mb-1">Erro ao carregar</h2>
          <p className="text-sm text-on-surface-variant">{error}</p>
        </div>
      </main>
    );
  }

  // ========== FORMATADORES ==========
  const formatNumber = (n: number) => n.toLocaleString("pt-BR");
  const formatPercent = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";

  return (
    <main className="min-h-screen bg-background p-8 font-inter animate-in fade-in duration-500">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <p className="text-sm text-on-surface-variant font-medium mb-1">Visão Geral</p>
          <h1 className="text-3xl font-manrope font-bold text-foreground tracking-tight">Dashboard Principal</h1>
        </div>

        {/* W-05 Farm Selector */}
        <FarmSelector
          farms={farms}
          selectedFarmId={selectedFarmId}
          onFarmChange={handleFarmChange}
        />
      </header>

      {/* KPI CARDS */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-surface-container-highest p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-manrope font-bold text-foreground mb-1">
              {kpis?.activeFlocks ?? 0}
            </p>
            <p className="text-sm font-medium text-on-surface-variant">Lotes ativos</p>
          </div>
        </div>

        <div className="bg-surface-container-highest p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
              <Bird className="w-5 h-5 text-on-secondary-container" />
            </div>
            {hasFlocks && (
              <span className="flex items-center gap-1 text-xs font-semibold text-[#296b40] bg-[#296b40]/10 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" /> Ativas
              </span>
            )}
          </div>
          <div>
            <p className="text-3xl font-manrope font-bold text-foreground mb-1">
              {formatNumber(kpis?.totalCurrentBirds ?? 0)}
            </p>
            <p className="text-sm font-medium text-on-surface-variant">Aves atuais</p>
          </div>
        </div>

        <div className="bg-surface-container-highest p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-tertiary-container/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-tertiary" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-manrope font-bold text-foreground mb-1">
              {formatPercent(kpis?.mortalityTodayPercent ?? 0)}
            </p>
            <p className="text-sm font-medium text-on-surface-variant">Mortalidade hoje</p>
          </div>
        </div>

        <div className={`bg-surface-container-highest p-6 rounded-2xl flex flex-col justify-between ${(kpis?.activeAlerts ?? 0) > 0 ? "border-l-4 border-tertiary" : ""}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-tertiary-container/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-tertiary" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-manrope font-bold text-foreground mb-1">
              {kpis?.activeAlerts ?? 0}
            </p>
            <p className="text-sm font-medium text-on-surface-variant">Alertas Ativos</p>
          </div>
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COL: Alertas + Chart */}
        <div className="flex flex-col gap-8 lg:col-span-1">
          {/* Clima Atual */}
          <WeatherWidget farmId={selectedFarmId} />

          {/* Alertas */}
          <section className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-manrope font-bold text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-tertiary" /> Avisos
              </h2>
            </div>

            {kpis && kpis.alerts.length > 0 ? (
              <div className="flex flex-col gap-4">
                {kpis.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-4 rounded-xl border ${
                      alert.severity === "high"
                        ? "bg-tertiary-container/15 border-tertiary/25"
                        : "bg-surface-container border-outline-variant"
                    }`}
                  >
                    <AlertTriangle
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        alert.severity === "high" ? "text-tertiary" : "text-on-surface-variant"
                      }`}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-on-surface mb-0.5">{alert.title}</h4>
                      <p className="text-xs text-on-surface-variant">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-10 h-10 rounded-full bg-[#296b40]/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-[#296b40]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-on-surface-variant font-medium">Tudo certo!</p>
                <p className="text-xs text-outline mt-1">Nenhum alerta ativo no momento.</p>
              </div>
            )}
          </section>

          {/* Mortalidade Chart */}
          <MortalityChart
            initialData={dashData?.mortalityChart || []}
            onPeriodChange={handleMortalityPeriodChange}
          />
        </div>

        {/* RIGHT COL: Tabela de Lotes */}
        <section className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-manrope font-bold text-lg">Lotes Ativos</h2>
              <p className="text-sm text-on-surface-variant">
                {hasFlocks ? "Desempenho em tempo real" : "Nenhum lote registrado"}
              </p>
            </div>
            {hasFlocks && (
              <Link
                href="/lotes"
                className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                Ver todos <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {hasFlocks ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-container-high">
                    <th className="pb-3 px-4 text-center text-sm font-semibold text-on-surface-variant">Lote</th>
                    <th className="pb-3 px-4 text-center text-sm font-semibold text-on-surface-variant">Granja</th>
                    <th className="pb-3 px-4 text-center text-sm font-semibold text-on-surface-variant">Dia</th>
                    <th className="pb-3 px-4 text-center text-sm font-semibold text-on-surface-variant">Aves</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {flocks.map((flock) => (
                    <tr
                      key={flock.id}
                      onClick={() => router.push(`/lotes/${flock.id}`)}
                      className="border-b border-surface-container-low hover:bg-surface transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-4 text-center">
                        <div className="font-semibold text-sm text-foreground">{flock.name}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-xs font-medium text-on-surface-variant">
                          {dashData?.farmName}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="font-semibold text-sm text-foreground">{flock.ageInDays === 0 ? 1 : flock.ageInDays}</div>
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-sm text-foreground">
                        {formatNumber(flock.currentBirds)}
                      </td>
                      <td className="py-4 pr-2 text-right">
                        <ArrowRight className="w-4 h-4 text-outline-variant group-hover:text-primary transition-colors inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* EMPTY STATE */
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-5">
                <Bird className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum lote ativo
              </h3>
              <p className="text-sm text-on-surface-variant max-w-xs mx-auto mb-6">
                Comece criando seu primeiro lote para acompanhar o desempenho da sua granja.
              </p>
              <Link
                href="/lotes"
                className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Criar primeiro lote
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 flex items-center justify-center">Carregando...</div>}>
      <DashboardComponent />
    </Suspense>
  );
}
