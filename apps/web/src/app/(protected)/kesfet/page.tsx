"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, BookOpen, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
}

const contentTypes = [
  { key: "", label: "TUMU" },
  { key: "DERS_KITABI", label: "DERS KITABI" },
  { key: "ROMAN", label: "ROMAN" },
  { key: "DENEME", label: "DENEME" },
  { key: "SORU_BANKASI", label: "SORU BANKASI" },
];

const typeLabels: Record<string, string> = {
  DERS_KITABI: "Ders Kitabi",
  ROMAN: "Roman",
  DENEME: "Deneme",
  SORU_BANKASI: "Soru Bankasi",
};

export default function DiscoveryPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [meta, setMeta] = useState<ContentMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("");
  const [page, setPage] = useState(1);

  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page };
      if (search.trim()) params.search = search.trim();
      if (activeType) params.type = activeType;

      const { data } = await api.get("/content", { params });
      const responseData = data.data || data;
      setItems(responseData.data || []);
      setMeta(responseData.meta || null);
    } catch {
      toast.error("Icerikler yuklenirken bir hata olustu.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, activeType]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchContent();
  };

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Kesfet</h1>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-[#52525b]"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kitap, yazar veya konu ara..."
            aria-label="Icerik ara"
            className="w-full h-[52px] pl-14 pr-4 text-[18px] bg-[#0a0a0a] border-[#222222] text-white placeholder:text-[#52525b] rounded-xl focus-visible:border-white focus-visible:ring-white/30"
          />
        </div>
      </form>

      {/* Filter Tabs */}
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
                ? "bg-white text-black"
                : "bg-[#0a0a0a] text-[#a1a1aa] border border-[#222222] hover:border-[#333333] hover:text-white"
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
            className="w-10 h-10 text-white animate-spin"
            aria-hidden="true"
          />
          <span className="ml-4 text-[18px] text-[#a1a1aa]">
            Yukleniyor...
          </span>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen
            className="w-16 h-16 text-[#333333] mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="text-[20px] text-[#a1a1aa]">
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
                className="block bg-[#0a0a0a] border border-[#222222] rounded-xl p-6 hover:border-[#333333] transition-colors no-underline group"
                aria-label={`${item.title} - ${item.author}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-xl font-semibold text-white group-hover:text-white/90">
                    {item.title}
                  </h2>
                  {item.type && (
                    <span className="flex-shrink-0 px-3 py-1 rounded-full text-[14px] font-medium bg-[#111111] text-[#a1a1aa] border border-[#222222] min-h-0">
                      {typeLabels[item.type] || item.type}
                    </span>
                  )}
                </div>
                <p className="text-[16px] text-[#a1a1aa] mb-3">{item.author}</p>
                {item.description && (
                  <p className="text-[16px] text-[#52525b] line-clamp-2">
                    {item.description}
                  </p>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <nav
              aria-label="Sayfalama"
              className="flex items-center justify-center gap-4"
            >
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Onceki sayfa"
                className="flex items-center gap-2 h-[48px] px-5 text-[16px] bg-[#0a0a0a] border border-[#222222] text-white hover:bg-[#111111] rounded-lg disabled:opacity-40"
              >
                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                Onceki
              </Button>

              <span className="text-[18px] text-[#a1a1aa]" aria-live="polite">
                Sayfa {meta.currentPage} / {meta.totalPages}
              </span>

              <Button
                onClick={() =>
                  setPage((p) => Math.min(meta.totalPages, p + 1))
                }
                disabled={page >= meta.totalPages}
                aria-label="Sonraki sayfa"
                className="flex items-center gap-2 h-[48px] px-5 text-[16px] bg-[#0a0a0a] border border-[#222222] text-white hover:bg-[#111111] rounded-lg disabled:opacity-40"
              >
                Sonraki
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
