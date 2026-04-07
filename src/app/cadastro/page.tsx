"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Leaf, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "../actions/auth";

const registerSchema = z.object({
  name: z.string().min(3, "O nome deve ter no mínimo 3 caracteres."),
  email: z.string().email("Por favor, insira um e-mail válido."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      const result = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password
      });

      if (result.error) {
         toast.error(result.error);
         return;
      }
      
      toast.success(result.message || "Cadastro realizado! Verifique seu e-mail.");
      if (result.redirectTo) {
        router.push(result.redirectTo);
      } else {
        reset();
      }
      
    } catch {
      toast.error("Ocorreu um erro no servidor ao tentar se registrar");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-full max-w-[450px] p-8 surface-container-lowest rounded-2xl shadow-[0_4px_24px_rgba(25,28,29,0.08)]">
        <header className="flex flex-col items-center mb-8 gap-3 relative">
           <Link href="/login" className="absolute left-0 top-2 text-on-surface-variant hover:text-primary transition-colors">
              <ArrowLeft className="w-5 h-5" />
           </Link>
          <div className="bg-primary w-12 h-12 rounded-xl flex items-center justify-center text-on-primary">
            <Leaf className="w-6 h-6" />
          </div>
          <h1 className="font-manrope font-bold text-2xl tracking-tight text-foreground text-center">
            Crie sua conta
          </h1>
          <p className="text-sm text-on-surface-variant text-center">Junte-se à nova era da Avicultura Digital.</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-on-surface">Nome Completo</label>
            <input
              {...register("name")}
              type="text"
              placeholder="João da Silva"
              className={`surface-container-lowest border ${
                errors.name ? "border-tertiary" : "border-outline-variant"
              } p-3 rounded-lg text-[15px] text-foreground font-inter focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all`}
            />
            {errors.name && (
              <span className="text-xs text-tertiary font-medium">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-on-surface">E-mail</label>
            <input
              {...register("email")}
              type="email"
              placeholder="seu@email.com"
              className={`surface-container-lowest border ${
                errors.email ? "border-tertiary" : "border-outline-variant"
              } p-3 rounded-lg text-[15px] text-foreground font-inter focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all`}
            />
            {errors.email && (
              <span className="text-xs text-tertiary font-medium">
                {errors.email.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-on-surface">Senha</label>
            <input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              className={`surface-container-lowest border ${
                errors.password ? "border-tertiary" : "border-outline-variant"
              } p-3 rounded-lg text-[15px] text-foreground font-inter focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all`}
            />
             {errors.password && (
              <span className="text-xs text-tertiary font-medium">
                {errors.password.message}
              </span>
            )}
          </div>

           <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-on-surface">Confirme a Senha</label>
            <input
              {...register("confirmPassword")}
              type="password"
              placeholder="••••••••"
              className={`surface-container-lowest border ${
                errors.confirmPassword ? "border-tertiary" : "border-outline-variant"
              } p-3 rounded-lg text-[15px] text-foreground font-inter focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all`}
            />
             {errors.confirmPassword && (
              <span className="text-xs text-tertiary font-medium">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-on-primary font-semibold p-3.5 rounded-lg text-[15px] transition-all hover:bg-primary-container active:scale-[0.98] mt-4 disabled:opacity-70"
          >
            {isSubmitting ? "Criando Conta..." : "Criar minha conta"}
          </button>
        </form>

      </div>
    </main>
  );
}
