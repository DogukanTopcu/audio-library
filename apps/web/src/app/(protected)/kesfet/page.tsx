"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { Search, BookOpen, Loader2, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";

interface ContentItem {
  id: string;
  title: string;
  author: string;
  type: string;
  description: string;
}

interface ContentMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  page: number;
  limit: number;
  total: number;
}

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: CategoryNode[];
}

const contentTypes = [
  { key: "", label: "TUMU" },
  { key: "TEXTBOOK", label: "DERS KITABI" },
  { key: "NOVEL", label: "ROMAN" },
  { key: "PRACTICE_TEST", label: "DENEME" },
  { key: "QUESTION_BANK", label: "SORU BANKASI" },
];

const typeLabels: Record<string, string> = {
  TEXTBOOK: "Ders Kitabi",
  NOVEL: "Roman",
  PRACTICE_TEST: "Deneme",
  QUESTION_BANK: "Soru Bankasi",
};

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

export default function DiscoveryPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [meta, setMeta] = useState<ContentMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [classOpen, setClassOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  const classRef = useRef<HTMLDivElement | null>(null);
  const lessonRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    api
      .get("/categories")
      .then((res) => {
        const cats = res.data?.data ?? res.data ?? [];
        setCategories(Array.isArray(cats) ? cats : []);
      })
      .catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (classRef.current && !classRef.current.contains(e.target as Node)) {
        setClassOpen(false);
      }
      if (lessonRef.current && !lessonRef.current.contains(e.target as Node)) {
        setLessonOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const lessonsRoot = useMemo(() => categories.find(isLessonsRoot) ?? null, [categories]);
  const classRoot = useMemo(() => categories.find(isClassRoot) ?? null, [categories]);
  const classCategories = classRoot?.children ?? [];
  const lessonCategories = lessonsRoot?.children ?? [];
  const selectedClass = classCategories.find((item) => item.id === selectedClassId);
  const selectedLesson = lessonCategories.find((item) => item.id === selectedLessonId);

  // Compute categoryId for the API
  const getActiveCategoryId = useCallback(() => {
    return [selectedClassId, selectedLessonId].filter(Boolean).join(",");
  }, [selectedClassId, selectedLessonId]);

  const fetchContent = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      try {
        const params: Record<string, string | number> = {
          page: pageNum,
          limit: 12,
        };
        if (search.trim()) params.search = search.trim();
        if (activeType) params.type = activeType;
        const catId = getActiveCategoryId();
        if (catId) params.categoryId = catId;

        const { data } = await api.get("/content", { params });
        const responseData = data.data || data;
        const newItems: ContentItem[] = responseData.data || [];
        const resMeta = responseData.meta || null;

        if (append) {
          setItems((prev) => [...prev, ...newItems]);
        } else {
          setItems(newItems);
        }
        setMeta(resMeta);

        const totalPages =
          resMeta?.totalPages ?? resMeta?.total
            ? Math.ceil((resMeta?.total ?? 0) / (resMeta?.limit ?? 12))
            : 1;
        setHasMore(pageNum < totalPages);
      } catch {
        toast.error("Icerikler yuklenirken bir hata olustu.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [search, activeType, getActiveCategoryId]
  );

  // Reset and fetch first page when filters change
  useEffect(() => {
    setPage(1);
    setItems([]);
    setHasMore(true);
    fetchContent(1, false);
  }, [fetchContent]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          setPage((prev) => {
            const nextPage = prev + 1;
            fetchContent(nextPage, true);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoading, isLoadingMore, fetchContent]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setItems([]);
    setHasMore(true);
    fetchContent(1, false);
  };

  const handleTypeChange = (type: string) => {
    setActiveType(type);
  };

  const clearCategoryFilters = () => {
    setSelectedClassId("");
    setSelectedLessonId("");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">Kesfet</h1>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kategori adına göre ara..."
            aria-label="Kategori adına göre içerik ara"
            className="w-full h-[52px] pl-14 pr-4 text-[18px] bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl focus-visible:border-ring focus-visible:ring-ring/30"
          />
        </div>
      </form>

      {/* Category Dropdown Filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div ref={classRef} className="relative">
            <button
              onClick={() => { setClassOpen((v) => !v); setLessonOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[15px] font-medium transition-colors border ${
                selectedClass
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-ring hover:text-foreground"
              }`}
            >
              {selectedClass ? selectedClass.name : "Sınıf"}
              {selectedClass ? (
                <X
                  className="w-4 h-4 ml-1"
                  onClick={(e) => { e.stopPropagation(); setSelectedClassId(""); }}
                />
              ) : (
                <ChevronDown className={`w-4 h-4 transition-transform ${classOpen ? "rotate-180" : ""}`} />
              )}
            </button>
            {classOpen && (
              <div className="absolute top-full left-0 mt-1 z-20 min-w-[200px] max-h-[300px] overflow-y-auto bg-card border border-border rounded-lg shadow-lg py-1">
                {classCategories.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedClassId(item.id); setClassOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-[15px] transition-colors ${
                      selectedClassId === item.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={lessonRef} className="relative">
            <button
              onClick={() => { setLessonOpen((v) => !v); setClassOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[15px] font-medium transition-colors border ${
                selectedLesson
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-ring hover:text-foreground"
              }`}
            >
              {selectedLesson ? selectedLesson.name : "Ders"}
              {selectedLesson ? (
                <X
                  className="w-4 h-4 ml-1"
                  onClick={(e) => { e.stopPropagation(); setSelectedLessonId(""); }}
                />
              ) : (
                <ChevronDown className={`w-4 h-4 transition-transform ${lessonOpen ? "rotate-180" : ""}`} />
              )}
            </button>
            {lessonOpen && (
              <div className="absolute top-full left-0 mt-1 z-20 min-w-[200px] max-h-[300px] overflow-y-auto bg-card border border-border rounded-lg shadow-lg py-1">
                {lessonCategories.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedLessonId(item.id); setLessonOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-[15px] transition-colors ${
                      selectedLessonId === item.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active filter indicator */}
          {(selectedClass || selectedLesson) && (
            <button
              onClick={clearCategoryFilters}
              className="px-3 py-2 rounded-lg text-[14px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Filtreyi Temizle
            </button>
          )}
        </div>
      )}

      {/* Type Filter Tabs */}
      <div
        className="flex flex-wrap gap-2 mb-8"
        role="tablist"
        aria-label="Icerik turu filtresi"
      >
        {contentTypes.map((ct) => (
          <button
            key={ct.key}
            role="tab"
            aria-selected={activeType === ct.key}
            aria-label={`Filtre: ${ct.label}`}
            onClick={() => handleTypeChange(ct.key)}
            className={`px-5 py-3 rounded-lg text-[16px] font-medium transition-colors min-h-[48px] ${
              activeType === ct.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-border hover:border-ring hover:text-foreground"
            }`}
          >
            {ct.label}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div
          className="flex items-center justify-center py-20"
          role="status"
          aria-label="Icerikler yukleniyor"
        >
          <Loader2
            className="w-10 h-10 text-foreground animate-spin"
            aria-hidden="true"
          />
          <span className="ml-4 text-[18px] text-muted-foreground">
            Yukleniyor...
          </span>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen
            className="mx-auto mb-4 h-16 w-16 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-[20px] text-muted-foreground">
            Aramanizla eslesen icerik bulunamadi.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/kesfet/${item.id}`}
                className="block bg-card border border-border rounded-xl p-6 hover:border-ring transition-colors no-underline group"
                aria-label={`${item.title} - ${item.author}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-xl font-semibold text-foreground group-hover:text-foreground/90">
                    {item.title}
                  </h2>
                  {item.type && (
                    <span className="flex-shrink-0 px-3 py-1 rounded-full text-[14px] font-medium bg-muted text-muted-foreground border border-border min-h-0">
                      {typeLabels[item.type] || item.type}
                    </span>
                  )}
                </div>
                <p className="text-[16px] text-muted-foreground mb-3">{item.author}</p>
                {item.description && (
                  <p className="text-[16px] text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                )}
              </Link>
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />

          {isLoadingMore && (
            <div
              className="flex items-center justify-center py-8"
              role="status"
              aria-label="Daha fazla icerik yukleniyor"
            >
              <Loader2
                className="w-8 h-8 text-foreground animate-spin"
                aria-hidden="true"
              />
              <span className="ml-3 text-[16px] text-muted-foreground">
                Daha fazla yukleniyor...
              </span>
            </div>
          )}

          {!hasMore && items.length > 0 && (
            <p className="text-center text-[16px] text-muted-foreground py-8">
              Tüm içerikler yüklendi.
            </p>
          )}
        </>
      )}
    </div>
  );
}
