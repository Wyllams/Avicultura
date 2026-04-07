"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Leaf } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser } from "../actions/auth";

const loginSchema = z.object({
  email: z.string().email("Por favor, insira um e-mail válido."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await loginUser({
        email: data.email,
        password: data.password
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      toast.success("Credenciais válidas!");
      router.push(result.redirectTo || "/dashboard"); 
    } catch {
      toast.error("Erro ao realizar login");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-tertiary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[400px] p-8 surface-container-lowest rounded-2xl shadow-[0_4px_24px_rgba(25,28,29,0.08)] animate-in fade-in zoom-in-95 duration-500 relative z-10 border border-outline-variant/30">
        <header className="flex flex-col items-center mb-8 gap-3">
          <div className="bg-primary w-14 h-14 rounded-2xl flex items-center justify-center text-on-primary shadow-lg shadow-primary/20">
            <Leaf className="w-7 h-7" />
          </div>
          <h1 className="font-manrope font-bold text-3xl tracking-tight text-foreground mt-2">
            Avicultura
          </h1>
          <p className="text-on-surface-variant text-sm font-medium">Gestão de Inteligência no Campo</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
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
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-on-surface">Senha</label>
               <Link
                href="/recuperar-senha"
                className="text-primary text-sm font-semibold hover:underline"
              >
                Esqueceu?
              </Link>
            </div>
            
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-on-primary font-semibold p-3.5 rounded-lg text-[15px] transition-all hover:bg-primary-container active:scale-[0.98] mt-2 disabled:opacity-70 shadow-md shadow-primary/10"
          >
            {isSubmitting ? "Entrando..." : "Entrar na plataforma"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-outline-variant/60 text-center flex flex-col gap-3">
          <p className="text-on-surface-variant text-sm">
            Novo por aqui? Construa sua granja digital.
          </p>
          <Link
            href="/cadastro"
            className="text-primary font-bold hover:text-primary-container transition-colors py-2 px-4 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/20"
          >
            Criar minha conta agora
          </Link>
        </div>
      </div>
    </main>
  );
}
