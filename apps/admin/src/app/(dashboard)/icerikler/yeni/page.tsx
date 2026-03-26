"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Loader2, Upload, ArrowLeft } from "lucide-react";
import Link from "next/link";

const contentSchema = z.object({
  title: z.string().min(1, "Başlık gereklidir"),
  type: z.string().min(1, "Tür seçiniz"),
  description: z.string().optional(),
  author: z.string().optional(),
  publisher: z.string().optional(),
});

type ContentForm = z.infer<typeof contentSchema>;

export default function CreateContentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContentForm>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      type: "",
    },
  });

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ContentForm) => {
    setIsSubmitting(true);
    try {
      let coverImageKey: string | undefined;

      // Step 1: Upload cover image if provided
      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);
        const uploadRes = await api.post("/upload/image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const uploadData = uploadRes.data?.data ?? uploadRes.data;
        coverImageKey = uploadData.key;
      }

      // Step 2: Create content with JSON body
      await api.post("/admin/content", {
        title: data.title,
        type: data.type,
        description: data.description || undefined,
        author: data.author || undefined,
        publisher: data.publisher || undefined,
        coverImageKey,
      });

      toast.success("İçerik oluşturuldu");
      router.push("/icerikler");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "İçerik oluşturulurken hata oluştu";
      toast.error(typeof msg === "string" ? msg : "İçerik oluşturulurken hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/icerikler"
          className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Yeni İçerik</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-xl border border-border bg-card p-6">
        {/* Cover Image */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground">Kapak Görseli</label>
          <div className="flex items-start gap-4">
            {coverPreview ? (
              <img
                src={coverPreview}
                alt="Kapak önizleme"
                className="h-32 w-24 rounded-lg object-cover border border-border"
              />
            ) : (
              <div className="flex h-32 w-24 items-center justify-center rounded-lg border border-dashed border-input bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-xs file:text-muted-foreground file:cursor-pointer hover:file:bg-accent"
              />
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG veya WebP. Maks 5MB.</p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-muted-foreground">
            Başlık
          </label>
          <input
            id="title"
            type="text"
            placeholder="İçerik başlığı"
            className={cn(
              "w-full rounded-lg border bg-muted px-4 py-2.5 text-sm text-foreground placeholder-zinc-600 outline-none transition-colors focus:border-ring",
              errors.title ? "border-red-500" : "border-border"
            )}
            {...register("title")}
          />
          {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
        </div>

        {/* Type */}
        <div className="space-y-2">
          <label htmlFor="type" className="block text-sm font-medium text-muted-foreground">
            Tür
          </label>
          <select
            id="type"
            className={cn(
              "w-full rounded-lg border bg-muted px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-ring",
              errors.type ? "border-red-500" : "border-border"
            )}
            {...register("type")}
          >
            <option value="">Tür seçiniz</option>
            <option value="TEXTBOOK">Ders Kitabı</option>
            <option value="NOVEL">Roman</option>
            <option value="PRACTICE_TEST">Deneme Sınavı</option>
            <option value="QUESTION_BANK">Soru Bankası</option>
            <option value="OTHER">Diğer</option>
          </select>
          {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-muted-foreground">
            Açıklama
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="İçerik açıklaması (opsiyonel)"
            className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder-zinc-600 outline-none transition-colors focus:border-ring resize-none"
            {...register("description")}
          />
        </div>

        {/* Author */}
        <div className="space-y-2">
          <label htmlFor="author" className="block text-sm font-medium text-muted-foreground">
            Yazar
          </label>
          <input
            id="author"
            type="text"
            placeholder="Yazar adı (opsiyonel)"
            className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder-zinc-600 outline-none transition-colors focus:border-ring"
            {...register("author")}
          />
        </div>

        {/* Publisher */}
        <div className="space-y-2">
          <label htmlFor="publisher" className="block text-sm font-medium text-muted-foreground">
            Yayınevi
          </label>
          <input
            id="publisher"
            type="text"
            placeholder="Yayınevi (opsiyonel)"
            className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder-zinc-600 outline-none transition-colors focus:border-ring"
            {...register("publisher")}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/icerikler"
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Oluştur
          </button>
        </div>
      </form>
    </div>
  );
}
