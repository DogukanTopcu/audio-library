"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Headphones,
  Clock,
  CheckCircle2,
  PlayCircle,
  Loader2,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface ProgressItem {
  id: string;
  audioRecordId: string;
  audioTitle: string;
  contentTitle?: string;
  chapterTitle?: string;
  currentTime: number;
  duration: number;
  completed: boolean;
  updatedAt: string;
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProgressPage() {
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "in_progress" | "completed">(
    "all"
  );

  useEffect(() => {
    const fetchProgress = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get("/player/progress");
        const result = data.data || data;
        setItems(Array.isArray(result) ? result : result.data || []);
      } catch {
        toast.error("Ilerleme bilgileri yuklenirken bir hata olustu.");
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, []);

  const filteredItems = items.filter((item) => {
    if (filter === "completed") return item.completed;
    if (filter === "in_progress") return !item.completed;
    return true;
  });

  const completedCount = items.filter((i) => i.completed).length;
  const inProgressCount = items.filter((i) => !i.completed).length;

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        role="status"
        aria-label="Ilerleme bilgileri yukleniyor"
      >
        <Loader2
          className="w-10 h-10 text-white animate-spin"
          aria-hidden="true"
        />
        <span className="ml-4 text-[18px] text-[#a1a1aa]">Yukleniyor...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Ilerleme</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-xl p-6 text-center">
          <Headphones
            className="w-8 h-8 text-[#a1a1aa] mx-auto mb-2"
            aria-hidden="true"
          />
          <p className="text-[28px] font-bold text-white">{items.length}</p>
          <p className="text-[16px] text-[#a1a1aa]">Toplam Kayit</p>
        </div>
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-xl p-6 text-center">
          <PlayCircle
            className="w-8 h-8 text-[#eab308] mx-auto mb-2"
            aria-hidden="true"
          />
          <p className="text-[28px] font-bold text-white">{inProgressCount}</p>
          <p className="text-[16px] text-[#a1a1aa]">Devam Eden</p>
        </div>
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-xl p-6 text-center">
          <CheckCircle2
            className="w-8 h-8 text-[#22c55e] mx-auto mb-2"
            aria-hidden="true"
          />
          <p className="text-[28px] font-bold text-white">{completedCount}</p>
          <p className="text-[16px] text-[#a1a1aa]">Tamamlanan</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        className="flex gap-2 mb-6"
        role="tablist"
        aria-label="Ilerleme filtresi"
      >
        {[
          { key: "all" as const, label: "Tumu" },
          { key: "in_progress" as const, label: "Devam Eden" },
          { key: "completed" as const, label: "Tamamlanan" },
        ].map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={filter === tab.key}
            aria-label={`Filtre: ${tab.label}`}
            onClick={() => setFilter(tab.key)}
            className={`px-5 py-3 rounded-lg text-[16px] font-medium transition-colors min-h-[48px] ${
              filter === tab.key
                ? "bg-white text-black"
                : "bg-[#0a0a0a] text-[#a1a1aa] border border-[#222222] hover:border-[#333333] hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Progress list */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3
            className="w-16 h-16 text-[#333333] mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="text-[20px] text-[#a1a1aa]">
            {items.length === 0
              ? "Henuz dinleme gecmisiniz bulunmamaktadir. Kesfet sayfasindan dinlemeye baslayabilirsiniz."
              : "Bu filtreyle eslesen kayit bulunamadi."}
          </p>
          {items.length === 0 && (
            <Link
              href="/kesfet"
              className="inline-flex items-center justify-center mt-6 px-8 py-4 bg-white text-black font-semibold rounded-lg text-[18px] no-underline hover:bg-[#e4e4e7] transition-colors min-h-[48px]"
              aria-label="Kesfet sayfasina git"
            >
              Kesfet
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const progressPercent =
              item.duration > 0
                ? Math.min(100, (item.currentTime / item.duration) * 100)
                : 0;

            return (
              <Link
                key={item.id}
                href={`/dinle/${item.audioRecordId}`}
                className="block bg-[#0a0a0a] border border-[#222222] rounded-xl p-5 hover:border-[#333333] transition-colors no-underline"
                aria-label={`${item.audioTitle} - ${item.completed ? "Tamamlandi" : `Yuzde ${Math.round(progressPercent)} tamamlandi`}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[18px] font-semibold text-white truncate">
                      {item.audioTitle}
                    </h3>
                    {item.contentTitle && (
                      <p className="text-[14px] text-[#52525b] truncate mt-1">
                        {item.contentTitle}
                        {item.chapterTitle && ` - ${item.chapterTitle}`}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {item.completed ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[14px] font-medium bg-[#22c55e]/10 text-[#22c55e] min-h-0">
                        <CheckCircle2
                          className="w-4 h-4"
                          aria-hidden="true"
                        />
                        Tamamlandi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[14px] font-medium bg-[#eab308]/10 text-[#eab308] min-h-0">
                        <Clock className="w-4 h-4" aria-hidden="true" />
                        Devam Ediyor
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="w-full h-2 bg-[#222222] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: item.completed
                          ? "#22c55e"
                          : "#ffffff",
                      }}
                      role="progressbar"
                      aria-valuenow={Math.round(progressPercent)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Ilerleme: yuzde ${Math.round(progressPercent)}`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[14px] text-[#52525b]">
                  <span>
                    {formatTime(item.currentTime)} /{" "}
                    {formatTime(item.duration)}
                  </span>
                  <span>{formatDate(item.updatedAt)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
