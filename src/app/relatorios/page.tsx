"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getReportFilters } from "@/app/actions/relatorios";
import { FileText, Activity, Package, Skull, ShieldCheck, Loader2 } from "lucide-react";

export default function W36CentralRelatoriosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<any[]>([]);
  const [flocks, setFlocks] = useState<any[]>([]);

  const [selectedFarm, setSelectedFarm] = useState<string>("");
  const [selectedFlock, setSelectedFlock] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      const res = await getReportFilters();
      if (res.farms && res.flocks) {
        setFarms(res.farms);
        setFlocks(res.flocks);
        if (res.farms.length > 0) setSelectedFarm(res.farms[0].id);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const availableFlocks = flocks.filter(f => f.barn?.farmId === selectedFarm);

  useEffect(() => {
     if (availableFlocks.length > 0 && !availableFlocks.find(f => f.id === selectedFlock)) {
       setSelectedFlock(availableFlocks[0].id);
     }
  }, [availableFlocks, selectedFlock]);

  const handleCardClick = (type: string) => {
    if (type === "estoque") {
       if (!selectedFarm) return;
       router.push(`/relatorios/${type}?farmId=${selectedFarm}`);
    } else {
       if (!selectedFlock) return;
       router.push(`/relatorios/${type}?flockId=${selectedFlock}`);
    }
  };

  const reports = [
    {
      type: "boletim",
      title: "Boletim Sanitário",
      desc: "Adequação normativa (MAPA IN 100/2020 / Adagro). Compilado de vacinas e óbitos.",
      icon: <ShieldCheck className="w-8 h-8 text-[#1A5E35]" />,
    },
    {
      type: "desempenho",
      title: "Desempenho do Lote",
      desc: "KPIs Zootécnicos (CA, GPD, Viabilidade, IEP) consolidados ao vivo.",
      icon: <Activity className="w-8 h-8 text-[#1A5E35]" />,
    },
    {
      type: "estoque",
      title: "Relatório de Estoque",
      desc: "Auditoria de uso de ração e insumos para conciliação física.",
      icon: <Package className="w-8 h-8 text-[#1A5E35]" />,
    },
    {
      type: "mortalidade",
      title: "Índice de Mortalidade",
      desc: "Curva e histórico segmentado das baixas diárias do lote.",
      icon: <Skull className="w-8 h-8 text-[#1A5E35]" />,
    },
    {
       type: "sanidade",
       title: "Histórico Sanitário",
       desc: "Registro logado de todas as visitas técnicas e receituários.",
       icon: <FileText className="w-8 h-8 text-[#1A5E35]" />,
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A5E35]" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-[#0D2E1A] tracking-tight">
            Central de Relatórios
          </h1>
          <p className="text-outline mt-1 font-medium">
            Emissão de relatórios oficiais MAPA/Adagro e extratos gerenciais do Lote selecionado.
          </p>
        </div>

        {/* Global Filter */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/30">
          <h2 className="text-sm font-black text-[#0D2E1A] uppercase tracking-widest mb-4">
            Escopo de Busca
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-outline uppercase tracking-wider">Granja</label>
              <select 
                value={selectedFarm} 
                onChange={e => setSelectedFarm(e.target.value)}
                className="mt-1 w-full bg-surface-container border border-outline-variant/50 rounded-xl px-4 py-3 text-[#0D2E1A] font-bold focus:ring-2 focus:ring-[#1A5E35]/50 outline-none transition-all"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
                {farms.length === 0 && <option value="">Nenhuma granja</option>}
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold text-outline uppercase tracking-wider">Lote Ativo</label>
              <select 
                value={selectedFlock} 
                onChange={e => setSelectedFlock(e.target.value)}
                className="mt-1 w-full bg-surface-container border border-outline-variant/50 rounded-xl px-4 py-3 text-[#0D2E1A] font-bold focus:ring-2 focus:ring-[#1A5E35]/50 outline-none transition-all disabled:opacity-50"
                disabled={availableFlocks.length === 0}
              >
                {availableFlocks.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} - {f.status}</option>
                ))}
                {availableFlocks.length === 0 && <option value="">Nenhum lote nesta granja</option>}
              </select>
            </div>
          </div>
        </div>

        {/* Cards Hub */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((r) => (
            <div 
              key={r.type}
              onClick={() => handleCardClick(r.type)}
              className="bg-white border border-outline-variant/30 rounded-2xl p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#e8f5e9] rounded-bl-full translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-[#e8f5e9] border border-[#1A5E35]/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  {r.icon}
                </div>
                <h3 className="text-lg font-bold text-[#0D2E1A] mb-2">{r.title}</h3>
                <p className="text-sm font-medium text-outline leading-relaxed">
                  {r.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
