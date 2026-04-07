"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  Filter, 
  Plus, 
  MoreHorizontal,
  MapPin,
  Calendar as CalendarIcon,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  X,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Camera,
  XCircle,
  FileImage,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  getActiveTasks,
  getAuditTasks,
  getTaskFormData,
  createTask,
  updateTaskStatus,
  deleteTask,
  type TaskRecord,
  type UserOption,
  type FlockOption,
} from "@/app/actions/tarefas";
import { createClient } from "@/lib/supabase/client";

// ================================================
// FORM VALIDATION SCHEMA
// ================================================
const novaTarefaSchema = z.object({
  titulo: z.string().min(3, "O título precisa ter pelo menos 3 caracteres."),
  descricao: z.string().min(10, "Forneça uma descrição com pelo menos 10 caracteres."),
  prioridade: z.enum(["LOW", "MEDIUM", "HIGH"]),
  responsavel: z.string().optional(),
  prazo: z.string().optional(),
  flockId: z.string().optional(),
  localizacao: z.string().optional(),
});

type NovaTarefaFormValues = z.infer<typeof novaTarefaSchema>;

// ================================================
// COMPONENTS
// ================================================

const PriorityBadge = ({ priority }: { priority: string }) => {
  if (priority === "HIGH") {
    return (
      <span className="bg-[#ffebee] text-[#c62828] px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-[#ffcdd2]/50">
        High
      </span>
    );
  }
  if (priority === "MEDIUM") {
    return (
      <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-orange-200/50">
        Medium
      </span>
    );
  }
  return (
    <span className="bg-[#e8f5e9] text-[#2e7d32] px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-[#c8e6c9]/50">
      Low
    </span>
  );
};

// ================================================
// HELPERS
// ================================================

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Amanhã";
  if (diffDays === -1) return "Ontem";
  if (diffDays < -1) return `${Math.abs(diffDays)}d atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ================================================
// MAIN PAGE
// ================================================

export default function W33ListaTarefasPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [auditTasks, setAuditTasks] = useState<TaskRecord[]>([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [flocks, setFlocks] = useState<FlockOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<{taskId: string; fromStatus: string} | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterUserId, setFilterUserId] = useState<string>("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const [filterMenu, setFilterMenu] = useState<"root" | "priority" | "user">("root");

  // Evidence state
  const [expandedAuditTaskIds, setExpandedAuditTaskIds] = useState<string[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const supabase = createClient();

  const toggleAuditTaskExpand = (taskId: string) => {
    setExpandedAuditTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NovaTarefaFormValues>({
    resolver: zodResolver(novaTarefaSchema),
    defaultValues: { prioridade: "LOW" },
  });

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ================================================
  // DATA LOADING
  // ================================================

  const loadTasks = useCallback(async () => {
    try {
      if (navigator.onLine) {
        const result = await getActiveTasks();
        if (result.error) {
          toast.error(result.error);
        } else {
          setTasks(result.tasks || []);
          localStorage.setItem("cached_active_tasks", JSON.stringify(result.tasks || []));
        }
      } else {
        const cached = localStorage.getItem("cached_active_tasks");
        if (cached) setTasks(JSON.parse(cached));
      }
    } catch (err) {
      toast.error("Erro ao carregar tarefas ativas.");
    }
  }, []);

  const loadAuditTasks = async () => {
    try {
      if (navigator.onLine) {
        const result = await getAuditTasks();
        if (result.error) {
          toast.error(result.error);
        } else {
          setAuditTasks(result.tasks || []);
          localStorage.setItem("cached_audit_tasks", JSON.stringify(result.tasks || []));
        }
      } else {
        const cached = localStorage.getItem("cached_audit_tasks");
        if (cached) setAuditTasks(JSON.parse(cached));
      }
    } catch {
      toast.error("Erro ao carregar histórico.");
    }
  };

  const loadFormData = useCallback(async () => {
    try {
      const result = await getTaskFormData();
      if (result.error) return;
      setUsers(result.users || []);
      setFlocks(result.flocks || []);
    } catch {
      // silently fail — form will show empty dropdowns
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadTasks(), loadFormData()]);
      setLoading(false);
    };
    init();
  }, [loadTasks, loadFormData]);

  // ================================================
  // COMPUTED COLUMNS
  // ================================================

  const filteredTasks = tasks.filter((t) => {
    const matchesPriority = filterPriority === "ALL" || t.priority === filterPriority;
    const matchesUser = filterUserId === "ALL" || t.assignedTo?.id === filterUserId;
    return matchesPriority && matchesUser;
  });

  const hasActiveFilters = filterPriority !== "ALL" || filterUserId !== "ALL";
  const activeFilterUser = filterUserId !== "ALL" ? users.find(u => u.id === filterUserId) : null;

  const todoTasks = filteredTasks.filter((t) => t.status === "TODO");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "IN_PROGRESS");

  // KPIs
  const highPriorityCount = tasks.filter((t) => t.priority === "HIGH").length;
  const totalTasks = tasks.length;

  // ================================================
  // ACTIONS
  // ================================================

  const handleNovaTarefaClick = () => {
    setEditingTaskId(null);
    reset({
      titulo: "",
      descricao: "",
      prioridade: "LOW",
      responsavel: "",
      prazo: "",
      flockId: "",
      localizacao: "",
    });
    setIsCreateModalOpen(true);
  };

  const handleEditTaskClick = () => {
    if (!selectedTask) return;
    setEditingTaskId(selectedTask.id);
    reset({
      titulo: selectedTask.title,
      descricao: selectedTask.description || "",
      prioridade: selectedTask.priority as "LOW" | "MEDIUM" | "HIGH",
      responsavel: selectedTask.assignedTo?.id || "",
      prazo: selectedTask.dueDate ? selectedTask.dueDate.split("T")[0] : "",
      flockId: selectedTask.flock?.id || "",
      localizacao: selectedTask.location || "",
    });
    setSelectedTask(null);
    setIsCreateModalOpen(true);
  };

  const onSubmitNovaTarefa = async (data: NovaTarefaFormValues) => {
    try {
      const payload = {
        title: data.titulo,
        description: data.descricao,
        priority: data.prioridade,
        assignedToId: data.responsavel || undefined,
        flockId: data.flockId || undefined,
        dueDate: data.prazo || undefined,
        location: data.localizacao || undefined,
      };

      if (!isOnline) {
         // Create offline
         const tempId = crypto.randomUUID();
         const newTask: any = {
           id: tempId,
           ...payload,
           status: "TODO",
           createdAt: new Date().toISOString(),
           flock: flocks.find(f => f.id === data.flockId) || null,
           assignedTo: users.find(u => u.id === data.responsavel) || null,
         };
         
         const newTasks = [newTask, ...tasks];
         setTasks(newTasks);
         localStorage.setItem("cached_active_tasks", JSON.stringify(newTasks));
         
         await db.tasks_queue.add({
            syncId: crypto.randomUUID(),
            action: 'CREATE',
            taskId: tempId,
            payload: payload,
            syncStatus: 'pending',
            createdAt: new Date().toISOString()
         });

         toast.success("Tarefa criada localmente!");
         setIsCreateModalOpen(false);
         reset();
      } else {
        // Online: call action directly so we don't break simple edits
        const result = await createTask(payload);
        if (result.error) {
          toast.error("Erro ao salvar tarefa.", { description: result.error });
          return;
        }

        toast.success(editingTaskId ? "Tarefa atualizada!" : "Tarefa criada com sucesso!");
        setIsCreateModalOpen(false);
        reset();
        await loadTasks();
      }
    } catch {
      toast.error("Erro inesperado ao registrar tarefa.");
    }
  };

  const handleDeleteTask = async (id: string) => {
    setDeletingId(id);
    try {
      if (!isOnline) {
         const newTasks = tasks.filter(t => t.id !== id);
         setTasks(newTasks);
         localStorage.setItem("cached_active_tasks", JSON.stringify(newTasks));
         
         await db.tasks_queue.add({
            syncId: crypto.randomUUID(),
            action: 'DELETE',
            taskId: id,
            syncStatus: 'pending',
            createdAt: new Date().toISOString()
         });
         toast.success("Tarefa excluída localmente.");
         setSelectedTask(null);
      } else {
         const result = await deleteTask(id);
         if (result.error) throw new Error(result.error);
         toast.success("Tarefa excluída.");
         setSelectedTask(null);
         await loadTasks();
      }
    } catch {
      toast.error("Erro ao excluir.");
    } finally {
      setDeletingId(null);
    }
  };

  // ================================================
  // DRAG & DROP
  // ================================================

  const onDragStart = (e: React.DragEvent, taskId: string, fromStatus: string) => {
    setDraggedItem({ taskId, fromStatus });
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!draggedItem) return;
    if (draggedItem.fromStatus === targetStatus) return;

    if (targetStatus === "DONE") {
      // Optimistic upate (remove)
      const newTasks = tasks.filter((t) => t.id !== draggedItem.taskId);
      setTasks(newTasks);
      if (!isOnline) localStorage.setItem("cached_active_tasks", JSON.stringify(newTasks));
      toast.success("Tarefa concluída!");
    } else {
      const newTasks = tasks.map((t) =>
          t.id === draggedItem.taskId
            ? {
                ...t,
                status: targetStatus,
                completed: targetStatus === "DONE",
                completedAt: null,
              }
            : t
      );
      setTasks(newTasks);
      if (!isOnline) localStorage.setItem("cached_active_tasks", JSON.stringify(newTasks));
    }
    setDraggedItem(null);

    // Persist
    if (!isOnline) {
       await db.tasks_queue.add({
          syncId: crypto.randomUUID(),
          action: 'UPDATE_STATUS',
          taskId: draggedItem.taskId,
          payload: { status: targetStatus, evidenceUrls: [] },
          syncStatus: 'pending',
          createdAt: new Date().toISOString()
       });
       toast.info("Status atualizado offline");
    } else {
       const result = await updateTaskStatus(draggedItem.taskId, targetStatus);
       if (result.error) {
         toast.error("Falha ao mover tarefa. Recarregando...");
         await loadTasks();
       }
    }
  };

  // ================================================
  // RENDER TASK CARD (reusable)
  // ================================================

  const renderTaskCard = (task: TaskRecord, colStatus: string) => {
    const isActive = colStatus === "IN_PROGRESS";
    const isDone = colStatus === "DONE";

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => onDragStart(e, task.id, colStatus)}
        onClick={() => setSelectedTask(task)}
        className={`bg-white rounded-2xl p-5 shadow-sm transition-all cursor-grab active:cursor-grabbing group select-none ${
          isActive
            ? "border-2 border-[#1A5E35] relative overflow-hidden"
            : isDone
            ? "bg-surface-container-lowest/80 border border-outline-variant/20"
            : "border border-outline-variant/20 hover:shadow-md"
        }`}
      >
        <div className="flex items-start justify-between mb-3 relative z-10">
          <PriorityBadge priority={task.priority} />
          {isActive && (
            <RefreshCw className="w-4 h-4 text-[#1A5E35] animate-[spin_4s_linear_infinite]" />
          )}
          {isDone && <CheckCircle2 className="w-4 h-4 text-[#388e3c]" />}
        </div>
        <h3
          className={`text-sm font-extrabold mb-2 leading-snug relative z-10 transition-colors ${
            isDone
              ? "text-outline line-through"
              : "text-[#0D2E1A] group-hover:text-[#1A5E35]"
          }`}
        >
          {task.title}
        </h3>
        {task.location && (
          <div
            className={`flex items-center gap-1.5 text-xs font-medium mb-4 relative z-10 ${
              isActive ? "text-[#1A5E35]/80" : isDone ? "text-outline/70" : "text-outline"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" /> {task.location}
          </div>
        )}

        <div
          className={`flex items-center justify-between pt-3 border-t mt-auto relative z-10 ${
            isDone ? "border-outline-variant/20" : "border-outline-variant/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full overflow-hidden border flex items-center justify-center text-[9px] font-black ${
                isDone
                  ? "border-outline-variant/30 grayscale bg-surface-container text-outline"
                  : isActive
                  ? "border-[#1A5E35]/30 bg-[#e8f5e9] text-[#1A5E35]"
                  : "border-outline-variant/30 bg-surface-container text-[#0D2E1A]"
              }`}
            >
              {(task.assignedTo?.name || "?").charAt(0).toUpperCase()}
            </div>
            <span className="text-[11px] font-bold text-[#0D2E1A]">
              {task.assignedTo?.name || "Sem responsável"}
            </span>
          </div>
          <div
            className={`flex items-center gap-1.5 text-[11px] font-bold ${
              isDone
                ? "text-outline"
                : isActive
                ? "text-[#2e7d32]"
                : "text-outline"
            }`}
          >
            {isActive && (
              <span className="w-1.5 h-1.5 bg-[#2e7d32] rounded-full animate-pulse"></span>
            )}
            {isDone && task.completedAt
              ? `Finalizado ${new Date(task.completedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
              : isActive
              ? "Em progresso..."
              : task.dueDate
              ? formatDueDate(task.dueDate)
              : ""}
            {!isDone && !isActive && task.dueDate && (
              <CalendarIcon className="w-3.5 h-3.5" />
            )}
          </div>
        </div>

        {/* Background gradient for active cards */}
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#e8f5e9]/40 to-transparent pointer-events-none"></div>
        )}
      </div>
    );
  };

  // ================================================
  // LOADING STATE
  // ================================================

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center bg-surface-container-lowest h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#1A5E35] animate-spin" />
          <p className="text-sm font-bold text-outline">Carregando tarefas...</p>
        </div>
      </main>
    );
  }

  // ================================================
  // JSX
  // ================================================

  return (
    <main className="flex-1 px-8 py-6 bg-surface-container-lowest animate-in fade-in duration-500 font-inter w-full flex flex-col h-screen overflow-hidden relative">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-6 mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-manrope font-extrabold text-[#0D2E1A] tracking-tight">
            Quadro de Tarefas
          </h1>
          <p className="text-sm font-medium text-outline mt-1.5 max-w-xl">
            Gestão operacional das granjas em tempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filtros */}
          <div className="relative">
            <button
              onClick={() => {
                setShowFilters(!showFilters);
                setFilterMenu("root");
              }}
              className={`flex items-center gap-2 px-5 py-2.5 border text-sm font-bold rounded-xl transition-all shadow-sm ${
                hasActiveFilters
                  ? "bg-[#1A5E35] text-white border-[#1A5E35]"
                  : "bg-surface-container border-outline-variant/30 hover:bg-outline-variant/20 text-[#0D2E1A]"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtrar
              {hasActiveFilters && (
                <span className="bg-white/20 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                  {(filterPriority !== "ALL" ? 1 : 0) + (filterUserId !== "ALL" ? 1 : 0)}
                </span>
              )}
            </button>

            {showFilters && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-outline-variant/30 p-2 min-w-[200px] z-30 animate-in slide-in-from-top-2 duration-200">

                {/* ROOT MENU */}
                {filterMenu === "root" && (
                  <>
                    <button
                      onClick={() => setFilterMenu("priority")}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-bold rounded-lg text-[#0D2E1A] hover:bg-surface-container transition-all"
                    >
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#637D68]" />
                        Prioridade
                      </span>
                      <span className="flex items-center gap-1">
                        {filterPriority !== "ALL" && (
                          <span className="bg-[#1A5E35] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                            {filterPriority === "HIGH" ? "Alta" : filterPriority === "MEDIUM" ? "Média" : "Baixa"}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-outline" />
                      </span>
                    </button>
                    <button
                      onClick={() => setFilterMenu("user")}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-bold rounded-lg text-[#0D2E1A] hover:bg-surface-container transition-all"
                    >
                      <span className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-[#637D68]" />
                        Responsável
                      </span>
                      <span className="flex items-center gap-1">
                        {activeFilterUser && (
                          <span className="bg-[#1A5E35] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md max-w-[80px] truncate">
                            {activeFilterUser.name.split(" ")[0]}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-outline" />
                      </span>
                    </button>
                    {hasActiveFilters && (
                      <>
                        <div className="border-t border-outline-variant/20 my-1.5" />
                        <button
                          onClick={() => {
                            setFilterPriority("ALL");
                            setFilterUserId("ALL");
                            setShowFilters(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg text-[#c62828] hover:bg-[#ffebee] transition-all"
                        >
                          Limpar todos os filtros
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* PRIORITY SUBMENU */}
                {filterMenu === "priority" && (
                  <>
                    <button
                      onClick={() => setFilterMenu("root")}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg text-outline hover:bg-surface-container transition-all mb-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Voltar
                    </button>
                    <div className="border-t border-outline-variant/20 mb-1.5" />
                    {[
                      { value: "ALL", label: "Todas" },
                      { value: "HIGH", label: "Alta" },
                      { value: "MEDIUM", label: "Média" },
                      { value: "LOW", label: "Baixa" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setFilterPriority(opt.value);
                          setShowFilters(false);
                          setFilterMenu("root");
                        }}
                        className={`w-full text-left px-3 py-2 text-sm font-bold rounded-lg transition-all ${
                          filterPriority === opt.value
                            ? "bg-[#1A5E35] text-white"
                            : "text-[#0D2E1A] hover:bg-surface-container"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </>
                )}

                {/* USER SUBMENU */}
                {filterMenu === "user" && (
                  <>
                    <button
                      onClick={() => setFilterMenu("root")}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg text-outline hover:bg-surface-container transition-all mb-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Voltar
                    </button>
                    <div className="border-t border-outline-variant/20 mb-1.5" />
                    <button
                      onClick={() => {
                        setFilterUserId("ALL");
                        setShowFilters(false);
                        setFilterMenu("root");
                      }}
                      className={`w-full text-left px-3 py-2 text-sm font-bold rounded-lg transition-all ${
                        filterUserId === "ALL"
                          ? "bg-[#1A5E35] text-white"
                          : "text-[#0D2E1A] hover:bg-surface-container"
                      }`}
                    >
                      Todos
                    </button>
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setFilterUserId(u.id);
                          setShowFilters(false);
                          setFilterMenu("root");
                        }}
                        className={`w-full text-left px-3 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                          filterUserId === u.id
                            ? "bg-[#1A5E35] text-white"
                            : "text-[#0D2E1A] hover:bg-surface-container"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                          filterUserId === u.id
                            ? "bg-white/20 text-white"
                            : "bg-[#e8f5e9] text-[#1A5E35]"
                        }`}>
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                        {u.name}
                      </button>
                    ))}
                    {users.length === 0 && (
                      <p className="text-xs text-outline font-medium px-3 py-2">Nenhum usuário encontrado.</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <button 
            onClick={() => {
              loadAuditTasks();
              setShowAuditModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface-container hover:bg-outline-variant/20 border border-outline-variant/30 text-[13px] text-[#0D2E1A] font-bold rounded-xl transition-all shadow-sm"
          >
            <CalendarIcon className="w-4 h-4" /> Histórico
          </button>
          
          <button 
            onClick={handleNovaTarefaClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-[13px] font-bold rounded-xl transition-all shadow-md"
          >
            <Plus className="w-4 h-4" /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 min-h-0 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        
        {/* Column 1: A FAZER */}
        <div 
          className="flex flex-col flex-1 shrink-0 bg-surface-container-low/50 rounded-3xl p-4 border border-outline-variant/20 transition-colors"
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, "TODO")}
        >
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-outline"></div>
              <h2 className="text-[11px] font-black uppercase tracking-widest text-[#0D2E1A]">A Fazer</h2>
              <span className="bg-white border border-outline-variant/30 text-outline text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                {todoTasks.length}
              </span>
            </div>
            <button className="text-outline hover:text-[#0D2E1A] transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
            {todoTasks.map((task) => renderTaskCard(task, "TODO"))}
            {todoTasks.length === 0 && (
              <div className="flex-1 border-2 border-dashed border-outline-variant/30 rounded-2xl flex items-center justify-center text-xs font-bold text-outline/50 uppercase tracking-widest mt-2 h-24">
                Sem tarefas
              </div>
            )}
          </div>
        </div>

        {/* Column 2: EM ANDAMENTO */}
        <div 
          className="flex flex-col flex-1 shrink-0 bg-surface-container-low/50 rounded-3xl p-4 border border-outline-variant/20 transition-colors"
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, "IN_PROGRESS")}
        >
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#1A5E35]"></div>
              <h2 className="text-[11px] font-black uppercase tracking-widest text-[#0D2E1A]">Em Andamento</h2>
              <span className="bg-[#1A5E35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                {inProgressTasks.length}
              </span>
            </div>
            <button className="text-outline hover:text-[#0D2E1A] transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
            {inProgressTasks.map((task) => renderTaskCard(task, "IN_PROGRESS"))}
            {inProgressTasks.length === 0 && (
              <div className="flex-1 border-2 border-dashed border-outline-variant/30 rounded-2xl flex items-center justify-center text-xs font-bold text-outline/50 uppercase tracking-widest mt-2 h-24">
                Sem tarefas
              </div>
            )}
          </div>
        </div>

        {/* Column 3: CONCLUÍR DROPZONE */}
        <div 
          className={`flex flex-col w-[200px] shrink-0 rounded-3xl p-4 border-2 transition-all ${
            draggedItem ? 'border-dashed border-[#1A5E35] bg-[#e8f5e9]/50 opacity-100' : 'border-dashed border-transparent opacity-0 pointer-events-none'
          }`}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, "DONE")}
        >
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1A5E35]/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-[#1A5E35]" />
            </div>
            <p className="text-xs font-bold text-[#0D2E1A] tracking-wide">
              Solte aqui para concluir
            </p>
          </div>
        </div>

      </div>

      {/* Bottom KPIs Bar */}
      <div className="mt-4 shrink-0 flex flex-col sm:flex-row items-center gap-4">
        
        <div className="bg-[#e8f5e9] rounded-2xl p-4 flex items-center gap-4 pr-12 border border-[#c8e6c9]">
          <div className="w-12 h-12 bg-[#1A5E35] rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-[#2e7d32] uppercase tracking-wider mb-0.5">Pendentes/Ativas</p>
            <p className="text-2xl font-black text-[#0D2E1A]">{totalTasks}</p>
          </div>
        </div>

        <div className="bg-[#ffebee] rounded-2xl p-4 flex items-center gap-4 pr-12 border border-[#ffcdd2]/50">
          <div className="w-12 h-12 bg-[#c62828] rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-[#b71c1c] uppercase tracking-wider mb-0.5">Alta Prioridade</p>
            <p className="text-2xl font-black text-[#0D2E1A]">{String(highPriorityCount).padStart(2, "0")}</p>
          </div>
        </div>

        <div className="bg-surface-container rounded-2xl p-4 flex items-center justify-between gap-6 flex-1 border border-outline-variant/30">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {users.slice(0, 3).map((u, idx) => (
                <div
                  key={u.id}
                  className="w-10 h-10 rounded-full border-2 border-surface-container bg-[#e8f5e9] flex items-center justify-center text-[11px] font-black text-[#1A5E35]"
                  style={{ zIndex: 10 - idx }}
                >
                  {u.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {users.length > 3 && (
                <div className="w-10 h-10 rounded-full border-2 border-surface-container bg-[#1A5E35] flex items-center justify-center text-white text-xs font-bold z-10">
                  +{users.length - 3}
                </div>
              )}
              {users.length === 0 && (
                <div className="w-10 h-10 rounded-full border-2 border-surface-container bg-surface-container flex items-center justify-center text-outline text-xs font-bold">
                  —
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black text-[#0D2E1A] uppercase tracking-widest mb-0.5">Equipe</p>
              <p className="text-xs font-medium text-outline">
                {users.length} colaborador{users.length !== 1 ? "es" : ""} · {totalTasks} tarefa{totalTasks !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== MODAL: DETALHES DA TAREFA ========== */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedTask(null)}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-outline"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-4">
              <PriorityBadge priority={selectedTask.priority} />
            </div>
            
            <h2 className="text-2xl font-extrabold text-[#0D2E1A] mb-2 pr-8 leading-tight">
              {selectedTask.title}
            </h2>

            {selectedTask.description && (
               <p className="text-sm text-outline font-medium mt-2 leading-relaxed">
                 {selectedTask.description}
               </p>
            )}
            
            <div className="flex flex-col gap-3 mt-8">
              {selectedTask.location && (
                <div className="flex items-center gap-3 text-sm font-medium text-[#0D2E1A]">
                  <MapPin className="w-5 h-5 text-[#1A5E35] shrink-0" /> {selectedTask.location}
                </div>
              )}
              <div className="flex items-center gap-3 text-sm font-medium text-[#0D2E1A]">
                <CalendarIcon className="w-5 h-5 text-[#1A5E35] shrink-0" /> 
                {selectedTask.dueDate 
                  ? new Date(selectedTask.dueDate).toLocaleDateString("pt-BR") 
                  : "Sem prazo definido"}
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-outline-variant/30 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/30 bg-[#e8f5e9] flex items-center justify-center text-sm font-black text-[#1A5E35]">
                {(selectedTask.assignedTo?.name || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-outline tracking-wider">Responsável</p>
                <p className="text-sm font-extrabold text-[#0D2E1A]">
                  {selectedTask.assignedTo?.name || "Não atribuído"}
                </p>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => handleDeleteTask(selectedTask.id)}
                disabled={deletingId === selectedTask.id}
                className="py-3 px-4 text-sm font-bold text-[#c62828] hover:bg-[#ffebee] rounded-xl transition-all flex items-center gap-2"
              >
                {deletingId === selectedTask.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Excluir
              </button>
              <button 
                onClick={() => setSelectedTask(null)} 
                className="flex-1 py-3 text-sm font-bold text-outline hover:text-[#0D2E1A] hover:bg-surface-container rounded-xl transition-all"
              >
                Feito
              </button>
              <button 
                onClick={handleEditTaskClick}
                className="flex-1 py-3 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-xl shadow-md transition-all"
              >
                Editar Tarefa &rarr;
              </button>
            </div>
            {showEvidenceUpload ? (
              <div className="mt-6 border-t border-outline-variant/30 pt-6 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-[#0D2E1A] uppercase tracking-widest flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#1A5E35]" /> Anexar Evidências
                  </h3>
                  <button onClick={() => { setShowEvidenceUpload(false); setEvidenceFiles([]); }} className="text-outline hover:text-[#0D2E1A]">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-outline mb-4 font-medium">Fotos serão armazenadas com segurança como registro de auditoria inalterável.</p>
                
                <div className="flex flex-col gap-3">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    capture="environment" 
                    id="evidence-upload"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setEvidenceFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                  
                  {evidenceFiles.length === 0 ? (
                    <label 
                      htmlFor="evidence-upload"
                      className="flex flex-col items-center justify-center border-2 border-dashed border-[#1A5E35]/30 rounded-xl p-8 bg-[#e8f5e9]/20 hover:bg-[#e8f5e9]/50 transition-colors cursor-pointer"
                    >
                      <Camera className="w-6 h-6 text-[#1A5E35] mb-2" />
                      <span className="text-sm font-bold text-[#1A5E35]">Tirar Foto / Anexar</span>
                    </label>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto py-2">
                      <label htmlFor="evidence-upload" className="w-16 h-16 shrink-0 rounded-lg flex items-center justify-center border-2 border-dashed border-[#1A5E35]/40 text-[#1A5E35] cursor-pointer hover:bg-[#e8f5e9]">
                        <Plus className="w-6 h-6" />
                      </label>
                      {evidenceFiles.map((f, i) => (
                        <div key={i} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-outline-variant/50 group">
                          <img src={URL.createObjectURL(f)} alt="preview" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  <button 
                    onClick={async () => {
                      setIsUploading(true);
                      try {
                        const convertFileToBase64 = (file: File): Promise<string> => {
                           return new Promise((resolve, reject) => {
                             const reader = new FileReader();
                             reader.onload = () => resolve(reader.result as string);
                             reader.onerror = reject;
                             reader.readAsDataURL(file);
                           });
                        };

                        if (!isOnline) {
                           const base64Evidences = await Promise.all(evidenceFiles.map(f => convertFileToBase64(f)));
                           
                           const newTasks = tasks.filter((t) => t.id !== selectedTask.id);
                           setTasks(newTasks);
                           localStorage.setItem("cached_active_tasks", JSON.stringify(newTasks));
                           
                           await db.tasks_queue.add({
                              syncId: crypto.randomUUID(),
                              action: 'UPDATE_STATUS',
                              taskId: selectedTask.id,
                              payload: { status: 'DONE', evidenceUrls: base64Evidences },
                              syncStatus: 'pending',
                              createdAt: new Date().toISOString()
                           });
                           
                           toast.success("Tarefa concluída offline e anexos salvos!");
                           setSelectedTask(null);
                           setShowEvidenceUpload(false);
                           setEvidenceFiles([]);
                        } else {
                           const uploadedUrls: string[] = [];
                           const timestamp = new Date().getTime();
                           
                           for (const file of evidenceFiles) {
                             const fileExt = file.name.split('.').pop() || 'jpg';
                             const fileName = `${selectedTask.id}_${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                             const filePath = `${selectedTask.id}/${fileName}`;
                             
                             const { error } = await supabase.storage
                               .from("evidences")
                               .upload(filePath, file);
                               
                             if (error) throw error;
                             
                             const { data: publicUrlData } = supabase.storage
                               .from("evidences")
                               .getPublicUrl(filePath);
                               
                             uploadedUrls.push(publicUrlData.publicUrl);
                           }
                           
                           const result = await updateTaskStatus(selectedTask.id, "DONE", uploadedUrls);
                           
                           if (!result.error) {
                             toast.success("Tarefa concluída!");
                             setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
                             setSelectedTask(null);
                             setShowEvidenceUpload(false);
                             setEvidenceFiles([]);
                           } else {
                             toast.error(result.error);
                           }
                        }
                      } catch (err: any) {
                        toast.error("Erro no upload: " + err.message);
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                    disabled={isUploading}
                    className="w-full mt-2 py-3 bg-[#1A5E35] hover:bg-[#0D2E1A] text-white text-sm font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {isUploading ? "Salvando Evidências..." : "Confirmar Conclusão"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <button 
                  onClick={() => setShowEvidenceUpload(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#e8f5e9] border border-[#1A5E35]/30 hover:bg-[#1A5E35] hover:text-white text-[#1A5E35] text-sm font-black rounded-xl shadow-sm transition-all group"
                >
                  <CheckCircle2 className="w-5 h-5" /> Concluir Tarefa
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== MODAL: CRIAR/EDITAR TAREFA ========== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-outline"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-[#0D2E1A] tracking-tight">
                {editingTaskId ? "Editar Tarefa" : "Nova Tarefa"}
              </h2>
              <p className="text-sm font-medium text-outline mt-1">Insira os dados obrigatórios.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmitNovaTarefa)} className="flex flex-col gap-5">
              {/* Título */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-[#0D2E1A] uppercase tracking-wide">Título da Tarefa</label>
                <input 
                  type="text" 
                  placeholder="Ex: Vacinação contra Marek..." 
                  {...register("titulo")}
                  className={`w-full bg-surface-container-lowest border ${errors.titulo ? 'border-red-500' : 'border-outline-variant/50'} px-4 py-3 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 focus:border-[#1A5E35]/40 transition-all text-[#0D2E1A]`}
                />
                {errors.titulo && <span className="text-[10px] font-bold text-red-500">{errors.titulo.message}</span>}
              </div>

              {/* Descrição */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-[#0D2E1A] uppercase tracking-wide">Descrição</label>
                <textarea 
                  rows={3}
                  placeholder="Procedimentos e instruções detalhadas..." 
                  {...register("descricao")}
                  className={`w-full bg-surface-container-lowest border ${errors.descricao ? 'border-red-500' : 'border-outline-variant/50'} px-4 py-3 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 focus:border-[#1A5E35]/40 transition-all text-[#0D2E1A] resize-none`}
                ></textarea>
                {errors.descricao && <span className="text-[10px] font-bold text-red-500">{errors.descricao.message}</span>}
              </div>

              {/* Localização */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-[#0D2E1A] uppercase tracking-wide">Localização</label>
                <input 
                  type="text" 
                  placeholder="Ex: Galpão 04 / Lote 228, Área Comum..." 
                  {...register("localizacao")}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 focus:border-[#1A5E35]/40 transition-all text-[#0D2E1A]"
                />
              </div>

              {/* Linha dupla: Prioridade e Responsável */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-[#0D2E1A] uppercase tracking-wide">Prioridade</label>
                  <select 
                    {...register("prioridade")}
                    className={`w-full bg-surface-container-lowest border ${errors.prioridade ? 'border-red-500' : 'border-outline-variant/50'} px-4 py-3 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 focus:border-[#1A5E35]/40 transition-all text-[#0D2E1A] appearance-none cursor-pointer`}
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                  </select>
                  {errors.prioridade && <span className="text-[10px] font-bold text-red-500">{errors.prioridade.message}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-[#0D2E1A] uppercase tracking-wide">Responsável</label>
                  <select 
                    {...register("responsavel")}
                    className={`w-full bg-surface-container-lowest border ${errors.responsavel ? 'border-red-500' : 'border-outline-variant/50'} px-4 py-3 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 focus:border-[#1A5E35]/40 transition-all text-[#0D2E1A] appearance-none cursor-pointer`}
                  >
                    <option value="">Sem responsável</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Linha dupla: Prazo e Lote */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-[#0D2E1A] uppercase tracking-wide">Prazo (Deadline)</label>
                  <input 
                    type="date" 
                    {...register("prazo")}
                    className={`w-full bg-surface-container-lowest border ${errors.prazo ? 'border-red-500' : 'border-outline-variant/50'} px-4 py-3 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 focus:border-[#1A5E35]/40 transition-all text-[#0D2E1A]`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-[#0D2E1A] uppercase tracking-wide">Lote Associado</label>
                  <select 
                    {...register("flockId")}
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 px-4 py-3 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A5E35]/20 focus:border-[#1A5E35]/40 transition-all text-[#0D2E1A] appearance-none cursor-pointer"
                  >
                    <option value="">Nenhum (tarefa geral)</option>
                    {flocks.map((f) => (
                      <option key={f.id} value={f.id}>{f.barnName} — {f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer Modal Actions */}
              <div className="mt-8 pt-6 border-t border-outline-variant/30 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)} 
                  className="flex-1 py-3 text-sm font-bold text-[#0D2E1A] bg-surface-container hover:bg-[#e0e0e0] rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 py-3 flex justify-center items-center gap-2 bg-[#0D2E1A] hover:bg-[#1A5E35] text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    "Salvar Tarefa"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== MODAL: HISTÓRICO DE AUDITORIA ========== */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl p-6 shadow-2xl relative flex flex-col animate-in slide-in-from-bottom-8 duration-300">
            <button 
              onClick={() => setShowAuditModal(false)}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-outline"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 shrink-0 pt-2">
              <h2 className="text-2xl font-extrabold text-[#0D2E1A] tracking-tight flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#1A5E35]" />
                Histórico de Auditoria (Tarefas Concluídas)
              </h2>
              <p className="text-sm font-medium text-outline mt-1.5 ml-9">
                Registro inalterável de tarefas executadas (PNSA/ADAGRO)
              </p>
            </div>

            <div className="flex-1 overflow-x-auto border border-outline-variant/30 rounded-xl">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface-container-low border-b border-outline-variant/30 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-outline">Concluída em</th>
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-outline">Tarefa</th>
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-outline">Lote/Local</th>
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-outline">Responsável</th>
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-outline text-center">Evidências</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {auditTasks.map((t) => {
                    const isExpanded = expandedAuditTaskIds.includes(t.id);
                    return (
                    <React.Fragment key={t.id}>
                      <tr className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-4 py-3 font-medium text-[#0D2E1A]">
                          {t.completedAt ? new Date(t.completedAt).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                          }) : "-"}
                        </td>
                        <td className="px-4 py-3 text-[#0D2E1A]">
                          <p className="font-extrabold text-[#0D2E1A] truncate max-w-[300px]">{t.title}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-outline">
                          {t.flock?.name ? `Lote ${t.flock.name}` : t.location || "-"}
                        </td>
                        <td className="px-4 py-3 font-bold text-[#1A5E35]">
                          <span className="bg-[#e8f5e9] px-2 py-1 rounded-md text-xs">{t.assignedTo?.name || "Desconhecido"}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {t.evidenceUrls && t.evidenceUrls.length > 0 ? (
                            <button 
                              onClick={() => toggleAuditTaskExpand(t.id)}
                              className="inline-flex items-center justify-center gap-1.5 bg-[#e8f5e9] text-[#1A5E35] px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[#1A5E35]/20 hover:bg-[#1A5E35] hover:text-white transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>{t.evidenceUrls.length} Foto{t.evidenceUrls.length > 1 ? 's' : ''}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                            </button>
                          ) : (
                            <span className="text-outline text-xs">&mdash;</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && t.evidenceUrls && t.evidenceUrls.length > 0 && (
                        <tr className="bg-surface-container-lowest border-b border-outline-variant/30">
                          <td colSpan={5} className="px-6 py-4 animate-in slide-in-from-top-2 duration-200">
                            <p className="text-xs font-bold text-outline mb-3 uppercase tracking-wider">Anexos Fotográficos (Auditoria)</p>
                            <div className="flex flex-wrap gap-4">
                              {t.evidenceUrls.map((url, i) => (
                                <a href={url} target="_blank" rel="noreferrer" key={i} title="Ver Imagem Original" className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-surface-container flex items-center justify-center hover:opacity-90 transition-all border border-outline-variant/50 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 group relative">
                                  <img src={url} alt={`Evidência ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </a>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )})}
                  {auditTasks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-outline font-medium">
                        Nenhuma tarefa no histórico.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 pt-4 border-t border-outline-variant/30 flex justify-end shrink-0">
              <button 
                onClick={() => setShowAuditModal(false)}
                className="px-6 py-2.5 bg-[#0D2E1A] text-white text-sm font-bold rounded-xl shadow-md transition-all hover:bg-[#1A5E35]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
