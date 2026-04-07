"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createFarm, updateFarm } from "@/app/actions/farm";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const farmSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  city: z.string().optional(),
  state: z.string().length(2, "UF deve ter 2 caracteres").optional().or(z.literal("")),
  status: z.enum(["ATIVO", "INATIVO"]).optional(),
});

type FarmFormValues = z.infer<typeof farmSchema>;

export function FarmForm({ initialData, farmId, onSuccess, onCancel }: { initialData?: Partial<FarmFormValues>, farmId?: string, onSuccess?: () => void, onCancel?: () => void }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FarmFormValues>({
    resolver: zodResolver(farmSchema),
    defaultValues: {
      name: initialData?.name || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      status: initialData?.status || "ATIVO",
    },
  });

  async function onSubmit(data: FarmFormValues) {
    setIsSubmitting(true);
    try {
      if (farmId) {
        await updateFarm(farmId, data);
        toast.success("Granja atualizada com sucesso!");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/granjas/${farmId}`);
        }
      } else {
        const res = await createFarm(data);
        toast.success("Granja cadastrada com sucesso!");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/granjas/${res.farmId}`);
        }
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar os dados da granja.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl bg-white border border-outline-variant/30 rounded-3xl p-8 shadow-sm">
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Nome da Granja *</label>
          <input 
            {...form.register("name")}
            className="w-full h-12 bg-surface-container rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#1A5E35] transition-all"
            placeholder="Ex: Granja Primavera"
          />
          {form.formState.errors.name && (
            <span className="text-xs text-error font-medium">{form.formState.errors.name.message}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Cidade</label>
            <input 
              {...form.register("city")}
              className="w-full h-12 bg-surface-container rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#1A5E35] transition-all"
              placeholder="Ex: Cascavel"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Estado (UF)</label>
            <input 
              {...form.register("state")}
              maxLength={2}
              className="w-full h-12 bg-surface-container rounded-xl px-4 text-sm font-medium text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-[#1A5E35] transition-all"
              placeholder="Ex: PR"
            />
             {form.formState.errors.state && (
              <span className="text-xs text-error font-medium">{form.formState.errors.state.message}</span>
            )}
          </div>
        </div>

        {farmId && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Status</label>
            <select 
              {...form.register("status")}
              className="w-full h-12 bg-surface-container rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#1A5E35] transition-all"
            >
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-4 pt-6 border-t border-surface-container-high">
          {onCancel ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
              className="px-6 py-3 rounded-xl font-bold text-outline hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          ) : (
            <Link href={farmId ? `/granjas/${farmId}` : "/granjas"}>
              <button
                type="button"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl font-bold text-outline hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </Link>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-[#0D2E1A] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#1A5E35] transition-colors disabled:opacity-70 shadow-sm"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Granja
          </button>
        </div>

      </form>
    </div>
  );
}
