"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { 
  Search, 
  UserPlus, 
  PenSquare, 
  Trash2, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Globe,
  X,
  Check,
  Loader2,
  AlertTriangle,
  Copy
} from "lucide-react";
import { toast } from "sonner";
import { 
  getCompanyUsers, 
  createUser, 
  updateUser, 
  deleteUser 
} from "@/app/actions/configuracoes";

const systemModules = [
   "Dashboard", "Granjas", "Lotes", "Mortalidade", "Pesagens", 
   "Ração", "Estoque", "Sanidade", "Tarefas", "Relatórios", "Linhagens"
];

type UserData = {
  id: string;
  authId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  farms: string[];
};

const roleColorMap: Record<string, string> = {
  ADMIN: "bg-[#e8f5e9] text-[#2e7d32]",
  OPERADOR: "bg-[#e3f2fd] text-[#1565c0]",
  VETERINARIO: "bg-[#f3e5f5] text-[#7b1fa2]",
};

const roleLabelMap: Record<string, string> = {
  ADMIN: "Admin",
  OPERADOR: "Operador",
  VETERINARIO: "Veterinário",
};

export default function W43GerenciarUsuariosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"invite" | "edit">("invite");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  // Data from server
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState({ total: 0, operadores: 0, veterinarios: 0, admins: 0 });

  // Form State
  const [formData, setFormData] = useState({
     name: "",
     email: "",
     phone: "",
     role: "Operador",
     access: systemModules.reduce((acc, mod) => ({ ...acc, [mod]: "NONE" }), {} as Record<string, string>)
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  async function loadUsers() {
    const result = await getCompanyUsers();
    if (result.success && result.data) {
      setUsers(result.data.users);
      setStats({
        total: result.data.total,
        operadores: result.data.operadores,
        veterinarios: result.data.veterinarios,
        admins: result.data.admins,
      });
    } else {
      toast.error("Erro ao carregar usuários", { description: result.error });
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtro de busca
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (roleLabelMap[u.role] || u.role).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / perPage));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * perPage, currentPage * perPage);

  const openInviteModal = () => {
     setModalMode("invite");
     setSelectedUserId(null);
     setFormData({
        name: "", email: "", phone: "", role: "Operador",
        access: systemModules.reduce((acc, mod) => ({ ...acc, [mod]: "NONE" }), {} as Record<string, string>)
     });
     setIsModalOpen(true);
  };

  const openEditModal = (user: UserData) => {
     setModalMode("edit");
     setSelectedUserId(user.id);
     setFormData({
        name: user.name, 
        email: user.email, 
        phone: user.phone,
        role: roleLabelMap[user.role] || user.role,
        access: systemModules.reduce((acc, mod) => ({ 
           ...acc, 
           [mod]: user.role === "ADMIN" ? "VER_EDITAR" : (mod === "Dashboard" || mod === "Granjas" ? "READ_ONLY" : "NONE")
        }), {} as Record<string, string>)
     });
     setIsModalOpen(true);
  };

  const handleSave = () => {
    startSaving(async () => {
      if (modalMode === "invite") {
        const result = await createUser({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
        });

        if (result.success) {
          setIsModalOpen(false);
          toast.success("Usuário criado com sucesso!", {
            description: `Senha temporária: ${result.tempPassword}`,
            duration: 15000,
            action: {
              label: "Copiar senha",
              onClick: () => {
                navigator.clipboard.writeText(result.tempPassword || "");
                toast.info("Senha copiada!");
              }
            }
          });
          await loadUsers();
        } else {
          toast.error("Erro ao criar usuário", { description: result.error });
        }
      } else if (modalMode === "edit" && selectedUserId) {
        const result = await updateUser(selectedUserId, {
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
        });

        if (result.success) {
          setIsModalOpen(false);
          toast.success("Permissões atualizadas com sucesso!");
          await loadUsers();
        } else {
          toast.error("Erro ao atualizar", { description: result.error });
        }
      }
    });
  };

  const handleDelete = (userId: string) => {
    setDeleteTargetId(userId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    startDeleting(async () => {
      const result = await deleteUser(deleteTargetId);
      if (result.success) {
        toast.success("Acesso revogado com sucesso!");
        setIsDeleteConfirmOpen(false);
        setDeleteTargetId(null);
        await loadUsers();
      } else {
        toast.error("Erro ao revogar acesso", { description: result.error });
      }
    });
  };

  const updateModuleAccess = (moduleName: string, level: string) => {
     setFormData(prev => ({
        ...prev,
        access: { ...prev.access, [moduleName]: level }
     }));
  };

  if (isLoading) {
    return (
      <main className="flex-1 p-8 bg-surface-container-lowest flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#1A5E35] animate-spin" />
          <span className="text-sm font-bold text-outline">Carregando usuários...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full max-w-[1400px] mx-auto pb-24">
      
      {/* HEADER & ACTION */}
      <div className="mb-8 flex justify-between items-end gap-4">
         <div>
            <Link href="/configuracoes" className="inline-flex mb-4">
               <span className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">
               <ArrowLeft className="w-4 h-4" /> Voltar
               
            </span>
            </Link>
            <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
               Gerenciar Usuários
            </h1>
            <p className="text-sm font-medium text-outline mt-2 max-w-2xl leading-relaxed">
               Controle de acessos, permissões e vinculação de granjas para a equipe técnica e administrativa.
            </p>
         </div>
         <div>
            <button 
               onClick={openInviteModal}
               className="flex items-center gap-2 px-6 py-3 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white font-bold text-sm tracking-wide rounded-xl shadow-md transition-all active:scale-95"
            >
               <UserPlus className="w-4 h-4" /> Convidar Usuário
            </button>
         </div>
      </div>

      {/* KPIs */}
      <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-6 mb-8 flex flex-col md:flex-row justify-between divide-y md:divide-y-0 md:divide-x divide-outline-variant/30">
         
         <div className="flex-1 px-4 py-2 first:pl-0 last:pr-0">
            <h3 className="text-[10px] font-bold tracking-wider uppercase text-outline mb-3">Total de Usuários</h3>
            <p className="text-4xl font-extrabold text-[#0D2E1A]">{stats.total}</p>
         </div>

         <div className="flex-1 px-4 py-2 first:pl-0 last:pr-0">
            <h3 className="text-[10px] font-bold tracking-wider uppercase text-outline mb-3">Operadores Ativos</h3>
            <p className="text-4xl font-extrabold text-[#0D2E1A]">{stats.operadores}</p>
         </div>

         <div className="flex-1 px-4 py-2 first:pl-0 last:pr-0">
            <h3 className="text-[10px] font-bold tracking-wider uppercase text-outline mb-3">Veterinários</h3>
            <p className="text-4xl font-extrabold text-[#0D2E1A]">{stats.veterinarios}</p>
         </div>

         <div className="flex-1 px-4 py-2 first:pl-0 last:pr-0">
            <h3 className="text-[10px] font-bold tracking-wider uppercase text-outline mb-3">Administradores</h3>
            <p className="text-4xl font-extrabold text-[#0D2E1A]">{stats.admins}</p>
         </div>

      </div>

      {/* SEARCH BAR */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-outline absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input 
            type="text"
            placeholder="Buscar por nome, email ou cargo..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full bg-white border border-outline-variant/50 focus:border-[#1A5E35] pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 transition-all text-[#0D2E1A]"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden mb-8">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-outline-variant/30">
                     <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-outline w-[35%]">Usuário</th>
                     <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-outline w-[20%]">Função</th>
                     <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-outline w-[30%]">Granjas Vinculadas</th>
                     <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-outline w-[15%] text-right">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-outline-variant/10">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-sm font-medium text-outline">
                        {searchTerm ? "Nenhum usuário encontrado para essa busca." : "Nenhum usuário cadastrado."}
                      </td>
                    </tr>
                  ) : paginatedUsers.map((user) => (
                     <tr key={user.id} className="hover:bg-surface-container-lowest transition-colors group">
                        
                        {/* Usuário Col */}
                        <td className="px-6 py-4 flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-[#e8f5e9] flex items-center justify-center text-[#2e7d32] font-bold text-sm shrink-0 border border-[#c8e6c9]">
                              {user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                           </div>
                           <div>
                              <p className="text-sm font-bold text-[#0D2E1A]">{user.name}</p>
                              <p className="text-xs font-medium text-outline mt-0.5">{user.email}</p>
                           </div>
                        </td>

                        {/* Função Col */}
                        <td className="px-6 py-4">
                           <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-white shrink-0 ${roleColorMap[user.role] || "bg-surface-container text-outline"}`}>
                              {roleLabelMap[user.role] || user.role}
                           </span>
                        </td>

                        {/* Granjas Col */}
                        <td className="px-6 py-4">
                           <div className="flex flex-wrap items-center gap-2">
                              {user.farms.map((farm, i) => (
                                 <span key={i} className="inline-flex items-center px-2.5 py-1 bg-surface-container border border-outline-variant/50 text-[#0D2E1A] rounded text-[10px] font-bold whitespace-nowrap">
                                    {farm}
                                 </span>
                              ))}
                           </div>
                        </td>

                        {/* Ações Col */}
                        <td className="px-6 py-4">
                           <div className="flex items-center justify-end gap-3 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditModal(user)} className="text-outline hover:text-[#1A5E35] transition-colors p-1" title="Editar Usuário">
                                 <PenSquare className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(user.id)} className="text-outline hover:text-[#c62828] transition-colors p-1" title="Revogar Acesso">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        </td>

                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* Pagination */}
         <div className="px-6 py-4 border-t border-outline-variant/30 flex items-center justify-between text-xs font-bold text-outline">
            <span className="font-medium">Mostrando {paginatedUsers.length} de {filteredUsers.length} usuários</span>
            <div className="flex items-center gap-1">
               <button 
                 disabled={currentPage <= 1}
                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                 className="p-1 hover:bg-surface-container rounded transition-colors disabled:opacity-30 disabled:pointer-events-none"
               >
                  <ChevronLeft className="w-4 h-4" />
               </button>
               {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                 <button 
                   key={page}
                   onClick={() => setCurrentPage(page)}
                   className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors ${
                     page === currentPage ? 'bg-[#0D2E1A] text-white' : 'hover:bg-surface-container text-[#0D2E1A]'
                   }`}
                 >
                   {page}
                 </button>
               ))}
               <button 
                 disabled={currentPage >= totalPages}
                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                 className="p-1 hover:bg-surface-container rounded transition-colors disabled:opacity-30 disabled:pointer-events-none hover:text-[#0D2E1A]"
               >
                  <ChevronRight className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>

      {/* BANNER INFERIOR DE SEGURANÇA */}
      <div className="bg-[#0D2E1A] rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-lg relative group">
         
         <div className="p-8 md:p-10 flex-1 relative z-10 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
               <ShieldCheck className="w-6 h-6 text-[#a5d6a7]" />
               <h2 className="text-xl font-manrope font-extrabold text-white">Segurança e Auditoria</h2>
            </div>
            <p className="text-white/80 text-sm font-medium leading-relaxed max-w-lg mb-6">
               Todas as alterações de permissões e convites são registradas em nosso log de auditoria. Certifique-se de atribuir funções que respeitem o princípio do privilégio mínimo para cada colaborador.
            </p>
            <button className="self-start text-[#a5d6a7] uppercase tracking-widest text-xs font-bold hover:text-white transition-colors flex items-center gap-2">
               Ver Relatório de Atividades &rarr;
            </button>
         </div>

         {/* Vetor Mapa e Blur overlay */}
         <div className="w-full md:w-1/3 min-h-[160px] md:min-h-full relative overflow-hidden flex items-end justify-end p-6 bg-[#092211]">
            <Globe className="absolute -top-10 -right-10 w-64 h-64 text-[#a5d6a7]/5 scale-150 rotate-12 group-hover:rotate-45 transition-transform duration-1000 ease-out pointer-events-none" />
            
            <div className="relative z-10 bg-[#0D2E1A]/80 backdrop-blur border border-[#1A5E35]/50 px-4 py-2.5 rounded-lg flex items-center gap-2">
               <ShieldCheck className="w-4 h-4 text-[#a5d6a7]" />
               <span className="text-[10px] font-bold text-[#a5d6a7] uppercase tracking-wider">Sistemas Protegidos AgroTech</span>
            </div>
         </div>
         
      </div>

      {/* MODAL CADASTRAR/EDITAR */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D2E1A]/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col relative animate-in zoom-in-95 duration-200 border border-outline-variant/30">
               
               <button 
                  onClick={() => setIsModalOpen(false)}
                  className="absolute p-2 rounded-full hover:bg-surface-container top-4 right-4 text-outline transition-colors z-10"
               >
                  <X className="w-5 h-5" />
               </button>

               <div className="p-8 border-b border-outline-variant/30 bg-surface-container-lowest sticky top-0 z-0">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-10 h-10 bg-[#e8f5e9] rounded-xl flex items-center justify-center">
                        {modalMode === "invite" ? <UserPlus className="w-5 h-5 text-[#1A5E35]" /> : <PenSquare className="w-5 h-5 text-[#1A5E35]" />}
                     </div>
                     <h2 className="text-2xl font-manrope font-extrabold text-[#0D2E1A]">
                        {modalMode === "invite" ? "Convidar Novo Usuário" : "Editar Permissões"}
                     </h2>
                  </div>
                  <p className="text-sm font-medium text-outline">
                     {modalMode === "invite" ? "Preencha os dados abaixo e defina os acessos por granja." : "Ajuste os dados do usuário e revise os níveis de acesso de cada unidade."}
                  </p>
               </div>

               <div className="p-8">
                  {/* DADOS PESSOAIS */}
                  <h3 className="text-[10px] font-extrabold text-[#1A5E35] uppercase tracking-wider mb-4 border-b border-outline-variant/20 pb-2">Informações Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                     <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-[#0D2E1A] uppercase tracking-wider">Nome Completo</label>
                        <input 
                           type="text" 
                           value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                           className="w-full bg-white border border-outline-variant/50 hover:border-[#1A5E35]/50 focus:border-[#1A5E35] px-4 py-2.5 rounded-lg text-sm font-bold text-[#0D2E1A] focus:outline-none focus:ring-1 focus:ring-[#1A5E35] transition-all"
                           placeholder="Ex: João Silva"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-[#0D2E1A] uppercase tracking-wider">E-mail</label>
                        <input 
                           type="email" 
                           disabled={modalMode === "edit"}
                           value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                           className="w-full bg-white border border-outline-variant/50 disabled:bg-surface-container disabled:cursor-not-allowed hover:border-[#1A5E35]/50 focus:border-[#1A5E35] px-4 py-2.5 rounded-lg text-sm font-bold text-[#0D2E1A] focus:outline-none focus:ring-1 focus:ring-[#1A5E35] transition-all"
                           placeholder="joao@exemplo.com"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-[#0D2E1A] uppercase tracking-wider">Telefone</label>
                        <input 
                           type="text" 
                           value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                           className="w-full bg-white border border-outline-variant/50 hover:border-[#1A5E35]/50 focus:border-[#1A5E35] px-4 py-2.5 rounded-lg text-sm font-bold text-[#0D2E1A] focus:outline-none focus:ring-1 focus:ring-[#1A5E35] transition-all"
                           placeholder="(XX) XXXXX-XXXX"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-[#0D2E1A] uppercase tracking-wider">Cargo / Papel Global</label>
                        <select 
                           value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}
                           className="w-full bg-white border border-outline-variant/50 hover:border-[#1A5E35]/50 focus:border-[#1A5E35] px-4 py-3 rounded-lg text-sm font-bold text-[#0D2E1A] focus:outline-none focus:ring-1 focus:ring-[#1A5E35] transition-all cursor-pointer"
                        >
                           <option value="Operador">Operador (Campo)</option>
                           <option value="Veterinário">Veterinário (Técnico)</option>
                           <option value="Admin">Administrador (Gerência)</option>
                        </select>
                     </div>
                  </div>

                  {/* ACESSOS E PERMISSÕES (O CORE!) */}
                  <div className="flex items-center justify-between mb-4 border-b border-outline-variant/20 pb-2">
                     <h3 className="text-[10px] font-extrabold text-[#1A5E35] uppercase tracking-wider">Permissões de Acesso por Módulo (Menu)</h3>
                     <span className="text-[10px] font-semibold text-outline px-2 py-0.5 bg-surface-container rounded uppercase">Nível Global</span>
                  </div>
                  
                  <div className="space-y-3">
                     {systemModules.map((moduleName) => {
                        const level = formData.access[moduleName] || "NONE";
                        return (
                           <div key={moduleName} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface-container-lowest border border-outline-variant/50 rounded-xl hover:border-[#1A5E35]/50 transition-colors">
                              <span className="text-sm font-bold text-[#0D2E1A] mb-3 sm:mb-0">{moduleName}</span>
                              
                              <div className="flex bg-surface-container rounded-lg p-1">
                                 <button
                                    onClick={() => updateModuleAccess(moduleName, 'NONE')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${level === 'NONE' ? 'bg-white shadow text-outline-variant' : 'text-outline hover:text-[#0D2E1A]'}`}
                                 >
                                    Sem Acesso
                                 </button>
                                 <button
                                    onClick={() => updateModuleAccess(moduleName, 'READ_ONLY')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${level === 'READ_ONLY' ? 'bg-white shadow text-[#1565c0]' : 'text-outline hover:text-[#0D2E1A]'}`}
                                 >
                                    Visualizar
                                 </button>
                                 <button
                                    onClick={() => updateModuleAccess(moduleName, 'VER_EDITAR')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${level === 'VER_EDITAR' ? 'bg-[#0D2E1A] shadow text-white' : 'text-outline hover:text-[#0D2E1A]'}`}
                                 >
                                    Ver & Editar
                                 </button>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>

               {/* MODAL FOOTER */}
               <div className="p-6 border-t border-outline-variant/30 bg-surface-container-lowest flex justify-end gap-3 sticky bottom-0 rounded-b-2xl">
                  <button 
                     onClick={() => setIsModalOpen(false)}
                     className="px-6 py-2.5 bg-transparent hover:bg-surface-container text-[#0D2E1A] font-bold text-sm rounded-xl transition-colors"
                  >
                     Cancelar
                  </button>
                  <button 
                     onClick={handleSave}
                     disabled={isSaving}
                     className="px-6 py-2.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white font-extrabold text-sm rounded-xl transition-colors flex items-center gap-2 shadow-md active:scale-95 disabled:opacity-50"
                  >
                     {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                     {modalMode === "invite" ? "Enviar Convite" : "Salvar Permissões"}
                  </button>
               </div>

            </div>
         </div>
      )}

      {/* MODAL CONFIRMAÇÃO DELETE */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D2E1A]/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200 border border-outline-variant/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#ffebee] rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#c62828]" />
              </div>
              <h2 className="text-xl font-manrope font-extrabold text-[#0D2E1A]">Revogar Acesso</h2>
            </div>
            <p className="text-sm font-medium text-outline mb-6 leading-relaxed">
              Tem certeza que deseja revogar o acesso deste usuário? Essa ação removerá o usuário do sistema permanentemente.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTargetId(null); }}
                className="px-6 py-2.5 bg-transparent hover:bg-surface-container text-[#0D2E1A] font-bold text-sm rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-[#c62828] hover:bg-[#b71c1c] text-white font-extrabold text-sm rounded-xl transition-colors flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Confirmar Revogação
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
