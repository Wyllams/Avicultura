"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  Info,
  MapPin,
  Building2,
  Lightbulb,
  ShieldCheck
} from "lucide-react";

import { createFlock } from "@/app/actions/lotes";

const loteSchema = z.object({
  name: z.string().min(1, "O identificador do lote é obrigatório (Ex: Lote 2026/01)"),
  housingDate: z.string().min(1, "A data de alojamento é obrigatória"),
  hatchData: z.string().min(1, "A data de nascimento é obrigatória"),
  housedBirds: z.coerce.number({ message: "Insira a quantidade" }).positive("Número de aves deve ser maior que zero"),
  breed: z.string().min(1, "Selecione a linhagem"),
  farmId: z.string().min(1, "Selecione uma granja"),
  integradora: z.string().optional(),
});

type LoteForm = z.infer<typeof loteSchema>;

interface FarmOption {
  id: string;
  name: string;
}

interface BarnOption {
  id: string;
  name: string;
  farm: { id: string; name: string };
}

interface FlockFormProps {
  availableBarns: BarnOption[];
  allFarms: FarmOption[];
}

export function FlockForm({ availableBarns, allFarms }: FlockFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loteSchema),
    defaultValues: {
      housingDate: new Date().toISOString().split("T")[0],
      hatchData: new Date().toISOString().split("T")[0],
      housedBirds: 0
    }
  });

  const selectedFarmId = watch("farmId");

  // Derive barns for the selected farm
  const barnsInFarm = useMemo(() => {
    return availableBarns.filter((b) => b.farm.id === selectedFarmId);
  }, [availableBarns, selectedFarmId]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (!selectedFarmId) {
        toast.error("Selecione uma granja primeiro.");
        setIsSubmitting(false);
        return;
      }
      
      const barnToUse = barnsInFarm[0];
      if (!barnToUse) {
        toast.error("Nenhum galpão limpo disponível nesta granja.");
        setIsSubmitting(false);
        return;
      }

      const res = await createFlock({
        barnId: barnToUse.id, // Usa o primeiro galpão disponível implicitamente
        name: data.name,
        breed: data.breed,
        housedBirds: data.housedBirds,
        housingDate: new Date(data.housingDate),
        hatchData: new Date(data.hatchData)
      });

      if (res.error) {
        toast.error(res.error);
      } else if (res.success) {
        toast.success("Lote alojado com sucesso!");
        router.push(`/lotes/${res.flockId}`);
      }
    } catch {
      toast.error("Erro inesperado ao alojar o lote.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-24">
      {/* Bloco 1: Informações do Lote */}
      <section className="bg-surface-container/30 p-8 rounded-3xl border border-outline-variant/30">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#e8f5e9] flex items-center justify-center">
              <Info className="w-5 h-5 text-[#1A5E35]" />
            </div>
            <h2 className="text-lg font-bold text-foreground font-manrope">Informações do Lote</h2>
          </div>
          {availableBarns.length === 0 && (
             <div className="bg-[#ffebee] text-[#c62828] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Nenhum galpão livre disponível no momento
             </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <label className="block text-xs font-bold text-foreground mb-2">
              Selecione a Granja
            </label>
            <select
              {...register("farmId")}
              onChange={(e) => {
                setValue("farmId", e.target.value, { shouldValidate: true });
              }}
              className="w-full bg-white border border-outline-variant/50 rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#1A5E35] transition-colors shadow-sm appearance-none"
            >
              <option value="">Escolha uma granja...</option>
              {allFarms.map((farm) => (
                <option key={farm.id} value={farm.id}>{farm.name}</option>
              ))}
            </select>
            {errors.farmId && <p className="text-xs text-tertiary mt-1 font-medium">{String(errors.farmId.message)}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-2">
              Identificação do Lote
            </label>
            <input
              type="text"
              {...register("name")}
              placeholder="Ex: Lote 2026/01"
              className="w-full bg-white border border-outline-variant/50 rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#1A5E35] transition-colors shadow-sm"
            />
            {errors.name && <p className="text-xs text-tertiary mt-1 font-medium">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-2">
              Linhagem
            </label>
            <select
              {...register("breed")}
              className="w-full bg-white border border-outline-variant/50 rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#1A5E35] transition-colors shadow-sm appearance-none"
            >
              <option value="">Selecione a linhagem</option>
              <option value="Cobb 500">Cobb 500</option>
              <option value="Ross 308">Ross 308</option>
              <option value="Hubbard">Hubbard</option>
            </select>
            {errors.breed && <p className="text-xs text-tertiary mt-1 font-medium">{errors.breed.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-2">
              Nº de Aves Alojadas
            </label>
            <input
              type="number"
              {...register("housedBirds", { valueAsNumber: true })}
              placeholder="Ex: 25000"
              className="w-full bg-white border border-outline-variant/50 rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#1A5E35] transition-colors shadow-sm"
            />
            {errors.housedBirds && <p className="text-xs text-tertiary mt-1 font-medium">{errors.housedBirds.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-2">
              Data de Nascimento do Pintinho
            </label>
            <input
              type="date"
              {...register("hatchData")}
              className="w-full bg-white border border-outline-variant/50 rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#1A5E35] transition-colors shadow-sm"
            />
            {errors.hatchData && <p className="text-xs text-tertiary mt-1 font-medium">{errors.hatchData.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-2">
              Data de Alojamento na Granja
            </label>
            <input
              type="date"
              {...register("housingDate")}
              className="w-full bg-white border border-outline-variant/50 rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#1A5E35] transition-colors shadow-sm"
            />
            {errors.housingDate && <p className="text-xs text-tertiary mt-1 font-medium">{errors.housingDate.message}</p>}
          </div>
        </div>
      </section>

      {/* Bloco 3: Fornecedor e Dica */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container/30 p-8 rounded-3xl border border-outline-variant/30">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#ffebee] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#c62828]" />
            </div>
            <h2 className="text-lg font-bold text-foreground font-manrope">Fornecedor/Integradora (Opcional)</h2>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-foreground mb-2">
              Empresa Integradora
            </label>
            <input
              type="text"
              {...register("integradora")}
              placeholder="Ex: BRF, C.Vale, Copacol..."
              className="w-full bg-white border border-outline-variant/50 rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#1A5E35] transition-colors shadow-sm"
            />
          </div>
        </div>

        {/* Green Dica Card */}
        <div className="bg-[#1A5E35] rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <Lightbulb className="w-8 h-8 text-[#81c784] mb-4" />
              <h3 className="text-lg font-bold font-manrope mb-2">Dica de Precisão</h3>
              <p className="text-sm text-white/80 leading-relaxed font-medium">
                  Certifique-se de que o galpão escolhido passou pelo vazio sanitário completo antes de confirmar o alojamento.
              </p>
            </div>
            
            <div className="flex items-center gap-3 mt-8">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#81c784]" />
              </div>
              <span className="text-xs font-bold text-[#81c784]">Apenas galpões inativos listados</span>
            </div>
        </div>
      </section>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-56 bg-white/80 backdrop-blur-md border-t border-outline-variant/30 p-4 px-8 z-40 flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 text-sm font-bold text-foreground hover:bg-surface-container rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || availableBarns.length === 0}
          className="px-6 py-2.5 bg-[#0D2E1A] text-white text-sm font-bold rounded-lg hover:bg-[#1A5E35] transition-colors disabled:opacity-70 shadow-sm"
        >
          {isSubmitting ? "Alojando..." : "Criar Lote"}
        </button>
      </div>
    </form>
  );
}
