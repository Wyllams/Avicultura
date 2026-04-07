"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Calendar } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MortalityPoint } from "@/app/actions/dashboard";

type Period = 7 | 15 | 30 | 90 | 365;

interface MortalityChartProps {
  initialData: MortalityPoint[];
  onPeriodChange: (days: number) => Promise<MortalityPoint[]>;
}

const PERIOD_OPTIONS: { label: string; shortLabel: string; value: Period }[] = [
  { label: "Últimos 7 dias", shortLabel: "7 dias", value: 7 },
  { label: "Últimos 15 dias", shortLabel: "15 dias", value: 15 },
  { label: "Últimos 30 dias", shortLabel: "30 dias", value: 30 },
  { label: "Últimos 90 dias", shortLabel: "90 dias", value: 90 },
  { label: "Último ano", shortLabel: "Anual", value: 365 },
];

export function MortalityChart({ initialData, onPeriodChange }: MortalityChartProps) {
  const [activePeriod, setActivePeriod] = useState<Period>(7);
  const [chartData, setChartData] = useState<MortalityPoint[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOption = PERIOD_OPTIONS.find((o) => o.value === activePeriod)!;

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePeriodChange = async (period: Period) => {
    if (period === activePeriod) {
      setIsOpen(false);
      return;
    }
    setActivePeriod(period);
    setIsOpen(false);
    setLoading(true);

    try {
      const newData = await onPeriodChange(period);
      setChartData(newData);
    } catch {
      // Fallback: mantém dados atuais
    } finally {
      setLoading(false);
    }
  };

  const hasData = chartData.some((d) => d.quantity > 0);

  return (
    <section className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-manrope font-bold text-lg leading-tight">Mortalidade</h2>
          <p className="text-xs text-on-surface-variant mt-1">Taxa % diária da granja</p>
        </div>

        {/* Period Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`
              flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all duration-200
              ${isOpen
                ? "border-primary bg-primary/5 text-primary"
                : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary/50 hover:text-foreground"
              }
            `}
          >
            <Calendar className="w-3.5 h-3.5" />
            {activeOption.shortLabel}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePeriodChange(option.value)}
                  className={`
                    w-full text-left px-4 py-2.5 text-sm transition-colors duration-150
                    ${activePeriod === option.value
                      ? "bg-primary/5 text-primary font-semibold"
                      : "text-foreground hover:bg-surface-container"
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className={`flex-1 w-full min-h-[220px] transition-opacity ${loading ? "opacity-40" : ""}`}>
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E1E3E4" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#707970" }}
                dy={10}
                interval={activePeriod > 30 ? Math.floor(activePeriod / 12) : 0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#707970" }}
                dx={-5}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "10px",
                  border: "none",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  fontSize: "13px",
                }}
                formatter={(value) => [`${Number(value).toFixed(3)}%`, "Mortalidade"]}
                labelFormatter={(label) => `Dia: ${String(label)}`}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#1A5E35"
                strokeWidth={2.5}
                dot={activePeriod <= 15 ? { r: 3, fill: "#1A5E35", strokeWidth: 0 } : false}
                activeDot={{ r: 5, fill: "#1A5E35" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <p className="text-sm text-on-surface-variant font-medium">Sem registros de mortalidade</p>
              <p className="text-xs text-outline mt-1">Os dados aparecerão conforme forem lançados.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
