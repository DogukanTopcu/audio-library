"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Check,
  X,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  children?: Category[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // New category
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/admin/categories");
      const data = res.data.data || res.data;
      setCategories(Array.isArray(data) ? data : data.items || []);
    } catch {
      toast.error("Kategoriler yüklenemedi");
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
      await api.post("/admin/categories", {
        name: newName,
        parentId: newParentId,
      });
      toast.success("Kategori oluşturuldu");
      setNewName("");
      setNewParentId(null);
      setShowNew(false);
      fetchCategories();
    } catch {
      toast.error("Kategori oluşturulamadı");
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSavingEdit(true);
    try {
      await api.patch(`/admin/categories/${editingId}`, { name: editName });
      toast.success("Kategori güncellendi");
      setEditingId(null);
      setEditName("");
      fetchCategories();
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kategoriyi silmek istediğinizden emin misiniz?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success("Kategori silindi");
      fetchCategories();
    } catch {
      toast.error("Silme başarısız");
    } finally {
      setDeletingId(null);
    }
  };

  const buildTree = (items: Category[], parentId: string | null = null): Category[] => {
    return items
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ ...c, children: buildTree(items, c.id) }));
  };

  const renderTree = (cats: Category[], depth = 0) => {
    return cats.map((cat) => {
      const isExpanded = expanded.has(cat.id);
      const hasChildren = cat.children && cat.children.length > 0;
      const isEditing = editingId === cat.id;

      return (
        <div key={cat.id} style={{ marginLeft: depth * 20 }}>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-[#111] transition-colors group">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(cat.id)}
                className="text-zinc-500 hover:text-white"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-4" />
            )}

            <FolderTree className="h-4 w-4 text-zinc-500 flex-shrink-0" />

            {isEditing ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded border border-[#333] bg-[#0a0a0a] px-2 py-1 text-sm text-white outline-none focus:border-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="rounded p-1 text-green-400 hover:bg-green-900/20"
                >
                  {savingEdit ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded p-1 text-zinc-500 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm text-white">{cat.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => {
                      setNewParentId(cat.id);
                      setShowNew(true);
                    }}
                    className="rounded p-1 text-zinc-500 hover:text-white"
                    title="Alt kategori ekle"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleStartEdit(cat)}
                    className="rounded p-1 text-zinc-500 hover:text-white"
                    title="Düzenle"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    disabled={deletingId === cat.id}
                    className="rounded p-1 text-zinc-500 hover:text-red-400 disabled:opacity-50"
                    title="Sil"
                  >
                    {deletingId === cat.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {isExpanded && hasChildren && (
            <div className="border-l border-[#222] ml-2">
              {renderTree(cat.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const tree = buildTree(categories);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Kategoriler</h1>
        <button
          onClick={() => {
            setNewParentId(null);
            setShowNew(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" />
          Yeni Kategori
        </button>
      </div>

      <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
        {/* New category inline form */}
        {showNew && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#222] bg-[#111] p-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Kategori adı"
              className="flex-1 rounded border border-[#333] bg-[#0a0a0a] px-3 py-1.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-white"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            {newParentId && (
              <span className="text-xs text-zinc-500">Alt kategori</span>
            )}
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ekle"}
            </button>
            <button
              onClick={() => {
                setShowNew(false);
                setNewName("");
                setNewParentId(null);
              }}
              className="rounded p-1 text-zinc-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {tree.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">
            Henüz kategori eklenmemiş
          </p>
        ) : (
          <div className="space-y-0.5">{renderTree(tree)}</div>
        )}
      </div>
    </div>
  );
}
