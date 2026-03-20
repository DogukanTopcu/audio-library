"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Headphones,
  BookOpen,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface AudioRecord {
  id: string;
  title: string;
  duration?: number;
}

interface SubChapter {
  id: string;
  title: string;
  order: number;
  audioRecords?: AudioRecord[];
  children?: SubChapter[];
}

interface Chapter {
  id: string;
  title: string;
  order: number;
  audioRecords?: AudioRecord[];
  children?: SubChapter[];
}

interface ContentDetail {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  type: string;
  description: string;
  chapters?: Chapter[];
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function ChapterNode({
  chapter,
  level = 0,
}: {
  chapter: Chapter | SubChapter;
  level?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren =
    (chapter.children && chapter.children.length > 0) ||
    (chapter.audioRecords && chapter.audioRecords.length > 0);

  return (
    <div
      className="border-b border-[#222222] last:border-b-0"
      style={{ paddingLeft: `${level * 16}px` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${chapter.title} bolumunu ${expanded ? "kapat" : "ac"}`}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[#111111] transition-colors min-h-[48px]"
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown
              className="w-5 h-5 text-[#a1a1aa] flex-shrink-0"
              aria-hidden="true"
            />
          ) : (
            <ChevronRight
              className="w-5 h-5 text-[#a1a1aa] flex-shrink-0"
              aria-hidden="true"
            />
          )
        ) : (
          <span className="w-5" aria-hidden="true" />
        )}
        <span className="text-[18px] text-white font-medium">
          {chapter.title}
        </span>
      </button>

      {expanded && (
        <div>
          {/* Audio records */}
          {chapter.audioRecords &&
            chapter.audioRecords.map((audio) => (
              <div
                key={audio.id}
                className="flex items-center justify-between gap-4 px-4 py-3 ml-8 hover:bg-[#111111] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Headphones
                    className="w-5 h-5 text-[#a1a1aa] flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-[16px] text-[#a1a1aa] truncate">
                    {audio.title}
                  </span>
                  {audio.duration && (
                    <span className="text-[14px] text-[#52525b] flex-shrink-0">
                      {formatDuration(audio.duration)}
                    </span>
                  )}
                </div>
                <Link
                  href={`/dinle/${audio.id}`}
                  aria-label={`${audio.title} sesini dinle`}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg text-[16px] no-underline hover:bg-[#e4e4e7] transition-colors min-h-[48px] flex-shrink-0"
                >
                  <Headphones className="w-4 h-4" aria-hidden="true" />
                  Dinle
                </Link>
              </div>
            ))}

          {/* Sub-chapters */}
          {chapter.children &&
            chapter.children.map((child) => (
              <ChapterNode key={child.id} chapter={child} level={level + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

export default function ContentDetailPage() {
  const params = useParams();
  const contentId = params.contentId as string;

  const [content, setContent] = useState<ContentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!contentId) return;

    const fetchContent = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/content/${contentId}`);
        setContent(data.data || data);
      } catch {
        toast.error("Icerik yuklenirken bir hata olustu.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [contentId]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        role="status"
        aria-label="Icerik yukleniyor"
      >
        <Loader2
          className="w-10 h-10 text-white animate-spin"
          aria-hidden="true"
        />
        <span className="ml-4 text-[18px] text-[#a1a1aa]">Yukleniyor...</span>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-center">
        <BookOpen
          className="w-16 h-16 text-[#333333] mx-auto mb-4"
          aria-hidden="true"
        />
        <p className="text-[20px] text-[#a1a1aa]">Icerik bulunamadi.</p>
        <Link
          href="/kesfet"
          className="inline-flex items-center gap-2 mt-6 text-[18px] text-white hover:underline"
          aria-label="Kesfet sayfasina don"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Kesfet sayfasina don
        </Link>
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    DERS_KITABI: "Ders Kitabi",
    ROMAN: "Roman",
    DENEME: "Deneme",
    SORU_BANKASI: "Soru Bankasi",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back link */}
      <Link
        href="/kesfet"
        className="inline-flex items-center gap-2 text-[16px] text-[#a1a1aa] hover:text-white transition-colors mb-6"
        aria-label="Kesfet sayfasina don"
      >
        <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        Kesfet
      </Link>

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold text-white">{content.title}</h1>
          {content.type && (
            <span className="flex-shrink-0 px-4 py-2 rounded-full text-[14px] font-medium bg-[#111111] text-[#a1a1aa] border border-[#222222]">
              {typeLabels[content.type] || content.type}
            </span>
          )}
        </div>

        <div className="space-y-2 text-[18px]">
          <p className="text-[#a1a1aa]">
            <span className="text-[#52525b]">Yazar:</span>{" "}
            <span className="text-white">{content.author}</span>
          </p>
          {content.publisher && (
            <p className="text-[#a1a1aa]">
              <span className="text-[#52525b]">Yayinevi:</span>{" "}
              <span className="text-white">{content.publisher}</span>
            </p>
          )}
        </div>

        {content.description && (
          <p className="mt-4 text-[18px] text-[#a1a1aa] leading-relaxed">
            {content.description}
          </p>
        )}
      </header>

      {/* Chapters */}
      <section aria-labelledby="chapters-heading">
        <h2
          id="chapters-heading"
          className="text-2xl font-bold text-white mb-4"
        >
          Bolumler
        </h2>

        {content.chapters && content.chapters.length > 0 ? (
          <div className="bg-[#0a0a0a] border border-[#222222] rounded-xl overflow-hidden">
            {content.chapters.map((chapter) => (
              <ChapterNode key={chapter.id} chapter={chapter} />
            ))}
          </div>
        ) : (
          <div className="bg-[#0a0a0a] border border-[#222222] rounded-xl p-8 text-center">
            <p className="text-[18px] text-[#a1a1aa]">
              Bu icerik icin henuz bolum eklenmemistir.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
