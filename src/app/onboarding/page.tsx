"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, MapPin, Home, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "../actions/onboarding";

// Schemas para cada passo
const step1Schema = z.object({
  empresaNome: z.string().min(3, "O nome da empresa deve ter no mínimo 3 caracteres."),
  documento: z.string().min(11, "Documento inválido (CPF/CNPJ)."),
  telefone: z.string().min(10, "Telefone inválido."),
});

const step2Schema = z.object({
  granjaNome: z.string().min(3, "O nome da granja deve ter no mínimo 3 caracteres."),
  estado: z.string().min(2, "Selecione um estado válido."),
  municipio: z.string().min(3, "Insira um município válido."),
});

const step3Schema = z.object({
  galpaoNome: z.string().min(2, "O nome do galpão é obrigatório."),
  comprimento: z.string().min(1, "Campo obrigatório").refine((val) => !isNaN(Number(val)) && Number(val) > 0, { message: "O comprimento deve ser maior que zero." }),
  largura: z.string().min(1, "Campo obrigatório").refine((val) => !isNaN(Number(val)) && Number(val) > 0, { message: "A largura deve ser maior que zero." }),
});

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;
type Step3Form = z.infer<typeof step3Schema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Forms
  const formStep1 = useForm<Step1Form>({ resolver: zodResolver(step1Schema) });
  const formStep2 = useForm<Step2Form>({ resolver: zodResolver(step2Schema) });
  const formStep3 = useForm<Step3Form>({ resolver: zodResolver(step3Schema) });

  const onNextStep1 = () => {
    setStep(2);
  };

  const onNextStep2 = () => {
    setStep(3);
  };

  const onFinalSubmit = async (data: Step3Form) => {
    try {
      const allData = {
         ...formStep1.getValues(),
         ...formStep2.getValues(),
         ...data
      };

      const result = await completeOnboarding(allData);
      
      if (result?.error) {
         toast.error(result.error);
         return;
      }
      
      toast.success("Estrutura criada com sucesso! Bem-vindo.");
      router.push("/dashboard");
    } catch {
      toast.error("Erro ao configurar sua estrutura inicial.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="w-full max-w-[600px] p-8 surface-container-lowest rounded-2xl shadow-[0_4px_24px_rgba(25,28,29,0.08)]">
        
        {/* Wizard Header / Indicator */}
        <div className="flex items-center justify-between mb-8 relative">
          {/* Progress Bar Background */}
          <div className="absolute left-0 top-12 w-full h-1 bg-surface-container-high z-0 rounded-full" />
          {/* Progress Bar Fill */}
          <div 
            className="absolute left-0 top-12 h-1 bg-primary z-0 rounded-full transition-all duration-500" 
            style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
          />

          {/* Steps */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${step >= 1 ? 'bg-primary border-primary text-on-primary' : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant'}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <span className={`text-xs font-semibold ${step >= 1 ? 'text-primary' : 'text-on-surface-variant'}`}>Empresa</span>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${step >= 2 ? 'bg-primary border-primary text-on-primary' : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant'}`}>
              <MapPin className="w-5 h-5" />
            </div>
            <span className={`text-xs font-semibold ${step >= 2 ? 'text-primary' : 'text-on-surface-variant'}`}>Granja</span>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${step >= 3 ? 'bg-primary border-primary text-on-primary' : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant'}`}>
              <Home className="w-5 h-5" />
            </div>
            <span className={`text-xs font-semibold ${step >= 3 ? 'text-primary' : 'text-on-surface-variant'}`}>Galpão</span>
          </div>
        </div>

        <header className="mb-6">
          <h1 className="font-manrope font-bold text-2xl tracking-tight text-foreground">
            {step === 1 && "Bem-vindo! Dados da Empresa"}
            {step === 2 && "Sua Primeira Granja"}
            {step === 3 && "Seu Primeiro Galpão"}
          </h1>
          <p className="text-sm text-on-surface mt-1">
            {step === 1 && "Vamos começar configurando a sua conta principal."}
            {step === 2 && "A granja é a propriedade rural onde seus lotes serão criados."}
            {step === 3 && "O galpão (ou barracão) é onde definimos a densidade das aves."}
          </p>
        </header>

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={formStep1.handleSubmit(onNextStep1)} className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface">Nome da Empresa</label>
              <input
                {...formStep1.register("empresaNome")}
                type="text"
                placeholder="Ex: Avicultura São João"
                className={`surface-container-lowest border ${formStep1.formState.errors.empresaNome ? 'border-tertiary' : 'border-outline-variant'} p-3 rounded-lg text-[15px] focus:border-primary focus:ring-1 focus:ring-primary`}
              />
              {formStep1.formState.errors.empresaNome && <span className="text-xs text-tertiary">{formStep1.formState.errors.empresaNome.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-on-surface">CPF/CNPJ</label>
                <input
                  {...formStep1.register("documento")}
                  type="text"
                  placeholder="00.000.000/0001-00"
                  className={`surface-container-lowest border ${formStep1.formState.errors.documento ? 'border-tertiary' : 'border-outline-variant'} p-3 rounded-lg text-[15px] focus:border-primary focus:ring-1 focus:ring-primary`}
                />
                {formStep1.formState.errors.documento && <span className="text-xs text-tertiary">{formStep1.formState.errors.documento.message}</span>}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-on-surface">Telefone</label>
                <input
                  {...formStep1.register("telefone")}
                  type="text"
                  placeholder="(00) 00000-0000"
                  className={`surface-container-lowest border ${formStep1.formState.errors.telefone ? 'border-tertiary' : 'border-outline-variant'} p-3 rounded-lg text-[15px] focus:border-primary focus:ring-1 focus:ring-primary`}
                />
                {formStep1.formState.errors.telefone && <span className="text-xs text-tertiary">{formStep1.formState.errors.telefone.message}</span>}
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="submit"
                className="bg-primary text-on-primary rounded-lg px-6 py-3 font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors"
              >
                Próximo passo <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form onSubmit={formStep2.handleSubmit(onNextStep2)} className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface">Nome da Granja</label>
              <input
                {...formStep2.register("granjaNome")}
                type="text"
                placeholder="Ex: Granja Matriz"
                className={`surface-container-lowest border ${formStep2.formState.errors.granjaNome ? 'border-tertiary' : 'border-outline-variant'} p-3 rounded-lg text-[15px] focus:border-primary focus:ring-1 focus:ring-primary`}
              />
              {formStep2.formState.errors.granjaNome && <span className="text-xs text-tertiary">{formStep2.formState.errors.granjaNome.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-on-surface">Estado (UF)</label>
                <input
                  {...formStep2.register("estado")}
                  type="text"
                  placeholder="Ex: SP"
                  className={`surface-container-lowest border ${formStep2.formState.errors.estado ? 'border-tertiary' : 'border-outline-variant'} p-3 rounded-lg text-[15px] focus:border-primary focus:ring-1 focus:ring-primary`}
                />
                {formStep2.formState.errors.estado && <span className="text-xs text-tertiary">{formStep2.formState.errors.estado.message}</span>}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-on-surface">Município</label>
                <input
                  {...formStep2.register("municipio")}
                  type="text"
                  placeholder="Ex: Campinas"
                  className={`surface-container-lowest border ${formStep2.formState.errors.municipio ? 'border-tertiary' : 'border-outline-variant'} p-3 rounded-lg text-[15px] focus:border-primary focus:ring-1 focus:ring-primary`}
                />
                {formStep2.formState.errors.municipio && <span className="text-xs text-tertiary">{formStep2.formState.errors.municipio.message}</span>}
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <button
                type="submit"
                className="bg-primary text-on-primary rounded-lg px-6 py-3 font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors"
              >
                Próximo passo <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <form onSubmit={formStep3.handleSubmit(onFinalSubmit)} className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface">Nome/Número do Galpão</label>
              <input
                {...formStep3.register("galpaoNome")}
                type="text"
                placeholder="Ex: Galpão 01"
                className={`surface-container-lowest border ${formStep3.formState.errors.galpaoNome ? 'border-tertiary' : 'border-outline-variant'} p-3 rounded-lg text-[15px] focus:border-primary focus:ring-1 focus:ring-primary`}
              />
              {formStep3.formState.errors.galpaoNome && <span className="text-xs text-tertiary">{formStep3.formState.errors.galpaoNome.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-on-surface">Comprimento (metros)</label>
                <input
                  {...formStep3.register("comprimento")}
                  type="number"
                  step="0.01"
                  placeholder="Ex: 120"
                  className={`surface-container-lowest border ${formStep3.formState.errors.comprimento ? 'border-tertiary' : 'border-outline-variant'} p-3 rounded-lg text-[15px] focus:border-primary focus:ring-1 focus:ring-primary`}
                />
                {formStep3.formState.errors.comprimento && <span className="text-xs text-tertiary">{formStep3.formState.errors.comprimento.message}</span>}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-on-surface">Largura (metros)</label>
                <input
                  {...formStep3.register("largura")}
                  type="number"
                  step="0.01"
                  placeholder="Ex: 15"
                  className={`surface-container-lowest border ${formStep3.formState.errors.largura ? 'border-tertiary' : 'border-outline-variant'} p-3 rounded-lg text-[15px] focus:border-primary focus:ring-1 focus:ring-primary`}
                />
                {formStep3.formState.errors.largura && <span className="text-xs text-tertiary">{formStep3.formState.errors.largura.message}</span>}
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <button
                type="submit"
                disabled={formStep3.formState.isSubmitting}
                className="bg-primary text-on-primary rounded-lg px-6 py-3 font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors disabled:opacity-70"
              >
                {formStep3.formState.isSubmitting ? "Finalizando..." : "Concluir e entrar"}
                 {!formStep3.formState.isSubmitting && <Check className="w-4 h-4" />}
              </button>
            </div>
          </form>
        )}

      </div>
    </main>
  );
}
