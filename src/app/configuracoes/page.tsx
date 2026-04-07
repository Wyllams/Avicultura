"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  Building2, 
  MapPin, 
  Upload, 
  Trash2, 
  Star, 
  Activity, 
  KeyRound, 
  Info,
  Shield,
  Phone,
  Mail,
  Camera,
  Layers,
  Users,
  User,
  FileText,
  Bell,
  Loader2
} from "lucide-react";
import { getCompanyDetails, updateCompanyDetails } from "@/app/actions/configuracoes";

const formSchema = z.object({
  companyName: z.string().min(3, "Nome muito curto"),
  document: z.string().min(11, "CNPJ/CPF inválido"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof formSchema>;

export default function W42ConfiguracoesEmpresaPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaving] = useTransition();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      document: "",
      email: "",
      phone: "",
    },
  });

  // Carregar dados reais da empresa
  useEffect(() => {
    async function loadCompany() {
      const result = await getCompanyDetails();
      if (result.success && result.data) {
        form.reset({
          companyName: result.data.companyName,
          document: result.data.document,
          email: result.data.email,
          phone: result.data.phone,
        });
      } else {
        toast.error("Erro ao carregar dados da empresa", { description: result.error });
      }
      setIsLoading(false);
    }
    loadCompany();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (data: SettingsFormValues) => {
    startSaving(async () => {
      const result = await updateCompanyDetails({
        companyName: data.companyName,
        document: data.document,
      });

      if (result.success) {
        toast.success("Configurações salvas com sucesso!", {
          description: "Os dados da empresa foram atualizados na base."
        });
      } else {
        toast.error("Erro ao salvar", { description: result.error });
      }
    });
  };

  if (isLoading) {
    return (
      <main className="flex-1 p-8 bg-surface-container-lowest flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#1A5E35] animate-spin" />
          <span className="text-sm font-bold text-outline">Carregando dados da empresa...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full max-w-[1400px] mx-auto pb-24">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
         <div>
            <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
               Configurações da Empresa
            </h1>
            <p className="text-sm font-medium text-outline mt-2 max-w-2xl leading-relaxed">
               Gerencie as informações fundamentais da sua organização, identidade visual e monitoramento do seu plano atual de assinatura.
            </p>
         </div>
         <div className="shrink-0 flex flex-wrap items-center gap-3">
            <Link href="/configuracoes/sync">
               <button className="flex items-center gap-2 px-6 py-2.5 bg-white border border-[#1A5E35]/50 hover:bg-[#e8f5e9] text-[#1A5E35] font-bold text-sm tracking-wide rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-[#1A5E35]/20">
                  <Activity className="w-4 h-4" /> Sync / Offline
               </button>
            </Link>
            <Link href="/configuracoes/perfil">
               <button className="flex items-center gap-2 px-6 py-2.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white font-bold text-sm tracking-wide rounded-xl shadow-md transition-all active:scale-95 focus:ring-2 focus:ring-[#1A5E35]/20">
                  <User className="w-4 h-4 text-white" /> Meu perfil
               </button>
            </Link>
            <Link href="/configuracoes/usuarios">
               <button className="flex items-center gap-2 px-6 py-2.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white font-bold text-sm tracking-wide rounded-xl shadow-md transition-all active:scale-95 focus:ring-2 focus:ring-[#1A5E35]/20">
                  <Users className="w-4 h-4 text-white" /> Usuários
               </button>
            </Link>
            <Link href="/configuracoes/alertas">
               <button className="flex items-center gap-2 px-6 py-2.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white font-bold text-sm tracking-wide rounded-xl shadow-md transition-all active:scale-95 focus:ring-2 focus:ring-[#1A5E35]/20">
                  <Bell className="w-4 h-4 text-white" /> Alertas
               </button>
            </Link>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA (Main content: form + plan) */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-8">
          
          {/* Card: Dados Cadastrais */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
               <Building2 className="w-5 h-5 text-[#1A5E35]" />
               <h2 className="text-lg font-bold text-[#0D2E1A]">Dados Cadastrais</h2>
            </div>
            
            <form id="settings-form" onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Field: Nome da Empresa */}
              <div className="space-y-1.5">
                 <label className="text-xs font-bold text-[#0D2E1A] uppercase tracking-wider">Nome da Empresa</label>
                 <div className="relative">
                    <input 
                       {...form.register("companyName")}
                       className="w-full bg-surface-container-lowest border border-outline-variant hover:border-[#1A5E35]/50 focus:border-[#1A5E35] px-4 py-2.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 transition-all text-[#0D2E1A]"
                    />
                 </div>
                 {form.formState.errors.companyName && (
                    <p className="text-xs font-bold text-[#c62828] mt-1">{form.formState.errors.companyName.message}</p>
                 )}
              </div>

              {/* Field: CNPJ / CPF */}
              <div className="space-y-1.5">
                 <label className="text-xs font-bold text-[#0D2E1A] uppercase tracking-wider">CNPJ / CPF</label>
                 <div className="relative">
                    <input 
                       {...form.register("document")}
                       className="w-full bg-surface-container-lowest border border-outline-variant hover:border-[#1A5E35]/50 focus:border-[#1A5E35] px-4 py-2.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 transition-all text-[#0D2E1A]"
                    />
                 </div>
                 {form.formState.errors.document && (
                    <p className="text-xs font-bold text-[#c62828] mt-1">{form.formState.errors.document.message}</p>
                 )}
              </div>

              {/* Field: Email de Contato (somente leitura — email do admin logado) */}
              <div className="space-y-1.5">
                 <label className="text-xs font-bold text-[#0D2E1A] uppercase tracking-wider">Email de Contato</label>
                 <div className="relative">
                    <input 
                       type="email"
                       {...form.register("email")}
                       disabled
                       className="w-full bg-surface-container-low border border-outline-variant/50 pl-10 pr-4 py-2.5 rounded-lg text-sm font-medium transition-all text-outline cursor-not-allowed"
                    />
                    <Mail className="w-4 h-4 text-outline absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                 </div>
                 <p className="text-[9px] text-outline mt-0.5">E-mail do administrador logado</p>
              </div>

              {/* Field: Telefone (somente leitura — telefone do admin logado) */}
              <div className="space-y-1.5">
                 <label className="text-xs font-bold text-[#0D2E1A] uppercase tracking-wider">Telefone / WhatsApp</label>
                 <div className="relative">
                    <input 
                       {...form.register("phone")}
                       disabled
                       className="w-full bg-surface-container-low border border-outline-variant/50 pl-10 pr-4 py-2.5 rounded-lg text-sm font-medium transition-all text-outline cursor-not-allowed"
                    />
                    <Phone className="w-4 h-4 text-outline absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                 </div>
                 <p className="text-[9px] text-outline mt-0.5">Telefone do administrador logado</p>
              </div>

            </form>
          </section>

          {/* Card: Plano de Assinatura */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
               <Shield className="w-5 h-5 text-[#1A5E35]" />
               <h2 className="text-lg font-bold text-[#0D2E1A]">Plano de Assinatura</h2>
            </div>

            <div className="bg-[#f0f4f1] border border-[#a5d6a7]/50 rounded-xl p-5 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#1A5E35] rounded-xl flex items-center justify-center shrink-0">
                     <Star className="w-6 h-6 text-white fill-white" />
                  </div>
                  <div>
                     <h3 className="text-base font-bold text-[#0D2E1A]">AgroTech Elite</h3>
                     <p className="text-xs font-medium text-outline mt-0.5">Assinado em 12 de Jan, 2024 • Renovação automática</p>
                  </div>
               </div>
               <button className="px-5 py-2.5 bg-white border border-[#1A5E35]/20 text-[#1A5E35] hover:bg-[#1A5E35] hover:text-white hover:border-[#1A5E35] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors w-full md:w-auto shadow-sm">
                  Mudar Plano
               </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/30">
                  <div className="flex items-center gap-2 mb-2">
                     <Layers className="w-3.5 h-3.5 text-outline" />
                     <span className="text-[10px] font-bold text-outline tracking-wider uppercase">Capacidade</span>
                  </div>
                  <p className="text-sm font-bold text-[#0D2E1A]">12 / 20 Granjas</p>
                  <div className="w-full h-1.5 bg-outline-variant/30 rounded-full mt-3 overflow-hidden">
                     <div className="h-full bg-[#1A5E35] rounded-full w-[60%]"></div>
                  </div>
               </div>

               <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/30">
                  <div className="flex items-center gap-2 mb-2">
                     <Users className="w-3.5 h-3.5 text-outline" />
                     <span className="text-[10px] font-bold text-outline tracking-wider uppercase">Usuários</span>
                  </div>
                  <p className="text-sm font-bold text-[#0D2E1A]">08 / 15 Ativos</p>
                  <div className="w-full h-1.5 bg-outline-variant/30 rounded-full mt-3 overflow-hidden">
                     <div className="h-full bg-[#1A5E35] rounded-full w-[53%]"></div>
                  </div>
               </div>

               <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/30">
                  <div className="flex items-center gap-2 mb-2">
                     <FileText className="w-3.5 h-3.5 text-outline" />
                     <span className="text-[10px] font-bold text-outline tracking-wider uppercase">Relatórios</span>
                  </div>
                  <p className="text-sm font-bold text-[#1A5E35]">Ilimitados</p>
                  <div className="w-full h-1.5 bg-[#a5d6a7]/30 rounded-full mt-3 overflow-hidden flex">
                     <div className="h-full w-full bg-[#a5d6a7] flex items-center justify-center" style={{ background: 'repeating-linear-gradient(45deg, #a5d6a7, #a5d6a7 10px, #c8e6c9 10px, #c8e6c9 20px)' }}></div>
                  </div>
               </div>
            </div>
          </section>

          {/* Central de Segurança Banner */}
          <section className="bg-surface-container rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-auto">
            <div>
               <h3 className="text-sm font-bold text-[#0D2E1A] mb-1">Central de Segurança</h3>
               <p className="text-xs font-medium text-outline">Deseja revisar seus registros de acesso e chaves de API para integrações?</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
               <button className="px-4 py-2 bg-white border border-outline-variant/50 hover:bg-surface-container-low text-[#0D2E1A] font-bold text-xs rounded-lg transition-colors shadow-sm whitespace-nowrap">
                  Ver Logs de Atividade
               </button>
               <button className="px-4 py-2 bg-white border border-outline-variant/50 hover:bg-surface-container-low text-[#0D2E1A] font-bold text-xs rounded-lg transition-colors shadow-sm whitespace-nowrap">
                  Gestão de API
               </button>
            </div>
          </section>

        </div>

        {/* COLUNA DIREITA (Identidade Visual & Actions) */}
        <div className="col-span-1 flex flex-col gap-6">
          
          {/* Box Identidade Visual */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm flex flex-col items-center text-center">
            <h2 className="text-sm font-extrabold text-[#0D2E1A] tracking-wide self-start mb-6 w-full text-left">
               Identidade Visual
            </h2>
            
            <div className="w-32 h-32 bg-[#020202] rounded-2xl flex flex-col items-center justify-center relative group overflow-hidden border border-outline-variant mr-auto ml-auto mb-6 shadow-md transition-all hover:ring-4 hover:ring-[#1A5E35]/20">
               {/* Mockup do logo */}
               <div className="w-14 h-14 border-[3px] border-[#4db6ac] rounded-full flex items-center justify-center mb-1">
                  <div className="w-4 h-4 bg-[#4db6ac] rounded-sm transform rotate-45"></div>
               </div>
               <span className="text-white text-[10px] font-black tracking-widest uppercase">Lee Mock</span>
               <span className="text-[#4db6ac] text-[6px] tracking-[0.2em] uppercase absolute bottom-4">Agro Systems</span>

               <div className="absolute inset-0 bg-[#0D2E1A]/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm cursor-pointer">
                  <Camera className="w-8 h-8 text-white" />
               </div>
            </div>

            <h3 className="text-sm font-bold text-[#0D2E1A]">Upload do Logotipo</h3>
            <p className="text-xs font-medium text-outline mt-1 mb-6 leading-relaxed px-4">
               Formatos suportados:<br/>PNG, JPG ou SVG.<br/>Tamanho máximo 2MB.
            </p>

            <button className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/50 hover:bg-surface-container-low text-[#0D2E1A] font-bold text-xs tracking-wider uppercase rounded-lg transition-colors">
               Trocar Imagem
            </button>
          </section>

          {/* Primary Action */}
          <button 
            type="submit" 
            form="settings-form"
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white font-extrabold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </button>

          {/* Danger Action */}
          <button 
            type="button"
            className="w-full flex items-center justify-center px-6 py-3.5 bg-white border border-[#c62828]/30 hover:bg-[#ffebee] text-[#c62828] font-bold text-sm rounded-xl transition-colors"
          >
             Desativar Conta
          </button>

          {/* Alert Notice */}
          <div className="bg-[#ffebee] border border-[#ffcdd2] rounded-xl p-5 shadow-sm">
             <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-[#c62828] shrink-0" />
                <h4 className="text-xs font-extrabold text-[#c62828] uppercase tracking-wider">Atenção</h4>
             </div>
             <p className="text-xs font-semibold text-[#c62828]/80 leading-relaxed">
                As alterações de CNPJ podem exigir a revalidação da sua conta em até 48 horas úteis para garantir a conformidade fiscal.
             </p>
          </div>

        </div>

      </div>

    </main>
  );
}
