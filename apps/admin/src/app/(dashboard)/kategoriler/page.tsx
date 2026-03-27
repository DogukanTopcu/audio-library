"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Loader2,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  orderIndex: number;
  children: CategoryNode[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/İ/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function KategorilerPage() {
  const { admin } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/categories");
      const cats = res.data?.data ?? res.data ?? [];
      setCategories(Array.isArray(cats) ? cats : []);
    } catch {
      toast.error("Kategoriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const parentSlug = newParentId
        ? categories.find((c) => c.id === newParentId)?.slug
        : null;
      const slug = parentSlug
        ? `${parentSlug}-${slugify(newName)}`
        : slugify(newName);
      await api.post("/admin/categories", {
        name: newName.trim(),
        slug,
        parentId: newParentId || undefined,
      });
      toast.success("Kategori oluşturuldu");
      setNewName("");
      setNewParentId(null);
      setShowNewForm(false);
      fetchCategories();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message;
      toast.error(typeof msg === "string" ? msg : "Kategori oluşturulamadı");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kategoriyi silmek istediğinizden emin misiniz?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success("Kategori silindi");
      fetchCategories();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message;
      toast.error(typeof msg === "string" ? msg : "Kategori silinemedi");
    } finally {
      setDeletingId(null);
    }
  };

  const renderCategory = (cat: CategoryNode, depth = 0) => {
    const isExpanded = expanded.has(cat.id);
    const hasChildren = cat.children && cat.children.length > 0;
    return (
      <div key={cat.id}>
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
            depth === 0
              ? "border-b border-border"
              : "border-b border-border/50"
          )}
          style={{ paddingLeft: `${16 + depth * 24}px` }}
        >
          <button
            onClick={() => toggleExpand(cat.id)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <FolderOpen
            className={cn(
              "h-4 w-4 shrink-0",
              depth === 0 ? "text-primary" : "text-muted-foreground"
            )}
          />
          <span
            className={cn(
              "text-sm flex-1",
              depth === 0
                ? "font-semibold text-foreground"
                : "font-medium text-foreground/80"
            )}
          >
            {cat.name}
          </span>
          {hasChildren && (
            <span className="text-[11px] text-muted-foreground">
              {cat.children.length} alt kategori
            </span>
          )}
          {depth === 0 && (
            <button
              onClick={() => {
                setNewParentId(cat.id);
                setShowNewForm(true);
              }}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
              title="Alt kategori ekle"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          {admin?.role === "SUPERADMIN" && (
            <button
              onClick={() => handleDelete(cat.id)}
              disabled={deletingId === cat.id}
              className="rounded p-1 text-muted-foreground hover:text-red-600 disabled:opacity-50"
              title="Sil"
            >
              {deletingId === cat.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
        {isExpanded && hasChildren && (
          <div className={cn(depth === 0 ? "bg-card/50" : "bg-muted/20")}>
            {cat.children.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Kategoriler</h1>
        <button
          onClick={() => {
            setNewParentId(null);
            setShowNewForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Yeni Sınıf Ekle
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Üst kategoriler sınıfları (9, 10, 11, 12), alt kategoriler dersleri
        (Matematik, Fizik, İngilizce vb.) temsil eder.
      </p>
      {showNewForm && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={
              newParentId
                ? "Alt kategori adı (ör: Matematik)"
                : "Sınıf adı (ör: 9. Sınıf)"
            }
            className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-ring"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          {newParentId && (
            <span className="text-xs text-muted-foreground px-2">
              → {categories.find((c) => c.id === newParentId)?.name}
            </span>
          )}
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Ekle"
            )}
          </button>
          <button
            onClick={() => {
              setShowNewForm(false);
              setNewName("");
              setNewParentId(null);
            }}
            className="rounded p-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {categories.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Henüz kategori eklenmemiş
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {categories.map((cat) => renderCategory(cat))}
        </div>
      )}
    </div>
  );
}

