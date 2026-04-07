"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  Camera, 
  ArrowLeft,
  Bell,
  History,
  ShieldCheck,
  Info,
  Loader2
} from "lucide-react";
import { getUserProfile, updateUserProfile, changePassword } from "@/app/actions/configuracoes";

const profileSchema = z.object({
  fullName: z.string().min(3, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  role: z.string()
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Senha atual obrigatória"),
  newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirme a nova senha"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador Geral",
  OPERADOR: "Operador de Campo",
  VETERINARIO: "Veterinário RT",
};

export default function W44PerfilUsuarioPage() {
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, startSavingProfile] = useTransition();
  const [isSavingPassword, startSavingPassword] = useTransition();

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      role: ""
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const [notifications, setNotifications] = useState({
    mortality: true,
    weeklyReports: true,
    lowFeed: false,
    maintenance: true
  });

  // Carregar dados reais do perfil
  useEffect(() => {
    async function loadProfile() {
      const result = await getUserProfile();
      if (result.success && result.data) {
        profileForm.reset({
          fullName: result.data.name,
          email: result.data.email,
          phone: result.data.phone || "",
          role: roleLabels[result.data.role] || result.data.role,
        });
      } else {
        toast.error("Erro ao carregar perfil", { description: result.error });
      }
      setIsLoadingProfile(false);
    }
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onProfileSubmit = (data: ProfileFormValues) => {
    startSavingProfile(async () => {
      const result = await updateUserProfile({
        name: data.fullName,
        phone: data.phone,
      });

      if (result.success) {
        toast.success("Perfil salvo com sucesso!", {
          description: "Suas informações foram atualizadas no sistema."
        });
      } else {
        toast.error("Erro ao salvar perfil", { description: result.error });
      }
    });
  };

  const onPasswordSubmit = (data: PasswordFormValues) => {
    startSavingPassword(async () => {
      const result = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (result.success) {
        toast.success("Senha alterada com sucesso!", {
          description: "Sua nova senha já está ativa."
        });
        passwordForm.reset();
      } else {
        toast.error("Erro ao alterar senha", { description: result.error });
      }
    });
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoadingProfile) {
    return (
      <main className="flex-1 p-8 bg-surface-container-lowest flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#1A5E35] animate-spin" />
          <span className="text-sm font-bold text-outline">Carregando perfil...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full max-w-[1400px] mx-auto pb-24">
      
      {/* HEADER & ACTION */}
      <div className="mb-10 flex justify-between items-end gap-4">
         <div>
            <Link href="/configuracoes" className="inline-flex mb-4">
               <span className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">
               <ArrowLeft className="w-4 h-4" /> Voltar
               
            </span>
            </Link>
            <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
               Configurações de Perfil
            </h1>
            <p className="text-sm font-medium text-outline mt-2 max-w-2xl leading-relaxed">
               Gerencie suas informações pessoais, segurança e preferências de notificação.
            </p>
         </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* COLUNA ESQUERDA (Profile Data & Password) */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          
          {/* USER DETAILS CARD */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm flex flex-col md:flex-row gap-8">
             
             {/* Avatar area */}
             <div className="flex flex-col items-center shrink-0">
                <div className="w-32 h-32 bg-[#ffcdd2] rounded-2xl flex items-center justify-center relative overflow-hidden mb-3 border border-outline-variant shadow-inner">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profileForm.watch("fullName") || "User"}&backgroundColor=ffcdd2`} alt="Avatar" className="w-full h-full object-cover" />
                   <button className="absolute bottom-2 right-2 w-8 h-8 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white rounded-full flex items-center justify-center transition-colors shadow-lg">
                      <Camera className="w-4 h-4" />
                   </button>
                </div>
             </div>

             {/* Profile Form */}
             <form id="profile-form" onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                   <label className="text-[10px] font-extrabold text-[#1A5E35] uppercase tracking-wider">Nome Completo</label>
                   <input 
                      {...profileForm.register("fullName")}
                      className="w-full bg-white border border-outline-variant/50 hover:border-[#1A5E35]/50 focus:border-[#1A5E35] px-4 py-2.5 rounded-lg text-sm font-bold text-[#0D2E1A] focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 transition-all"
                   />
                   {profileForm.formState.errors.fullName && <p className="text-[10px] text-[#c62828] mt-1">{profileForm.formState.errors.fullName.message}</p>}
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-extrabold text-[#1A5E35] uppercase tracking-wider">E-mail Profissional</label>
                   <input 
                      type="email"
                      {...profileForm.register("email")}
                      disabled
                      className="w-full bg-surface-container-low border border-outline-variant/50 px-4 py-2.5 rounded-lg text-sm font-bold text-outline transition-all cursor-not-allowed"
                   />
                   <p className="text-[9px] text-outline mt-0.5">O e-mail não pode ser alterado</p>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-extrabold text-[#1A5E35] uppercase tracking-wider">Telefone</label>
                   <input 
                      {...profileForm.register("phone")}
                      className="w-full bg-white border border-outline-variant/50 hover:border-[#1A5E35]/50 focus:border-[#1A5E35] px-4 py-2.5 rounded-lg text-sm font-bold text-[#0D2E1A] focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 transition-all"
                   />
                   {profileForm.formState.errors.phone && <p className="text-[10px] text-[#c62828] mt-1">{profileForm.formState.errors.phone.message}</p>}
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-extrabold text-[#1A5E35] uppercase tracking-wider">Cargo</label>
                   <input 
                      {...profileForm.register("role")}
                      disabled
                      className="w-full bg-surface-container-low border border-outline-variant/50 px-4 py-2.5 rounded-lg text-sm font-bold text-outline transition-all cursor-not-allowed"
                   />
                </div>

             </form>
          </section>

          {/* CHANGE PASSWORD CARD */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm relative">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <History className="w-5 h-5 text-[#1A5E35]" />
                   <h2 className="text-lg font-bold text-[#0D2E1A]">Alterar Senha</h2>
                </div>
             </div>

             <form id="password-form" onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="space-y-1">
                   <label className="text-[10px] font-extrabold text-[#0D2E1A] uppercase tracking-wider">Senha Atual</label>
                   <input 
                      type="password"
                      placeholder="********"
                      {...passwordForm.register("currentPassword")}
                      className="w-full bg-white border border-outline-variant hover:border-[#1A5E35]/50 focus:border-[#1A5E35] px-4 py-2.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 transition-all text-[#0D2E1A]"
                   />
                   {passwordForm.formState.errors.currentPassword && <p className="text-[10px] text-[#c62828] mt-1">{passwordForm.formState.errors.currentPassword.message}</p>}
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-extrabold text-[#0D2E1A] uppercase tracking-wider">Nova Senha</label>
                   <input 
                      type="password"
                      placeholder="********"
                      {...passwordForm.register("newPassword")}
                      className="w-full bg-white border border-outline-variant hover:border-[#1A5E35]/50 focus:border-[#1A5E35] px-4 py-2.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 transition-all text-[#0D2E1A]"
                   />
                   {passwordForm.formState.errors.newPassword && <p className="text-[10px] text-[#c62828] mt-1">{passwordForm.formState.errors.newPassword.message}</p>}
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-extrabold text-[#0D2E1A] uppercase tracking-wider">Confirmar Nova Senha</label>
                   <input 
                      type="password"
                      placeholder="********"
                      {...passwordForm.register("confirmPassword")}
                      className="w-full bg-white border border-outline-variant hover:border-[#1A5E35]/50 focus:border-[#1A5E35] px-4 py-2.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 transition-all text-[#0D2E1A]"
                   />
                   {passwordForm.formState.errors.confirmPassword && <p className="text-[10px] text-[#c62828] mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>}
                </div>
                
                <div className="md:col-span-3 flex justify-end mt-2">
                   <Link href="/recuperar-senha" className="text-sm font-bold text-[#1A5E35] hover:text-[#0D2E1A] transition-colors">
                      Esqueceu a senha?
                   </Link>
                </div>
             </form>
          </section>

        </div>

        {/* COLUNA DIREITA (Notifications & Plan) */}
        <div className="col-span-1 flex flex-col gap-6">
          
          {/* Notifications List */}
          <section className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
               <Bell className="w-5 h-5 text-[#1A5E35]" />
               <h2 className="text-lg font-bold text-[#0D2E1A]">Notificações</h2>
            </div>
            
            <div className="space-y-6">
               
               <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#0D2E1A]">Alertas de Mortalidade</span>
                  <button 
                     type="button"
                     onClick={() => toggleNotification('mortality')}
                     className={`w-12 h-6 flex items-center rounded-full transition-colors px-1 ${notifications.mortality ? 'bg-[#1A5E35]' : 'bg-outline-variant/30'}`}
                  >
                     <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${notifications.mortality ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
               </div>

               <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#0D2E1A]">Relatórios Semanais</span>
                  <button 
                     type="button"
                     onClick={() => toggleNotification('weeklyReports')}
                     className={`w-12 h-6 flex items-center rounded-full transition-colors px-1 ${notifications.weeklyReports ? 'bg-[#1A5E35]' : 'bg-outline-variant/30'}`}
                  >
                     <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${notifications.weeklyReports ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
               </div>

               <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#0D2E1A]">Baixo Nível de Ração</span>
                  <button 
                     type="button"
                     onClick={() => toggleNotification('lowFeed')}
                     className={`w-12 h-6 flex items-center rounded-full transition-colors px-1 ${notifications.lowFeed ? 'bg-[#1A5E35]' : 'bg-outline-variant/30'}`}
                  >
                     <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${notifications.lowFeed ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
               </div>

               <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#0D2E1A]">Manutenção Preventiva</span>
                  <button 
                     type="button"
                     onClick={() => toggleNotification('maintenance')}
                     className={`w-12 h-6 flex items-center rounded-full transition-colors px-1 ${notifications.maintenance ? 'bg-[#1A5E35]' : 'bg-outline-variant/30'}`}
                  >
                     <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${notifications.maintenance ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
               </div>

            </div>
          </section>

          {/* Precision Pro Plan Card */}
          <section className="bg-[#1A5E35] rounded-2xl p-6 shadow-md relative overflow-hidden group">
            {/* Background element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:bg-white/10 transition-colors"></div>

            <div className="relative z-10">
               <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-[#a5d6a7]" />
                  <span className="text-[10px] font-extrabold text-[#a5d6a7] uppercase tracking-widest">Plano Precision Pro</span>
               </div>
               
               <h3 className="text-xl font-manrope font-extrabold text-white leading-tight mb-6">
                  Gerenciamento Ilimitado
               </h3>

               {/* Barra de Progresso */}
               <div className="mb-2">
                  <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                     <div className="h-full bg-[#a5d6a7] w-[85%] rounded-full shadow-[0_0_10px_rgba(165,214,167,0.5)]"></div>
                  </div>
               </div>

               <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/80">
                  <span>8.5 GB de 10 GB</span>
                  <span className="text-[#a5d6a7]">Renova em 12 dias</span>
               </div>
            </div>
          </section>

        </div>

      </div>

      {/* FOOTER ACTIONS (Bottom Bar) */}
      <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="flex items-center gap-2 text-outline">
            <Info className="w-4 h-4" />
            <span className="text-xs font-medium">Dados carregados do servidor. Alterações são salvas diretamente no banco.</span>
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
               type="button"
               onClick={() => window.location.reload()}
               className="flex-1 md:flex-none px-6 py-2.5 bg-surface-container hover:bg-surface-container-low text-[#0D2E1A] font-bold text-sm rounded-xl transition-colors"
            >
               Descartar
            </button>
            <button 
               disabled={isSavingProfile || isSavingPassword}
               onClick={() => {
                 document.getElementById("profile-form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
               }}
               className="flex-1 md:flex-none px-6 py-2.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white font-extrabold text-sm rounded-xl transition-colors shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
               {(isSavingProfile || isSavingPassword) && <Loader2 className="w-4 h-4 animate-spin" />}
               Salvar Alterações
            </button>
         </div>
      </div>

    </main>
  );
}
