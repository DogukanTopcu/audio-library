"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-posta adresi gereklidir")
    .email("Geçerli bir e-posta adresi giriniz"),
  password: z
    .string()
    .min(1, "Şifre gereklidir")
    .min(6, "Şifre en az 6 karakter olmalıdır"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success("Giriş başarılı! Yönlendiriliyorsunuz...");
      router.push("/kesfet");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Giriş yapılamadı. Lütfen bilgilerinizi kontrol ediniz.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-foreground">
            Giriş Yap
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-[18px] text-foreground font-medium"
              >
                E-posta Adresi
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-label="E-posta adresi"
                aria-describedby={errors.email ? "email-error" : undefined}
                aria-invalid={!!errors.email}
                placeholder="ornek@email.com"
                className="h-[48px] text-[18px] bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30"
                {...register("email")}
              />
              {errors.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="text-[#ef4444] text-[16px] mt-1"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-[18px] text-foreground font-medium"
              >
                Şifre
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-label="Şifre"
                  aria-describedby={errors.password ? "password-error" : undefined}
                  aria-invalid={!!errors.password}
                  placeholder="Şifrenizi giriniz"
                  className="h-[48px] text-[18px] bg-background border-border text-foreground placeholder:text-muted-foreground pr-14 focus-visible:border-ring focus-visible:ring-ring/30"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 min-h-[48px] flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="w-6 h-6" aria-hidden="true" />
                  ) : (
                    <Eye className="w-6 h-6" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="text-[#ef4444] text-[16px] mt-1"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              aria-label="Giriş yap"
              className="w-full h-[52px] text-[18px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span
                    className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                    aria-hidden="true"
                  />
                  Giriş yapılıyor...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" aria-hidden="true" />
                  Giriş Yap
                </span>
              )}
            </Button>
          </form>

          <p className="text-center mt-8 text-[18px] text-muted-foreground">
            Hesabınız yok mu?{" "}
            <Link
              href="/kayit"
              className="text-foreground font-semibold hover:underline"
              aria-label="Kayıt ol sayfasına git"
            >
              Kayıt olun
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
