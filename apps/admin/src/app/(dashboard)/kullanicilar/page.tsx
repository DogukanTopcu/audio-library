"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  Ban,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  tcId?: string;
  status: string;
  createdAt: string;
}

interface PaginatedResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_TABS = [
  { label: "TÜMÜ", value: "" },
  { label: "BEKLEYEN", value: "PENDING" },
  { label: "AKTİF", value: "ACTIVE" },
  { label: "ASKIYA ALINMIŞ", value: "SUSPENDED" },
];

const statusBadge = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return { label: "Aktif", className: "bg-green-900/30 text-green-400" };
    case "PENDING":
      return { label: "Bekleyen", className: "bg-yellow-900/30 text-yellow-400" };
    case "SUSPENDED":
      return { label: "Askıda", className: "bg-red-900/30 text-red-400" };
    default:
      return { label: status, className: "bg-zinc-800 text-zinc-400" };
  }
};

const maskTcId = (tc?: string) => {
  if (!tc) return "---";
  return tc.slice(0, 3) + "*".repeat(Math.max(0, tc.length - 3));
};

export default function UsersPage() {
  const { admin } = useAdminAuth();
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/admin/users", { params });
      const result = res.data.data || res.data;
      setData(result);

      // Get pending count for badge
      if (!statusFilter) {
        const pending = (result.items as User[]).filter(
          (u) => u.status === "PENDING"
        ).length;
        setPendingCount(result.pendingCount ?? pending);
      }
    } catch {
      toast.error("Kullanıcılar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleVerify = async (id: string) => {
    setActionId(id);
    try {
      await api.patch(`/admin/users/${id}/verify`);
      toast.success("Kullanıcı doğrulandı");
      fetchUsers();
    } catch {
      toast.error("Doğrulama başarısız");
    } finally {
      setActionId(null);
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm("Bu kullanıcıyı askıya almak istediğinizden emin misiniz?")) return;
    setActionId(id);
    try {
      await api.patch(`/admin/users/${id}/suspend`);
      toast.success("Kullanıcı askıya alındı");
      fetchUsers();
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setActionId(null);
    }
  };

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Kullanıcılar</h1>

      {/* Status tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-[#222] bg-[#0a0a0a] p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={cn(
              "relative rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
              statusFilter === tab.value
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white"
            )}
          >
            {tab.label}
            {tab.value === "PENDING" && pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#222]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#222] bg-[#0a0a0a]">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Ad Soyad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">E-posta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">TC Kimlik</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Kayıt Tarihi</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">
                    Kullanıcı bulunamadı
                  </td>
                </tr>
              ) : (
                items.map((user) => {
                  const badge = statusBadge(user.status);
                  return (
                    <tr key={user.id} className="border-b border-[#222] hover:bg-[#0a0a0a] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-white">{user.name}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-zinc-500 font-mono">{maskTcId(user.tcId)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", badge.className)}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500">
                        {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/kullanicilar/${user.id}`}
                            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-[#111] hover:text-white"
                            title="Görüntüle"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {user.status === "PENDING" && (
                            <button
                              onClick={() => handleVerify(user.id)}
                              disabled={actionId === user.id}
                              className="rounded-lg p-1.5 text-green-400 transition-colors hover:bg-green-900/20 disabled:opacity-50"
                              title="Onayla"
                            >
                              {actionId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {admin?.role === "SUPERADMIN" && user.status !== "SUSPENDED" && (
                            <button
                              onClick={() => handleSuspend(user.id)}
                              disabled={actionId === user.id}
                              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-900/20 hover:text-red-400 disabled:opacity-50"
                              title="Askıya Al"
                            >
                              {actionId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Sayfa {page} / {totalPages} (Toplam {data?.total ?? 0} kayıt)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-[#222] p-2 text-zinc-400 transition-colors hover:bg-[#111] hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-[#222] p-2 text-zinc-400 transition-colors hover:bg-[#111] hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
