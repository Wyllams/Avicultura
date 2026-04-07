"use server";

import supabaseAdmin from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function syncTasks(pendingTasks: any[]): Promise<{ success?: boolean; syncedIds?: string[]; error?: string }> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabaseClient = createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: userData } = await supabaseAdmin
      .from("User")
      .select("id, companyId")
      .eq("authId", user.id)
      .single();

    if (!userData) return { error: "Usuário não encontrado" };

    const syncedIds: string[] = [];

    for (const record of pendingTasks) {
      if (record.action === "CREATE") {
        const payload = record.payload;
        // Check if exists to be idempotent (could use syncId, but task has no syncId right now, let's just insert) // Wait, we can use the original random payload id or syncId.
        const { error } = await supabaseAdmin.from("Task").insert({
          id: record.taskId || crypto.randomUUID(), // Assume we generated taskId client side
          companyId: userData.companyId,
          createdBy: userData.id,
          title: payload.title,
          description: payload.description || null,
          priority: payload.priority?.toUpperCase() || "LOW",
          status: "TODO",
          assignedToId: payload.assignedToId || null,
          flockId: payload.flockId || null,
          location: payload.location || null,
          dueDate: payload.dueDate ? new Date(payload.dueDate).toISOString() : null,
          completed: false,
          updatedAt: new Date().toISOString(),
        });
        if (!error) syncedIds.push(record.syncId);
      } else if (record.action === "UPDATE_STATUS") {
        if (!record.taskId) continue;
        const payload = record.payload;
        
        let finalEvidenceUrls = payload.evidenceUrls || [];
        // If they are base64, we need to upload them
        if (finalEvidenceUrls.length > 0 && finalEvidenceUrls[0].startsWith("data:image")) {
           const uploadedUrls: string[] = [];
           const timestamp = new Date().getTime();
           for (const base64 of finalEvidenceUrls) {
              const base64Data = base64.split(',')[1];
              const ext = base64.substring("data:image/".length, base64.indexOf(";base64"));
              const fileName = `${record.taskId}_${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;
              const filePath = `${record.taskId}/${fileName}`;
              const buffer = Buffer.from(base64Data, 'base64');
              const { error: uploadError } = await supabaseAdmin.storage
                .from("evidences")
                .upload(filePath, buffer, {
                  contentType: `image/${ext}`
                });
              if (!uploadError) {
                 const { data: publicUrlData } = supabaseAdmin.storage.from("evidences").getPublicUrl(filePath);
                 uploadedUrls.push(publicUrlData.publicUrl);
              }
           }
           finalEvidenceUrls = uploadedUrls;
        }

        const updateData: any = {
           status: payload.status,
           updatedAt: new Date().toISOString(),
        };
        if (payload.status === "DONE") {
           updateData.completed = true;
           updateData.completedAt = new Date().toISOString();
           updateData.evidenceUrls = finalEvidenceUrls;
           updateData.assignedToId = userData.id;
        } else {
           updateData.completed = false;
           updateData.completedAt = null;
        }

        const { error } = await supabaseAdmin.from("Task").update(updateData).eq("id", record.taskId);
        if (!error) syncedIds.push(record.syncId);
      } else if (record.action === "DELETE") {
        if (!record.taskId) continue;
        const { error } = await supabaseAdmin.from("Task").delete().eq("id", record.taskId).eq("companyId", userData.companyId);
        if (!error) syncedIds.push(record.syncId);
      }
    }

    if (syncedIds.length > 0) revalidatePath("/tarefas");
    return { success: true, syncedIds };
  } catch (err: any) {
    console.error("Erro no syncTasks", err);
    return { error: err.message };
  }
}

// ================================================
// UTILITÁRIOS
// ================================================

async function getUserContext() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabaseAdmin
    .from("User")
    .select("id, companyId, name")
    .eq("authId", user.id)
    .single();
    
  return data ? { authId: user.id, internalId: data.id, companyId: data.companyId, name: data.name } : null;
}

// ================================================
// TIPOS
// ================================================

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  location: string | null;
  evidenceUrls: string[];
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string } | null;
  flock: { id: string; name: string } | null;
}

export interface UserOption {
  id: string;
  name: string;
}

export interface FlockOption {
  id: string;
  name: string;
  barnName: string;
}

// ================================================
// GET ACTIVE TASKS — Para o Kanban (TODO / IN_PROGRESS)
// ================================================

export async function getActiveTasks(): Promise<{ tasks?: TaskRecord[]; error?: string }> {
  const userContext = await getUserContext();
  if (!userContext?.companyId) return { error: "Sem permissão" };

  const { data: tasks, error } = await supabaseAdmin
    .from("Task")
    .select(`
      id,
      title,
      description,
      priority,
      status,
      location,
      dueDate,
      completed,
      completedAt,
      createdAt,
      evidenceUrls,
      assignedTo:User!Task_assignedToId_fkey(id, name),
      flock:Flock!Task_flockId_fkey(id, name)
    `)
    .eq("companyId", userContext.companyId)
    .neq("status", "DONE")
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("Erro ao buscar tarefas ativas:", error);
    return { error: "Erro ao buscar tarefas ativas." };
  }

  return { tasks: (tasks as unknown) as TaskRecord[] };
}

// ================================================
// GET AUDIT TASKS — Para a Tabela de Histórico (DONE)
// ================================================

export async function getAuditTasks(): Promise<{ tasks?: TaskRecord[]; error?: string }> {
  const userContext = await getUserContext();
  if (!userContext?.companyId) return { error: "Sem permissão" };

  const { data: tasks, error } = await supabaseAdmin
    .from("Task")
    .select(`
      id,
      title,
      description,
      priority,
      status,
      location,
      dueDate,
      completed,
      completedAt,
      createdAt,
      evidenceUrls,
      assignedTo:User!Task_assignedToId_fkey(id, name),
      flock:Flock!Task_flockId_fkey(id, name)
    `)
    .eq("companyId", userContext.companyId)
    .eq("status", "DONE")
    .order("completedAt", { ascending: false })
    .limit(500); // hard limit to keep it fast

  if (error) {
    console.error("Erro ao buscar tarefas concluídas:", error);
    return { error: "Erro ao buscar tarefas concluídas." };
  }

  return { tasks: (tasks as unknown) as TaskRecord[] };
}

// ================================================
// GET USERS & FLOCKS — Dados para dropdowns
// ================================================

export async function getTaskFormData(): Promise<{
  users?: UserOption[];
  flocks?: FlockOption[];
  error?: string;
}> {
  const userContext = await getUserContext();
  if (!userContext?.companyId) return { error: "Sem permissão" };

  const companyId = userContext.companyId;

  // Buscar usuários da empresa
  const { data: users } = await supabaseAdmin
    .from("User")
    .select("id, name")
    .eq("companyId", companyId);

  // Buscar lotes ativos (com nome do galpão)
  const { data: farms } = await supabaseAdmin
    .from("Farm")
    .select("id")
    .eq("companyId", companyId);

  const farmIds = (farms || []).map((f: { id: string }) => f.id);

  const { data: barns } = await supabaseAdmin
    .from("Barn")
    .select("id, name")
    .in("farmId", farmIds);

  const barnIds = (barns || []).map((b: { id: string }) => b.id);
  const barnMap = new Map((barns || []).map((b: { id: string; name: string }) => [b.id, b.name]));

  const { data: flocks } = await supabaseAdmin
    .from("Flock")
    .select("id, name, barnId")
    .in("barnId", barnIds)
    .eq("status", "ACTIVE");

  const flockOptions: FlockOption[] = (flocks || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    barnName: barnMap.get(f.barnId) || "—",
  }));

  return {
    users: (users || []) as UserOption[],
    flocks: flockOptions,
  };
}

// ================================================
// CREATE TASK
// ================================================

interface CreateTaskPayload {
  title: string;
  description: string;
  priority: string;
  assignedToId?: string;
  flockId?: string;
  location?: string;
  dueDate?: string;
}

export async function createTask(
  payload: CreateTaskPayload
): Promise<{ success?: boolean; error?: string }> {
  const userContext = await getUserContext();
  if (!userContext?.companyId || !userContext.internalId) return { error: "Sem permissão" };

  const { error } = await supabaseAdmin.from("Task").insert({
    id: crypto.randomUUID(),
    companyId: userContext.companyId,
    createdBy: userContext.internalId, // registra quem criou
    title: payload.title,
    description: payload.description || null,
    priority: payload.priority.toUpperCase(),
    status: "TODO",
    assignedToId: payload.assignedToId || null,
    flockId: payload.flockId || null,
    location: payload.location || null,
    dueDate: payload.dueDate ? new Date(payload.dueDate).toISOString() : null,
    completed: false,
    updatedAt: new Date().toISOString(),
  });

  if (error) {
    console.error("Erro ao criar tarefa:", error);
    return { error: "Erro ao criar tarefa: " + error.message };
  }

  revalidatePath("/tarefas");
  return { success: true };
}

// ================================================
// UPDATE TASK STATUS (Drag & Drop ou Complete)
// ================================================

export async function updateTaskStatus(
  taskId: string,
  newStatus: string,
  evidenceUrls?: string[]
): Promise<{ success?: boolean; error?: string }> {
  const userContext = await getUserContext();
  if (!userContext?.internalId) return { error: "Sem permissão" };

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  if (newStatus === "DONE") {
    updatePayload.completed = true;
    updatePayload.completedAt = new Date().toISOString();
    updatePayload.evidenceUrls = evidenceUrls || [];
    // Ao apertar DONE, registramos que o usuário atual (logado) executou a conclusão.
    // Isso é ideal para o caso de múltiplas pessoas acessando.
    updatePayload.assignedToId = userContext.internalId;
  } else {
    updatePayload.completed = false;
    updatePayload.completedAt = null;
  }

  const { error } = await supabaseAdmin
    .from("Task")
    .update(updatePayload)
    .eq("id", taskId);

  if (error) {
    console.error("Erro ao atualizar status:", error);
    return { error: "Erro ao atualizar status." };
  }

  revalidatePath("/tarefas");
  return { success: true };
}

// ================================================
// DELETE TASK
// ================================================

export async function deleteTask(
  taskId: string
): Promise<{ success?: boolean; error?: string }> {
  const userContext = await getUserContext();
  if (!userContext?.companyId) return { error: "Sem permissão" };

  // TODO: verificar auth para garantir que apenas Admin gerentes deletem

  const { error } = await supabaseAdmin
    .from("Task")
    .delete()
    .eq("id", taskId)
    .eq("companyId", userContext.companyId);

  if (error) {
    console.error("Erro ao excluir tarefa:", error);
    return { error: "Erro ao excluir tarefa." };
  }

  revalidatePath("/tarefas");
  return { success: true };
}

