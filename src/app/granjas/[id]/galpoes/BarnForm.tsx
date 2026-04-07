"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBarn, updateBarn } from "@/app/actions/farm";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const barnSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  area: z.number().min(1, "Área deve ser maior que 0"),
  capacity: z.number().min(1, "Capacidade deve ser maior que 0"),
  status: z.enum(["EM_OPERACAO", "MANUTENCAO", "INATIVO"]).optional(),
});

type BarnFormValues = z.infer<typeof barnSchema>;

export function BarnForm({ farmId, initialData, barnId }: { farmId: string, initialData?: Partial<BarnFormValues>, barnId?: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BarnFormValues>({
    resolver: zodResolver(barnSchema),
    defaultValues: {
      name: initialData?.name || "",
      area: initialData?.area || 0,
      capacity: initialData?.capacity || 0,
      status: initialData?.status || "EM_OPERACAO",
    },
  });

  async function onSubmit(data: BarnFormValues) {
    setIsSubmitting(true);
    try {
      if (barnId) {
        await updateBarn(barnId, data);
        toast.success("Galpão atualizado com sucesso!");
        router.push(`/granjas/${farmId}/galpoes/${barnId}`);
      } else {
        const res = await createBarn(farmId, data);
        toast.success("Galpão cadastrado com sucesso!");
        router.push(`/granjas/${farmId}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar os dados do galpão.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl bg-white border border-outline-variant/30 rounded-3xl p-8 shadow-sm">
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Identificação do Galpão *</label>
          <input 
            {...form.register("name")}
            className="w-full h-12 bg-surface-container rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#1A5E35] transition-all"
            placeholder="Ex: G-01"
          />
          {form.formState.errors.name && (
            <span className="text-xs text-error font-medium">{form.formState.errors.name.message}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Área (m²) *</label>
            <input 
              type="number"
              {...form.register("area", { valueAsNumber: true })}
              className="w-full h-12 bg-surface-container rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#1A5E35] transition-all"
              placeholder="Ex: 1200"
            />
            {form.formState.errors.area && (
              <span className="text-xs text-error font-medium">{form.formState.errors.area.message}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Capacidade (Aves) *</label>
            <input 
              type="number"
              {...form.register("capacity", { valueAsNumber: true })}
              className="w-full h-12 bg-surface-container rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#1A5E35] transition-all"
              placeholder="Ex: 15000"
            />
             {form.formState.errors.capacity && (
              <span className="text-xs text-error font-medium">{form.formState.errors.capacity.message}</span>
            )}
          </div>
        </div>

        {barnId && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Status</label>
            <select 
              {...form.register("status")}
              className="w-full h-12 bg-surface-container rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#1A5E35] transition-all"
            >
              <option value="EM_OPERACAO">Em Operação</option>
              <option value="MANUTENCAO">Manutenção</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-4 pt-6 border-t border-surface-container-high">
          <Link href={`/granjas/${farmId}`}>
            <button
              type="button"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl font-bold text-outline hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-[#0D2E1A] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#1A5E35] transition-colors disabled:opacity-70 shadow-sm"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Galpão
          </button>
        </div>

      </form>
    </div>
  );
}
