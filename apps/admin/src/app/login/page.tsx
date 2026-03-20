"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z.string().min(1, "Şifre gereklidir"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAdminAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success("Giriş başarılı");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <span className="inline-block rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            Yönetici Paneli
          </span>
          <h1 className="text-2xl font-bold text-foreground">Yönetici Girişi</h1>
          <p className="text-sm text-muted-foreground">
            Devam etmek için giriş yapınız
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@example.com"
              className={cn(
                "w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground placeholder-zinc-600 outline-none transition-colors focus:border-ring",
                errors.email ? "border-red-500" : "border-border"
              )}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="********"
              className={cn(
                "w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground placeholder-zinc-600 outline-none transition-colors focus:border-ring",
                errors.password ? "border-red-500" : "border-border"
              )}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
}
