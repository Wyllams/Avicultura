"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Building2, 
  MapPin, 
  FileText, 
  Skull, 
  Scale, 
  Wheat, 
  Package, 
  Syringe, 
  CalendarCheck, 
  LineChart, 
  Settings,
  Leaf,
  Dna,
  LogOut
} from "lucide-react";
import { logoutUser } from "@/app/actions/auth";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { icon: LineChart, label: "Dashboard", href: "/dashboard" },
    { icon: Building2, label: "Granjas", href: "/granjas" },
    { icon: MapPin, label: "Lotes", href: "/lotes" },
    { icon: Skull, label: "Mortalidade", href: "/mortalidade" },
    { icon: Scale, label: "Pesagens", href: "/pesagens" },
    { icon: Wheat, label: "Ração", href: "/racao" },
    { icon: Package, label: "Estoque", href: "/estoque" },
    { icon: Syringe, label: "Sanidade", href: "/sanidade" },
    { icon: CalendarCheck, label: "Tarefas", href: "/tarefas" },
    { icon: FileText, label: "Relatórios", href: "/relatorios" },
    { icon: Dna, label: "Cadastrar Linhagens", href: "/linhagens" },
  ];

  const handleLogout = async () => {
    await logoutUser();
    window.location.href = "/login";
  };

  return (
    <aside className="w-[220px] h-screen fixed left-0 top-0 bg-[#0D2E1A] flex flex-col font-inter z-50 print:hidden">
      
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 gap-3 pt-4 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shrink-0">
          <Leaf className="w-5 h-5" />
        </div>
        <span className="font-manrope font-bold text-lg text-white tracking-tight">
          Avicultura
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 overflow-y-auto w-full flex flex-col gap-1 custom-scrollbar pb-6">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                isActive 
                  ? "bg-primary text-white font-medium shadow-sm" 
                  : "text-[#637D68] hover:bg-[#123822] hover:text-[#c0c9be]"
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-white" : "text-[#637D68] group-hover:text-[#c0c9be]"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer Navigation */}
      <div className="p-4 border-t border-[#123822]">
        <Link 
          href="/configuracoes"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
            pathname.startsWith("/configuracoes")
              ? "bg-primary text-white font-medium shadow-sm" 
              : "text-[#637D68] hover:bg-[#123822] hover:text-[#c0c9be]"
          }`}
        >
          <Settings className={`w-[18px] h-[18px] shrink-0 ${pathname.startsWith("/configuracoes") ? "text-white" : "text-[#637D68] group-hover:text-[#c0c9be]"}`} />
          Configurações
        </Link>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg text-sm transition-all duration-200 group text-[#833C46] hover:bg-[#833C46]/10"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );
}
