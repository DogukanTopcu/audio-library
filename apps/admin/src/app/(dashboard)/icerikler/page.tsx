"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Library,
} from "lucide-react";

interface Content {
  id: string;
  title: string;
  type: string;
  coverImageKey?: string;
  isActive: boolean;
  createdAt: string;
}

interface PaginatedResponse {
  items: Content[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const typeLabels: Record<string, string> = {
  TEXTBOOK: "Ders Kitabı",
  NOVEL: "Roman",
  PRACTICE_TEST: "Deneme Sınavı",
  QUESTION_BANK: "Soru Bankası",
  OTHER: "Diğer",
};

export default function ContentListPage() {
  const { admin } = useAdminAuth();
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (activeFilter !== "") params.isActive = activeFilter;
      const res = await api.get("/admin/content", { params });
      // TransformInterceptor wraps response as { success, data: <payload>, timestamp }
      // ContentService.findAll returns { data: [...items], meta: { total, page, limit, totalPages } }
      // So full shape: res.data = { success, data: { data: [...], meta: {...} }, timestamp }
      const payload = res.data?.data ?? res.data;
      const items = payload?.data ?? payload?.items ?? (Array.isArray(payload) ? payload : []);
      const meta = payload?.meta;
      setData({
        items,
        total: meta?.total ?? items.length,
        page: meta?.page ?? page,
        limit: meta?.limit ?? 20,
        totalPages: meta?.totalPages ?? 1,
      });
    } catch {
      toast.error("İçerikler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, activeFilter]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleSearchChange = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  };

  const handleToggleActive = async (item: Content) => {
    setTogglingId(item.id);
    try {
      await api.patch(`/admin/content/${item.id}`, { isActive: !item.isActive });
      toast.success(item.isActive ? "İçerik pasif yapıldı" : "İçerik aktif yapıldı");
      fetchContent();
    } catch {
      toast.error("Durum değiştirilemedi");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu içeriği silmek istediğinizden emin misiniz?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/content/${id}`);
      toast.success("İçerik silindi");
      fetchContent();
    } catch {
      toast.error("Silme işlemi başarısız");
    } finally {
      setDeletingId(null);
    }
  };

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">İçerikler</h1>
        <Link
          href="/icerikler/yeni"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Yeni İçerik
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="İçerik ara..."
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-ring"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
        >
          <option value="">Tüm Türler</option>
          <option value="TEXTBOOK">Ders Kitabı</option>
          <option value="NOVEL">Roman</option>
          <option value="PRACTICE_TEST">Deneme Sınavı</option>
          <option value="QUESTION_BANK">Soru Bankası</option>
          <option value="OTHER">Diğer</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
        >
          <option value="">Tüm Durumlar</option>
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Kapak</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Başlık</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tür</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Oluşturulma</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    İçerik bulunamadı
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-card transition-colors">
                    <td className="px-4 py-3">
                      {item.coverImageKey ? (
                        <div className="flex h-10 w-8 items-center justify-center rounded bg-primary/10 text-primary">
                          <Library className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="h-10 w-8 rounded bg-muted" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/icerikler/${item.id}`} className="text-sm font-medium text-foreground hover:underline">
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {typeLabels[item.type] || item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          item.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {item.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/icerikler/${item.id}`}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleToggleActive(item)}
                          disabled={togglingId === item.id}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                          title={item.isActive ? "Pasif Yap" : "Aktif Yap"}
                        >
                          {togglingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : item.isActive ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        {admin?.role === "SUPERADMIN" && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Sil"
                          >
                            {deletingId === item.id ? (
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Sayfa {page} / {totalPages} (Toplam {data?.total ?? 0} kayıt)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
