"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";
import type { FarmOption } from "@/app/actions/dashboard";

interface FarmSelectorProps {
  farms: FarmOption[];
  selectedFarmId: string;
  onFarmChange: (farmId: string) => void;
}

export function FarmSelector({ farms, selectedFarmId, onFarmChange }: FarmSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (farms.length === 0) return null;

  return (
    <div ref={ref} className="relative" id="farm-selector">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full bg-surface-container-lowest border px-4 py-2.5 rounded-xl 
          transition-all duration-200 hover:shadow-sm
          ${isOpen ? "border-primary shadow-sm" : "border-outline-variant hover:border-primary/50"}
        `}
      >
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col items-start mr-3">
            <span className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">
                Granja Atual
            </span>
            <span className="text-sm text-foreground font-semibold leading-tight whitespace-nowrap">
                {selectedFarm?.name || "Selecionar"}
            </span>
            </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-outline transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-outline-variant">
            <p className="text-xs text-on-surface-variant font-medium">
              {farms.length} {farms.length === 1 ? "granja" : "granjas"} disponíveis
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {farms.map((farm) => {
              const isActive = farm.id === selectedFarmId;
              return (
                <button
                  key={farm.id}
                  onClick={() => {
                    onFarmChange(farm.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150
                    ${isActive ? "bg-primary/5" : "hover:bg-surface-container"}
                  `}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${
                        isActive ? "font-semibold text-primary" : "font-medium text-foreground"
                      }`}
                    >
                      {farm.name}
                    </p>
                    {(farm.city || farm.state) && (
                      <p className="text-xs text-on-surface-variant truncate">
                        {[farm.city, farm.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
