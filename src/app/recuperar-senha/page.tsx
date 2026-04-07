"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Key, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const emailSchema = z.object({
  email: z.string().email("Por favor, insira um e-mail válido."),
});

const passwordSchema = z.object({
  password: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres."),
  confirm: z.string()
}).refine((data) => data.password === data.confirm, {
  message: "As senhas informadas não correspondem.",
  path: ["confirm"]
});

type EmailForm = z.infer<typeof emailSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function RecuperarSenhaPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors, isSubmitting: isSubmittingEmail },
  } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onEmailSubmit = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success("Email enviado com sucesso!");
      setStep(2);
    } catch {
      toast.error("Erro ao enviar email.");
    }
  };

  const onPasswordSubmit = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success("Senha atualizada com sucesso!");
      router.push("/login"); // Volta pro login
    } catch {
      toast.error("Erro ao atualizar senha.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="w-full max-w-[400px] p-8 surface-container-lowest rounded-2xl shadow-[0_4px_24px_rgba(25,28,29,0.08)] animate-in fade-in duration-300">
        
        <header className="flex flex-col items-center mb-8 gap-3">
          <div className="bg-primary w-12 h-12 rounded-xl flex items-center justify-center text-on-primary">
            <Key className="w-6 h-6" />
          </div>
          <h1 className="font-manrope font-bold text-2xl tracking-tight text-foreground">
            {step === 1 ? "Recuperar Senha" : "Nova Senha"}
          </h1>
          <p className="text-sm text-on-surface text-center -mt-2">
            {step === 1 
              ? "Informe seu email para receber as instruções." 
              : "Crie uma nova senha de acesso."}
          </p>
        </header>

        {step === 1 ? (
          <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="flex flex-col gap-5 animate-in fade-in">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface">E-mail</label>
              <input
                {...registerEmail("email")}
                type="email"
                placeholder="seu@email.com"
                className={`surface-container-lowest border ${
                  emailErrors.email ? "border-tertiary" : "border-outline-variant"
                } p-3 rounded-lg text-[15px] text-foreground font-inter focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all`}
              />
              {emailErrors.email && (
                <span className="text-xs text-tertiary font-medium">
                  {emailErrors.email.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmittingEmail}
              className="bg-primary text-on-primary font-semibold p-3.5 rounded-lg text-[15px] transition-all hover:bg-primary-container active:scale-[0.98] mt-2 disabled:opacity-70"
            >
              {isSubmittingEmail ? "Enviando..." : "Enviar link"}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="flex flex-col gap-5 animate-in slide-in-from-right-4 fade-in">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface">Nova Senha</label>
              <input
                {...registerPassword("password")}
                type="password"
                placeholder="••••••••"
                className={`surface-container-lowest border ${
                  passwordErrors.password ? "border-tertiary" : "border-outline-variant"
                } p-3 rounded-lg text-[15px] text-foreground font-inter focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all`}
              />
              {passwordErrors.password && (
                <span className="text-xs text-tertiary font-medium">
                  {passwordErrors.password.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface">Confirmar Senha</label>
              <input
                {...registerPassword("confirm")}
                type="password"
                placeholder="••••••••"
                className={`surface-container-lowest border ${
                  passwordErrors.confirm ? "border-tertiary" : "border-outline-variant"
                } p-3 rounded-lg text-[15px] text-foreground font-inter focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all`}
              />
              {passwordErrors.confirm && (
                <span className="text-xs text-tertiary font-medium">
                  {passwordErrors.confirm.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmittingPassword}
              className="bg-primary text-on-primary font-semibold p-3.5 rounded-lg text-[15px] transition-all hover:bg-primary-container active:scale-[0.98] mt-2 disabled:opacity-70"
            >
              {isSubmittingPassword ? "Atualizando..." : "Redefinir Senha"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm mb-4 group"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao login
          </Link>
        </div>

      </div>
    </main>
  );
}
