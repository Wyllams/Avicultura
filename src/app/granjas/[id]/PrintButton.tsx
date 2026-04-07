"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-[#f0f4f1] text-[#1A5E35] px-5 py-2.5 rounded-xl font-bold hover:bg-[#e2ebe4] transition-colors shadow-sm"
    >
      <Printer className="w-5 h-5" />
      Imprimir Ficha
    </button>
  );
}
