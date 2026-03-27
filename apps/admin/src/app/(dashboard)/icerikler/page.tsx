"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Eye,
  EyeOff,
  Library,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react";

interface Content {
  id: string;
  title: string;
  type: string;
  coverImageKey?: string;
  isActive: boolean;
  createdAt: string;
  categoryIds?: string[];
}

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: CategoryNode[];
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface GroupedLesson {
  id: string;
  name: string;
  items: Content[];
}

interface GroupedClass {
  id: string;
  name: string;
  items: Content[];
}

function collectDescendantIds(category: CategoryNode): string[] {
  return [category.id, ...category.children.flatMap((child) => collectDescendantIds(child))];
}

const typeLabels: Record<string, string> = {
  TEXTBOOK: "Ders Kitabı",
  NOVEL: "Roman",
  PRACTICE_TEST: "Deneme Sınavı",
  QUESTION_BANK: "Soru Bankası",
  OTHER: "Diğer",
};

const PAGE_LIMIT = 2;

function normalizeCategoryKey(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function isLessonsRoot(category: CategoryNode) {
  const slugKey = normalizeCategoryKey(category.slug);
  const nameKey = normalizeCategoryKey(category.name);
  return slugKey === "lessons" || nameKey === "lessons" || nameKey === "dersler";
}

function isClassRoot(category: CategoryNode) {
  const slugKey = normalizeCategoryKey(category.slug);
  const nameKey = normalizeCategoryKey(category.name);
  return slugKey === "class" || nameKey === "class" || nameKey === "sinif";
}

export default function ContentListPage() {
  const { admin } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Content[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Category filter state
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [classOpen, setClassOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);

  // Derived data
  const lessonsRoot = useMemo(() => categories.find(isLessonsRoot) ?? null, [categories]);
  const classRoot = useMemo(() => categories.find(isClassRoot) ?? null, [categories]);
  const classCategories = useMemo(() => classRoot?.children ?? [], [classRoot]);
  const lessonCategories = useMemo(() => lessonsRoot?.children ?? [], [lessonsRoot]);
  const lessonDescendantMap = useMemo(
    () => new Map(lessonCategories.map((lesson) => [lesson.id, new Set(collectDescendantIds(lesson))])),
    [lessonCategories],
  );
  const classDescendantMap = useMemo(
    () => new Map(classCategories.map((item) => [item.id, new Set(collectDescendantIds(item))])),
    [classCategories],
  );
  const knownCategoryIds = useMemo(
    () => new Set([...lessonDescendantMap.values(), ...classDescendantMap.values()].flatMap((set) => Array.from(set))),
    [classDescendantMap, lessonDescendantMap],
  );
  const selectedClass = classCategories.find((item) => item.id === selectedClassId);
  const selectedLesson = lessonCategories.find((item) => item.id === selectedLessonId);

  // Fetch categories on mount
  useEffect(() => {
    api.get("/admin/categories").then((res) => {
      const cats = res.data?.data ?? res.data ?? [];
      setCategories(Array.isArray(cats) ? cats : []);
    }).catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!(target as Element)?.closest?.("[data-dropdown-class]")) setClassOpen(false);
      if (!(target as Element)?.closest?.("[data-dropdown-lesson]")) setLessonOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Compute active categoryId for API
  const getActiveCategoryId = useCallback(() => {
    return [selectedClassId, selectedLessonId].filter(Boolean).join(",");
  }, [selectedClassId, selectedLessonId]);

  // Fetch content
  const fetchContent = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: pageNum,
        limit: PAGE_LIMIT,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const catId = getActiveCategoryId();
      if (catId) params.categoryId = catId;

      const res = await api.get("/admin/content", { params });
      const payload = res.data?.data ?? res.data;
      const data = payload?.data ?? (Array.isArray(payload) ? payload : []);
      const resMeta = payload?.meta ?? null;

      setItems(Array.isArray(data) ? data : []);
      setMeta(resMeta);
    } catch {
      toast.error("İçerikler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, getActiveCategoryId]);

  useEffect(() => {
    setPage(1);
    fetchContent(1);
  }, [fetchContent]);

  const goToPage = (p: number) => {
    setPage(p);
    fetchContent(p);
  };

  const handleToggleActive = async (item: Content) => {
    setTogglingId(item.id);
    try {
      await api.patch(`/admin/content/${item.id}`, { isActive: !item.isActive });
      toast.success(item.isActive ? "İçerik pasif yapıldı" : "İçerik aktif yapıldı");
      fetchContent(page);
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
      fetchContent(page);
    } catch {
      toast.error("Silme işlemi başarısız");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchContent(1);
  };

  const clearFilters = () => {
    setSelectedClassId("");
    setSelectedLessonId("");
  };

  const groupedItems = useMemo<GroupedLesson[]>(() => {
    const visibleLessons = selectedLessonId
      ? lessonCategories.filter((lesson) => lesson.id === selectedLessonId)
      : lessonCategories;

    return visibleLessons
      .map((lesson) => ({
        id: lesson.id,
        name: lesson.name,
        items: items.filter((item) => {
          const lessonCategoryIds = lessonDescendantMap.get(lesson.id);
          return item.categoryIds?.some((categoryId) => lessonCategoryIds?.has(categoryId)) ?? false;
        }),
      }))
      .filter((lesson) => lesson.items.length > 0);
  }, [items, lessonCategories, lessonDescendantMap, selectedLessonId]);

  const groupedClassOnlyItems = useMemo<GroupedClass[]>(() => {
    const visibleClasses = selectedClassId
      ? classCategories.filter((item) => item.id === selectedClassId)
      : classCategories;

    return visibleClasses
      .map((classCategory) => ({
        id: classCategory.id,
        name: classCategory.name,
        items: items.filter((item) => {
          const categoryIds = item.categoryIds ?? [];
          const classCategoryIds = classDescendantMap.get(classCategory.id);
          const hasLesson = Array.from(lessonDescendantMap.values()).some((lessonIds) =>
            categoryIds.some((categoryId) => lessonIds.has(categoryId)),
          );

          return categoryIds.some((categoryId) => classCategoryIds?.has(categoryId)) && !hasLesson;
        }),
      }))
      .filter((classCategory) => classCategory.items.length > 0);
  }, [classCategories, classDescendantMap, items, lessonDescendantMap, selectedClassId]);

  const uncategorizedItems = useMemo(
    () => items.filter((item) => {
      const categoryIds = item.categoryIds ?? [];
      const hasKnownCategory = categoryIds.some((categoryId) => knownCategoryIds.has(categoryId));
      return !hasKnownCategory;
    }),
    [items, knownCategoryIds]
  );

  const getClassLabel = useCallback((item: Content) => {
    const classCategory = classCategories.find((category) => {
      const classCategoryIds = classDescendantMap.get(category.id);
      return item.categoryIds?.some((categoryId) => classCategoryIds?.has(categoryId));
    });
    return classCategory?.name ?? null;
  }, [classCategories, classDescendantMap]);

  const renderContentRow = (item: Content) => (
    <div
      key={item.id}
      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      <div className="flex h-9 w-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
        <BookOpen className="h-3.5 w-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <Link
          href={`/icerikler/${item.id}`}
          className="text-sm font-medium text-foreground hover:underline truncate block"
        >
          {item.title}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          {getClassLabel(item) && (
            <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0 text-[11px] text-primary">
              {getClassLabel(item)}. sınıf
            </span>
          )}
          <span className="rounded-full border border-border bg-muted px-2 py-0 text-[11px] text-muted-foreground">
            {typeLabels[item.type] || item.type}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {new Date(item.createdAt).toLocaleDateString("tr-TR")}
          </span>
        </div>
      </div>

      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
          item.isActive
            ? "bg-emerald-100 text-emerald-700"
            : "bg-muted text-muted-foreground"
        )}
      >
        {item.isActive ? "Aktif" : "Pasif"}
      </span>

      <div className="flex items-center gap-1 shrink-0">
        <Link
          href={`/icerikler/${item.id}`}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Düzenle"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
        <button
          onClick={() => handleToggleActive(item)}
          disabled={togglingId === item.id}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          title={item.isActive ? "Pasif Yap" : "Aktif Yap"}
        >
          {togglingId === item.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : item.isActive ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
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
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Search */}
      <form onSubmit={handleSearch} className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Kategori adına göre ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Kategori adına göre içerik ara"
          className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-ring"
        />
      </form>

      {/* Category Filter Dropdowns */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative" data-dropdown-class>
            <button
              onClick={() => { setClassOpen((v) => !v); setLessonOpen(false); }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
                selectedClass
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-ring hover:text-foreground"
              )}
            >
              {selectedClass ? selectedClass.name : "Sınıf"}
              {selectedClass ? (
                <X className="w-3.5 h-3.5 ml-1" onClick={(e) => { e.stopPropagation(); setSelectedClassId(""); }} />
              ) : (
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", classOpen && "rotate-180")} />
              )}
            </button>
            {classOpen && (
              <div className="absolute top-full left-0 mt-1 z-20 min-w-[160px] max-h-[300px] overflow-y-auto bg-card border border-border rounded-lg shadow-lg py-1">
                {classCategories.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedClassId(item.id); setClassOpen(false); }}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm transition-colors",
                      selectedClassId === item.id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" data-dropdown-lesson>
            <button
              onClick={() => { setLessonOpen((v) => !v); setClassOpen(false); }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
                selectedLesson
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-ring hover:text-foreground"
              )}
            >
              {selectedLesson ? selectedLesson.name : "Ders"}
              {selectedLesson ? (
                <X className="w-3.5 h-3.5 ml-1" onClick={(e) => { e.stopPropagation(); setSelectedLessonId(""); }} />
              ) : (
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", lessonOpen && "rotate-180")} />
              )}
            </button>
            {lessonOpen && lessonCategories.length > 0 && (
              <div className="absolute top-full left-0 mt-1 z-20 min-w-[160px] max-h-[300px] overflow-y-auto bg-card border border-border rounded-lg shadow-lg py-1">
                {lessonCategories.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedLessonId(item.id); setLessonOpen(false); }}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm transition-colors",
                      selectedLessonId === item.id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(selectedClass || selectedLesson) && (
            <button
              onClick={clearFilters}
              className="px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Filtreyi Temizle
            </button>
          )}
        </div>
      )}

      {/* Categories with books */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <Library className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchTerm || selectedClass || selectedLesson
              ? "Aramayla eşleşen içerik bulunamadı"
              : "Henüz içerik eklenmemiş"}
          </p>
        </div>
      ) : groupedItems.length === 0 && groupedClassOnlyItems.length === 0 && uncategorizedItems.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <Library className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Bu filtrede kategori altında içerik bulunamadı</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {groupedItems.map((lesson, lessonIndex) => (
            <div key={lesson.id} className={cn(lessonIndex > 0 && "border-t border-border") }>
              <div className="px-4 py-3 bg-muted/40 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">{lesson.name}</h2>
              </div>
              <div className="divide-y divide-border/70">
                {lesson.items.map(renderContentRow)}
              </div>
            </div>
          ))}

          {groupedClassOnlyItems.map((classGroup, classGroupIndex) => (
            <div
              key={classGroup.id}
              className={cn((groupedItems.length > 0 || classGroupIndex > 0) && "border-t border-border")}
            >
              <div className="px-4 py-3 bg-muted/40 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">{classGroup.name}. sınıf</h2>
                <p className="mt-1 text-xs text-muted-foreground">Bu kitaplarda ders kategorisi atanmamış.</p>
              </div>
              <div className="divide-y divide-border/70">
                {classGroup.items.map(renderContentRow)}
              </div>
            </div>
          ))}

          {uncategorizedItems.length > 0 && !selectedClassId && !selectedLessonId && (
            <div className={cn((groupedItems.length > 0 || groupedClassOnlyItems.length > 0) && "border-t border-border")}>
              <div className="px-4 py-3 bg-muted/40 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Kategorisiz</h2>
              </div>
              <div className="divide-y divide-border/70">
                {uncategorizedItems.map(renderContentRow)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Toplam {meta.total} içerik · Sayfa {meta.page} / {meta.totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Önceki
            </button>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= meta.totalPages}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              Sonraki
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
