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
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("type", data.type);
      if (data.description) formData.append("description", data.description);
      if (data.author) formData.append("author", data.author);
      if (data.publisher) formData.append("publisher", data.publisher);
      if (coverFile) formData.append("coverImage", coverFile);

      await api.post("/admin/content", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("İçerik oluşturuldu");
      router.push("/icerikler");
    } catch {
      toast.error("İçerik oluşturulurken hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/icerikler"
          className="rounded-lg border border-[#222] p-2 text-zinc-400 transition-colors hover:bg-[#111] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-white">Yeni İçerik</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
        {/* Cover Image */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Kapak Görseli</label>
          <div className="flex items-start gap-4">
            {coverPreview ? (
              <img
                src={coverPreview}
                alt="Kapak önizleme"
                className="h-32 w-24 rounded-lg object-cover border border-[#222]"
              />
            ) : (
              <div className="flex h-32 w-24 items-center justify-center rounded-lg border border-dashed border-[#333] bg-[#111]">
                <Upload className="h-6 w-6 text-zinc-600" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border file:border-[#222] file:bg-[#111] file:px-3 file:py-1.5 file:text-xs file:text-zinc-300 file:cursor-pointer hover:file:bg-[#1a1a1a]"
              />
              <p className="mt-1 text-xs text-zinc-600">PNG, JPG veya WebP. Maks 5MB.</p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-zinc-300">
            Başlık
          </label>
          <input
            id="title"
            type="text"
            placeholder="İçerik başlığı"
            className={cn(
              "w-full rounded-lg border bg-[#111] px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-white",
              errors.title ? "border-red-500" : "border-[#222]"
            )}
            {...register("title")}
          />
          {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
        </div>

        {/* Type */}
        <div className="space-y-2">
          <label htmlFor="type" className="block text-sm font-medium text-zinc-300">
            Tür
          </label>
          <select
            id="type"
            className={cn(
              "w-full rounded-lg border bg-[#111] px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-white",
              errors.type ? "border-red-500" : "border-[#222]"
            )}
            {...register("type")}
          >
            <option value="">Tür seçiniz</option>
            <option value="BOOK">Kitap</option>
            <option value="PODCAST">Podcast</option>
            <option value="LECTURE">Ders</option>
            <option value="AUDIOBOOK">Sesli Kitap</option>
          </select>
          {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-zinc-300">
            Açıklama
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="İçerik açıklaması (opsiyonel)"
            className="w-full rounded-lg border border-[#222] bg-[#111] px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-white resize-none"
            {...register("description")}
          />
        </div>

        {/* Author */}
        <div className="space-y-2">
          <label htmlFor="author" className="block text-sm font-medium text-zinc-300">
            Yazar
          </label>
          <input
            id="author"
            type="text"
            placeholder="Yazar adı (opsiyonel)"
            className="w-full rounded-lg border border-[#222] bg-[#111] px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-white"
            {...register("author")}
          />
        </div>

        {/* Publisher */}
        <div className="space-y-2">
          <label htmlFor="publisher" className="block text-sm font-medium text-zinc-300">
            Yayınevi
          </label>
          <input
            id="publisher"
            type="text"
            placeholder="Yayınevi (opsiyonel)"
            className="w-full rounded-lg border border-[#222] bg-[#111] px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-white"
            {...register("publisher")}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/icerikler"
            className="rounded-lg border border-[#222] px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-[#111] hover:text-white"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Oluştur
          </button>
        </div>
      </form>
    </div>
  );
}
