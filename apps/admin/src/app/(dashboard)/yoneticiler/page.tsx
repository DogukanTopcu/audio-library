"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Plus,
  Trash2,
  ShieldCheck,
  X,
} from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const adminSchema = z.object({
  name: z.string().min(1, "Ad gereklidir"),
  email: z.string().email("Geçerli bir e-posta giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  role: z.enum(["SUPERADMIN", "EDITOR"]),
});

type AdminForm = z.infer<typeof adminSchema>;

export default function AdminsPage() {
  const { admin } = useAdminAuth();
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminForm>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      role: "EDITOR",
    },
  });

  // Redirect if not SUPERADMIN
  useEffect(() => {
    if (admin && admin.role !== "SUPERADMIN") {
      router.push("/dashboard");
    }
  }, [admin, router]);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await api.get("/admin/admins");
      const data = res.data.data || res.data;
      setAdmins(Array.isArray(data) ? data : data.items || []);
    } catch {
      toast.error("Yöneticiler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const onSubmit = async (data: AdminForm) => {
    setCreating(true);
    try {
      await api.post("/admin/admins", data);
      toast.success("Yönetici oluşturuldu");
      reset();
      setShowForm(false);
      fetchAdmins();
    } catch {
      toast.error("Yönetici oluşturulamadı");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === admin?.id) {
      toast.error("Kendinizi silemezsiniz");
      return;
    }
    if (!confirm("Bu yöneticiyi silmek istediğinizden emin misiniz?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/admins/${id}`);
      toast.success("Yönetici silindi");
      fetchAdmins();
    } catch {
      toast.error("Silme başarısız");
    } finally {
      setDeletingId(null);
    }
  };

  if (admin?.role !== "SUPERADMIN") return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Yöneticiler</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" />
          Yeni Yönetici
        </button>
      </div>

      {/* New admin form */}
      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Yeni Yönetici Ekle</h2>
            <button
              type="button"
              onClick={() => { setShowForm(false); reset(); }}
              className="text-zinc-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-400">Ad Soyad</label>
              <input
                type="text"
                placeholder="Ad Soyad"
                className={cn(
                  "w-full rounded-lg border bg-[#111] px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-white",
                  errors.name ? "border-red-500" : "border-[#222]"
                )}
                {...register("name")}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-400">E-posta</label>
              <input
                type="email"
                placeholder="admin@example.com"
                className={cn(
                  "w-full rounded-lg border bg-[#111] px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-white",
                  errors.email ? "border-red-500" : "border-[#222]"
                )}
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-400">Şifre</label>
              <input
                type="password"
                placeholder="En az 6 karakter"
                className={cn(
                  "w-full rounded-lg border bg-[#111] px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-white",
                  errors.password ? "border-red-500" : "border-[#222]"
                )}
                {...register("password")}
              />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-400">Rol</label>
              <select
                className={cn(
                  "w-full rounded-lg border bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-white",
                  errors.role ? "border-red-500" : "border-[#222]"
                )}
                {...register("role")}
              >
                <option value="EDITOR">Editör</option>
                <option value="SUPERADMIN">Süper Yönetici</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Oluştur
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#222]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#222] bg-[#0a0a0a]">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Ad Soyad</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">E-posta</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Oluşturulma</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-500">
                  Yönetici bulunamadı
                </td>
              </tr>
            ) : (
              admins.map((a) => (
                <tr key={a.id} className="border-b border-[#222] hover:bg-[#0a0a0a] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-zinc-500" />
                      <span className="text-sm font-medium text-white">{a.name}</span>
                      {a.id === admin?.id && (
                        <span className="rounded-full bg-[#111] border border-[#222] px-2 py-0.5 text-[10px] text-zinc-500">
                          Sen
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{a.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        a.role === "SUPERADMIN"
                          ? "bg-purple-900/30 text-purple-400"
                          : "bg-blue-900/30 text-blue-400"
                      )}
                    >
                      {a.role === "SUPERADMIN" ? "Süper Yönetici" : "Editör"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {new Date(a.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      {a.id !== admin?.id && (
                        <button
                          onClick={() => handleDelete(a.id)}
                          disabled={deletingId === a.id}
                          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-900/20 hover:text-red-400 disabled:opacity-50"
                          title="Sil"
                        >
                          {deletingId === a.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
