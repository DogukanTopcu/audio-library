"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  FileText,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ------------------------------------------------------------------ */
/*  Step 1 schema                                                      */
/* ------------------------------------------------------------------ */
const step1Schema = z
  .object({
    name: z.string().min(1, "Ad soyad gereklidir").min(2, "Ad soyad en az 2 karakter olmalıdır"),
    email: z.string().min(1, "E-posta gereklidir").email("Geçerli bir e-posta giriniz"),
    password: z
      .string()
      .min(1, "Şifre gereklidir")
      .min(8, "Şifre en az 8 karakter olmalıdır"),
    password_confirm: z.string().min(1, "Şifre tekrarı gereklidir"),
    phone_number: z
      .string()
      .min(1, "Telefon numarası gereklidir")
      .regex(/^[0-9]{10,11}$/, "Geçerli bir telefon numarası giriniz (10-11 rakam)"),
    tc_id: z
      .string()
      .min(1, "TC Kimlik No gereklidir")
      .regex(/^[0-9]{11}$/, "TC Kimlik No 11 haneli olmalıdır"),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Şifreler eşleşmiyor",
    path: ["password_confirm"],
  });

type Step1Data = z.infer<typeof step1Schema>;

/* ------------------------------------------------------------------ */
/*  Password strength                                                   */
/* ------------------------------------------------------------------ */
function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Zayıf", color: "#ef4444" };
  if (score <= 2) return { score, label: "Orta", color: "#eab308" };
  if (score <= 3) return { score, label: "İyi", color: "#22c55e" };
  return { score, label: "Güçlü", color: "#22c55e" };
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */
export default function RegistrationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Step 1 data
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);

  // Step 2 state
  const [documentKey, setDocumentKey] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Step 3 state
  const [kvkkConsent, setKvkkConsent] = useState(false);
  const [tosConsent, setTosConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Final state
  const [submitted, setSubmitted] = useState(false);

  /* Step 1 form */
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
  });

  const watchedPassword = watch("password", "");
  const passwordStrength = getPasswordStrength(watchedPassword || "");

  const onStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  /* Step 2: File upload */
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (isUploading) return;
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const { data } = await api.post("/upload/document", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percent);
            }
          },
        });

        const key = data.data?.key || data.key;
        setDocumentKey(key);
        setUploadedFileName(file.name);
        toast.success("Belge başarıyla yüklendi");
      } catch {
        toast.error("Belge yüklenirken bir hata oluştu. Lütfen tekrar deneyiniz.");
        setUploadProgress(0);
      } finally {
        setIsUploading(false);
      }
    },
    [isUploading]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  /* Step 3: Submit registration */
  const handleRegistration = async () => {
    if (!step1Data || !documentKey) return;
    setIsSubmitting(true);

    try {
      await api.post("/auth/register", {
        name: step1Data.name,
        email: step1Data.email,
        password: step1Data.password,
        tc_id: step1Data.tc_id,
        phone_number: step1Data.phone_number,
        disability_document_key: documentKey,
        legal_consent: true,
      });
      setSubmitted(true);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Kayıt sırasında bir hata oluştu.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------ Submitted / Waiting Screen ------ */
  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
        <div className="w-full max-w-lg text-center">
          <div className="bg-card border border-border rounded-xl p-10">
            <CheckCircle2
              className="w-20 h-20 text-[#22c55e] mx-auto mb-6"
              aria-hidden="true"
            />
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Başvurunuz Alındı
            </h1>
            <p className="text-[18px] text-muted-foreground mb-6 leading-relaxed">
              Kayıt başvurunuz başarıyla alınmıştır. Yöneticilerimiz belgenizi
              inceledikten sonra hesabınız aktifleştirilecektir. Bu süreç
              genellikle 1-3 iş günü sürmektedir.
            </p>
            <p className="text-[18px] text-muted-foreground mb-8">
              E-posta adresinize bir doğrulama bağlantısı gönderilmiştir.
              Lütfen e-postanızı kontrol ediniz.
            </p>
            <Link
              href="/giris"
              className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg text-[18px] no-underline hover:bg-primary/90 transition-colors min-h-[48px]"
              aria-label="Giriş sayfasına dön"
            >
              Giriş Sayfasına Dön
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* ------ Step indicator ------ */
  const stepLabels = ["Kişisel Bilgiler", "Belge Yükleme", "Yasal Onay"];

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-2xl">
        <div className="bg-card border border-border rounded-xl p-8">
          <h1 className="text-3xl font-bold text-center mb-2 text-foreground">
            Kayıt Ol
          </h1>

          {/* Step indicator */}
          <nav aria-label="Kayıt adımları" className="mb-8">
            <ol className="flex items-center justify-center gap-2 mt-4">
              {stepLabels.map((label, i) => {
                const stepNum = i + 1;
                const isActive = stepNum === currentStep;
                const isComplete = stepNum < currentStep;
                return (
                  <li key={label} className="flex items-center gap-2">
                    <span
                      className={`flex items-center justify-center w-10 h-10 rounded-full text-[16px] font-bold border-2 transition-colors ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : isComplete
                            ? "border-[#22c55e] bg-[#22c55e] text-white"
                            : "bg-transparent text-muted-foreground border-input"
                      }`}
                      aria-current={isActive ? "step" : undefined}
                    >
                      {isComplete ? (
                        <Check className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        stepNum
                      )}
                    </span>
                    <span
                      className={`text-[16px] hidden sm:inline ${
                        isActive
                          ? "text-foreground font-semibold"
                          : isComplete
                            ? "text-[#22c55e]"
                            : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                    {i < stepLabels.length - 1 && (
                      <span
                        className={`w-8 h-px mx-1 ${
                          isComplete ? "bg-[#22c55e]" : "bg-border"
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* =================== STEP 1 =================== */}
          {currentStep === 1 && (
            <form
              onSubmit={handleSubmit(onStep1Submit)}
              noValidate
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[18px] text-foreground">
                  Ad Soyad
                </Label>
                <Input
                  id="name"
                  type="text"
                  aria-label="Ad soyad"
                  aria-describedby={errors.name ? "name-error" : undefined}
                  aria-invalid={!!errors.name}
                  placeholder="Ad Soyad"
                  className="h-[48px] text-[18px] bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30"
                  {...register("name")}
                />
                {errors.name && (
                  <p id="name-error" role="alert" className="text-[#ef4444] text-[16px]">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[18px] text-foreground">
                  E-posta Adresi
                </Label>
                <Input
                  id="email"
                  type="email"
                  aria-label="E-posta adresi"
                  aria-describedby={errors.email ? "email-error" : undefined}
                  aria-invalid={!!errors.email}
                  placeholder="ornek@email.com"
                  className="h-[48px] text-[18px] bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30"
                  {...register("email")}
                />
                {errors.email && (
                  <p id="email-error" role="alert" className="text-[#ef4444] text-[16px]">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[18px] text-foreground">
                    Şifre
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      aria-label="Şifre"
                      aria-describedby={
                        errors.password ? "password-error" : "password-strength"
                      }
                      aria-invalid={!!errors.password}
                      placeholder="En az 8 karakter"
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
                        <EyeOff className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <Eye className="w-5 h-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" role="alert" className="text-[#ef4444] text-[16px]">
                      {errors.password.message}
                    </p>
                  )}
                  {watchedPassword && (
                    <div id="password-strength" className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className="h-1.5 flex-1 rounded-full transition-colors"
                            style={{
                              backgroundColor:
                                level <= passwordStrength.score
                                  ? passwordStrength.color
                                  : "var(--muted)",
                            }}
                          />
                        ))}
                      </div>
                      <p
                        className="text-[14px]"
                        style={{ color: passwordStrength.color }}
                      >
                        Şifre gücü: {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password_confirm"
                    className="text-[18px] text-foreground"
                  >
                    Şifre Tekrar
                  </Label>
                  <div className="relative">
                    <Input
                      id="password_confirm"
                      type={showPasswordConfirm ? "text" : "password"}
                      aria-label="Şifre tekrar"
                      aria-describedby={
                        errors.password_confirm
                          ? "password-confirm-error"
                          : undefined
                      }
                      aria-invalid={!!errors.password_confirm}
                      placeholder="Şifrenizi tekrar giriniz"
                      className="h-[48px] text-[18px] bg-background border-border text-foreground placeholder:text-muted-foreground pr-14 focus-visible:border-ring focus-visible:ring-ring/30"
                      {...register("password_confirm")}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswordConfirm(!showPasswordConfirm)
                      }
                      aria-label={
                        showPasswordConfirm ? "Şifreyi gizle" : "Şifreyi göster"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 min-h-[48px] flex items-center"
                    >
                      {showPasswordConfirm ? (
                        <EyeOff className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <Eye className="w-5 h-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {errors.password_confirm && (
                    <p
                      id="password-confirm-error"
                      role="alert"
                      className="text-[#ef4444] text-[16px]"
                    >
                      {errors.password_confirm.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="phone_number" className="text-[18px] text-foreground">
                    Telefon Numarası
                  </Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    aria-label="Telefon numarası"
                    aria-describedby={
                      errors.phone_number ? "phone-error" : undefined
                    }
                    aria-invalid={!!errors.phone_number}
                    placeholder="05XX XXX XX XX"
                    className="h-[48px] text-[18px] bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30"
                    {...register("phone_number")}
                  />
                  {errors.phone_number && (
                    <p
                      id="phone-error"
                      role="alert"
                      className="text-[#ef4444] text-[16px]"
                    >
                      {errors.phone_number.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tc_id" className="text-[18px] text-foreground">
                    TC Kimlik No
                  </Label>
                  <Input
                    id="tc_id"
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    aria-label="TC Kimlik numarası"
                    aria-describedby={errors.tc_id ? "tc-error" : undefined}
                    aria-invalid={!!errors.tc_id}
                    placeholder="XXXXXXXXXXX"
                    className="h-[48px] text-[18px] bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30"
                    {...register("tc_id")}
                  />
                  {errors.tc_id && (
                    <p id="tc-error" role="alert" className="text-[#ef4444] text-[16px]">
                      {errors.tc_id.message}
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                aria-label="Sonraki adıma geç"
                className="w-full h-[52px] text-[18px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg mt-4"
              >
                <span className="flex items-center gap-2">
                  Devam Et
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </span>
              </Button>

              <p className="text-center text-[18px] text-muted-foreground">
                Zaten hesabınız var mı?{" "}
                <Link
                  href="/giris"
                  className="text-foreground font-semibold hover:underline"
                  aria-label="Giriş sayfasına git"
                >
                  Giriş yapın
                </Link>
              </p>
            </form>
          )}

          {/* =================== STEP 2 =================== */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-background border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  Neden Belge Gerekli?
                </h2>
                <p className="text-[18px] text-muted-foreground leading-relaxed">
                  Platformumuz, görme engelli bireylere özel olarak hazırlanmış
                  sesli içerikler sunmaktadır. Hizmetlerimizin doğru
                  kişilere ulaşması için engel durumunuzu belgeleyen resmi bir
                  belge (sağlık kurulu raporu, engelli kimlik kartı vb.)
                  yüklemenizi rica ediyoruz. Belgeleriniz gizlilik kapsamında
                  korunmaktadır.
                </p>
              </div>

              {!documentKey ? (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Belge yüklemek için tıklayın veya sürükleyip bırakın"
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                    isDragging
                      ? "border-ring bg-accent"
                      : "border-input hover:border-ring"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={onFileChange}
                    aria-label="Belge dosyası seçin"
                  />

                  {isUploading ? (
                    <div className="space-y-4">
                      <Loader2
                        className="w-12 h-12 text-foreground mx-auto animate-spin"
                        aria-hidden="true"
                      />
                      <p className="text-[18px] text-foreground">
                        Yükleniyor... %{uploadProgress}
                      </p>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                          role="progressbar"
                          aria-valuenow={uploadProgress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Yükleme ilerleme: yüzde ${uploadProgress}`}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload
                        className="w-12 h-12 text-muted-foreground mx-auto mb-4"
                        aria-hidden="true"
                      />
                      <p className="text-[18px] text-foreground mb-2">
                        Belgenizi sürükleyip bırakın
                      </p>
                      <p className="text-[16px] text-muted-foreground mb-4">
                        veya dosya seçmek için tıklayın
                      </p>
                      <p className="text-[14px] text-muted-foreground">
                        PDF, JPG veya PNG formatları kabul edilmektedir
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="border border-[#22c55e] rounded-xl p-6 flex items-center gap-4">
                  <FileText
                    className="w-10 h-10 text-[#22c55e] flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[18px] text-foreground font-medium truncate">
                      {uploadedFileName}
                    </p>
                    <p className="text-[16px] text-[#22c55e]">
                      Başarıyla yüklendi
                    </p>
                  </div>
                  <CheckCircle2
                    className="w-8 h-8 text-[#22c55e] flex-shrink-0"
                    aria-hidden="true"
                  />
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  aria-label="Önceki adıma dön"
                  className="flex-1 h-[52px] text-[18px] font-semibold bg-transparent border border-input text-foreground hover:bg-muted rounded-lg"
                >
                  <span className="flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                    Geri
                  </span>
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={!documentKey}
                  aria-label="Sonraki adıma geç"
                  className="flex-1 h-[52px] text-[18px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg disabled:opacity-40"
                >
                  <span className="flex items-center gap-2">
                    Devam Et
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* =================== STEP 3 =================== */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* KVKK */}
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-foreground">
                  KVKK Aydınlatma Metni
                </h2>
                <div
                  className="bg-background border border-border rounded-lg p-4 h-48 overflow-y-auto text-[16px] text-muted-foreground leading-relaxed"
                  tabIndex={0}
                  role="document"
                  aria-label="KVKK aydınlatma metni"
                >
                  <p>
                    6698 sayılı Kişisel Verilerin Korunması Kanunu
                    (&quot;KVKK&quot;) uyarınca, kişisel verileriniz veri
                    sorumlusu olarak Ozan Bayır Sesli Kütüphanesi tarafından
                    aşağıda açıklanan kapsamda işlenebilecektir.
                  </p>
                  <p className="mt-3">
                    Toplanan kişisel verileriniz; kimlik bilgileri (ad, soyad, TC
                    kimlik numarası), iletişim bilgileri (e-posta, telefon
                    numarası), sağlık verileri (engel durumu belgesi) ve kullanım
                    verilerini kapsamaktadır.
                  </p>
                  <p className="mt-3">
                    Bu veriler; üyelik işlemlerinin gerçekleştirilmesi, hizmet
                    sunulması, yasal yükümlülüklerin yerine getirilmesi ve
                    hizmet kalitesinin artırılması amaçlarıyla işlenmektedir.
                  </p>
                  <p className="mt-3">
                    Kişisel verileriniz, KVKK&apos;nın 5. ve 6. maddelerinde
                    belirtilen işleme şartlarına uygun olarak, gerekli teknik ve
                    idari tedbirler alınarak işlenmekte ve korunmaktadır.
                  </p>
                  <p className="mt-3">
                    KVKK&apos;nın 11. maddesi kapsamında; verilerinizin işlenip
                    işlenmediğini öğrenme, işlenme amacını ve amacına uygun
                    kullanılıp kullanılmadığını öğrenme, düzeltme veya silme
                    talep etme haklarına sahipsiniz.
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer min-h-[48px] py-2">
                  <input
                    type="checkbox"
                    checked={kvkkConsent}
                    onChange={(e) => setKvkkConsent(e.target.checked)}
                    className="w-6 h-6 mt-0.5 rounded border-input bg-background accent-primary flex-shrink-0"
                    aria-label="KVKK aydınlatma metnini okudum ve kabul ediyorum"
                  />
                  <span className="text-[18px] text-foreground">
                    KVKK Aydınlatma Metnini okudum ve kabul ediyorum
                  </span>
                </label>
              </div>

              {/* Terms of Service */}
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-foreground">
                  Kullanım Koşulları
                </h2>
                <div
                  className="bg-background border border-border rounded-lg p-4 h-48 overflow-y-auto text-[16px] text-muted-foreground leading-relaxed"
                  tabIndex={0}
                  role="document"
                  aria-label="Kullanım koşulları metni"
                >
                  <p>
                    Ozan Bayır Sesli Kütüphanesi Kullanım Koşulları
                  </p>
                  <p className="mt-3">
                    1. Platformumuz, görme engelli bireylerin eğitim
                    materyallerine erişimini kolaylaştırmak amacıyla
                    oluşturulmuş bir sosyal sorumluluk projesidir.
                  </p>
                  <p className="mt-3">
                    2. Platformdaki içerikler yalnızca kayıtlı ve onaylanmış
                    kullanıcılar tarafından erişilebilir. İçeriklerin kopyalanması,
                    dağıtılması veya ticari amaçla kullanılması yasaktır.
                  </p>
                  <p className="mt-3">
                    3. Kullanıcılar, kayıt sırasında verdikleri bilgilerin
                    doğruluğundan sorumludur. Yanlış veya yanıltıcı bilgi
                    verilmesi durumunda hesap askıya alınabilir.
                  </p>
                  <p className="mt-3">
                    4. Platform, içeriklerin sürekli erişilebilirliğini garanti
                    etmez. Teknik bakım veya güncellemeler nedeniyle geçici
                    kesintiler yaşanabilir.
                  </p>
                  <p className="mt-3">
                    5. Kullanıcı hesapları kişiseldir ve başka kişilerle
                    paylaşılamaz. Hesap güvenliğinden kullanıcı sorumludur.
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer min-h-[48px] py-2">
                  <input
                    type="checkbox"
                    checked={tosConsent}
                    onChange={(e) => setTosConsent(e.target.checked)}
                    className="w-6 h-6 mt-0.5 rounded border-input bg-background accent-primary flex-shrink-0"
                    aria-label="Kullanım koşullarını okudum ve kabul ediyorum"
                  />
                  <span className="text-[18px] text-foreground">
                    Kullanım Koşullarını okudum ve kabul ediyorum
                  </span>
                </label>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  aria-label="Önceki adıma dön"
                  className="flex-1 h-[52px] text-[18px] font-semibold bg-transparent border border-input text-foreground hover:bg-muted rounded-lg"
                >
                  <span className="flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                    Geri
                  </span>
                </Button>
                <Button
                  type="button"
                  onClick={handleRegistration}
                  disabled={!kvkkConsent || !tosConsent || isSubmitting}
                  aria-label="Kayıt ol"
                  className="flex-1 h-[52px] text-[18px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2
                        className="w-5 h-5 animate-spin"
                        aria-hidden="true"
                      />
                      Gönderiliyor...
                    </span>
                  ) : (
                    "Kayıt Ol"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
