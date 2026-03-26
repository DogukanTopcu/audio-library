"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Headphones,
  BookOpen,
  HelpCircle,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface AudioLearning {
  totalAudio: number;
  completedAudio: number;
  completionPercent: number;
}

interface QuestionBank {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  successRate: number;
}

interface ChapterDetail {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  audioLearning: AudioLearning;
  questionBank: QuestionBank;
  subChapters: ChapterDetail[];
}

interface ContentInfo {
  id: string;
  title: string;
  type: string;
  description?: string;
  author?: string;
  publisher?: string;
}

interface KesfetDetailsData {
  content: ContentInfo;
  chapters: ChapterDetail[];
}

/* ------------------------------------------------------------------ */
/*  Progress Bar                                                        */
/* ------------------------------------------------------------------ */
function ProgressBar({
  percent,
  colorClass = "bg-primary",
  label,
}: {
  percent: number;
  colorClass?: string;
  label: string;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[14px] text-muted-foreground">{label}</span>
        <span className="text-[14px] font-medium text-foreground">%{percent}</span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: yuzde ${percent}`}
      >
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chapter Node (recursive)                                            */
/* ------------------------------------------------------------------ */
function ChapterNode({
  chapter,
  level = 0,
  contentType,
}: {
  chapter: ChapterDetail;
  level?: number;
  contentType: string;
}) {
  const [expanded, setExpanded] = useState(level === 0);
  const hasChildren = chapter.subChapters && chapter.subChapters.length > 0;
  const hasContent =
    chapter.audioLearning.totalAudio > 0 || chapter.questionBank.totalQuestions > 0;

  return (
    <div
      className="border-b border-border last:border-b-0"
      style={{ paddingLeft: `${level * 12}px` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${chapter.title} bolumunu ${expanded ? "kapat" : "ac"}`}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted transition-colors min-h-[48px]"
      >
        {hasChildren || hasContent ? (
          expanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          )
        ) : (
          <span className="w-5" aria-hidden="true" />
        )}

        <div className="flex-1 min-w-0">
          <span className="text-[18px] text-foreground font-medium block">{chapter.title}</span>
          <div className="flex items-center gap-4 mt-1">
            {chapter.audioLearning.totalAudio > 0 && (
              <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                <Headphones className="w-3.5 h-3.5" aria-hidden="true" />
                {chapter.audioLearning.completedAudio}/{chapter.audioLearning.totalAudio}
              </span>
            )}
            {chapter.questionBank.totalQuestions > 0 && (
              <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                {chapter.questionBank.correctAnswers}/{chapter.questionBank.totalQuestions}
              </span>
            )}
          </div>
        </div>

        {chapter.audioLearning.completionPercent === 100 && chapter.audioLearning.totalAudio > 0 && (
          <CheckCircle2 className="w-5 h-5 text-[#22c55e] flex-shrink-0" aria-label="Tamamlandi" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 ml-8">
          <div className="space-y-3 mb-4">
            {chapter.audioLearning.totalAudio > 0 && (
              <ProgressBar
                percent={chapter.audioLearning.completionPercent}
                colorClass="bg-[#3b82f6]"
                label={`Ders Dinle (${chapter.audioLearning.completedAudio}/${chapter.audioLearning.totalAudio})`}
              />
            )}
            {chapter.questionBank.totalQuestions > 0 && (
              <ProgressBar
                percent={chapter.questionBank.successRate}
                colorClass="bg-[#22c55e]"
                label={`Soru Coz (${chapter.questionBank.correctAnswers}/${chapter.questionBank.totalQuestions})`}
              />
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {chapter.audioLearning.totalAudio > 0 && (
              <Link
                href={`/dinle/chapter/${chapter.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#3b82f6] text-white font-semibold rounded-lg text-[15px] no-underline hover:bg-[#3b82f6]/90 transition-colors min-h-[44px]"
                aria-label={`${chapter.title} dersini dinle`}
              >
                <Headphones className="w-4 h-4" aria-hidden="true" />
                Ders Dinle
              </Link>
            )}
            {chapter.questionBank.totalQuestions > 0 && (
              <Link
                href={`/sorun-coz/${chapter.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#22c55e] text-white font-semibold rounded-lg text-[15px] no-underline hover:bg-[#22c55e]/90 transition-colors min-h-[44px]"
                aria-label={`${chapter.title} sorularini coz`}
              >
                <HelpCircle className="w-4 h-4" aria-hidden="true" />
                Soru Coz
              </Link>
            )}
            {!hasContent && (
              <span className="text-[14px] text-muted-foreground italic">
                Bu bolumde henuz icerik bulunmamaktadir.
              </span>
            )}
          </div>

          {hasChildren && (
            <div className="mt-3 border-t border-border">
              {chapter.subChapters.map((sub) => (
                <ChapterNode key={sub.id} chapter={sub} level={level + 1} contentType={contentType} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function ContentDetailPage() {
  const params = useParams();
  const contentId = params.contentId as string;

  const [data, setData] = useState<KesfetDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!contentId) return;
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const { data: res } = await api.get(`/kesfet/details/${contentId}`);
        setData(res.data || res);
      } catch {
        toast.error("Icerik yuklenirken bir hata olustu.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [contentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-label="Icerik yukleniyor">
        <Loader2 className="w-10 h-10 text-foreground animate-spin" aria-hidden="true" />
        <span className="ml-4 text-[18px] text-muted-foreground">Yukleniyor...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-center">
        <BookOpen className="mx-auto mb-4 h-16 w-16 text-muted-foreground" aria-hidden="true" />
        <p className="text-[20px] text-muted-foreground">Icerik bulunamadi.</p>
        <Link href="/kesfet" className="inline-flex items-center gap-2 mt-6 text-[18px] text-foreground hover:underline" aria-label="Kesfet sayfasina don">
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Kesfet sayfasina don
        </Link>
      </div>
    );
  }

  const { content, chapters } = data;
  const typeLabels: Record<string, string> = {
    TEXTBOOK: "Ders Kitabi",
    NOVEL: "Roman",
    PRACTICE_TEST: "Deneme",
    QUESTION_BANK: "Soru Bankasi",
  };

  const countDeep = (chs: ChapterDetail[], key: "audioLearning" | "questionBank", field: string): number =>
    chs.reduce((sum, ch) => {
      const val = (ch[key] as unknown as Record<string, number>)[field] || 0;
      return sum + val + countDeep(ch.subChapters || [], key, field);
    }, 0);

  const totalAudio = countDeep(chapters, "audioLearning", "totalAudio");
  const completedAudio = countDeep(chapters, "audioLearning", "completedAudio");
  const totalQuestions = countDeep(chapters, "questionBank", "totalQuestions");
  const correctQuestions = countDeep(chapters, "questionBank", "correctAnswers");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/kesfet" className="inline-flex items-center gap-2 text-[16px] text-muted-foreground hover:text-foreground transition-colors mb-6" aria-label="Kesfet sayfasina don">
        <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        Kesfet
      </Link>

      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold text-foreground">{content.title}</h1>
          {content.type && (
            <span className="flex-shrink-0 px-4 py-2 rounded-full text-[14px] font-medium bg-muted text-muted-foreground border border-border">
              {typeLabels[content.type] || content.type}
            </span>
          )}
        </div>
        <div className="space-y-2 text-[18px]">
          {content.author && (
            <p className="text-muted-foreground">
              Yazar:{" "}
              <span className="text-foreground">{content.author}</span>
            </p>
          )}
          {content.publisher && (
            <p className="text-muted-foreground">
              Yayinevi:{" "}
              <span className="text-foreground">{content.publisher}</span>
            </p>
          )}
        </div>
        {content.description && (
          <p className="mt-4 text-[18px] text-muted-foreground leading-relaxed">
            {content.description}
          </p>
        )}
      </header>

      {/* Overall Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <BookOpen className="w-6 h-6 text-muted-foreground mx-auto mb-1" aria-hidden="true" />
          <p className="text-[24px] font-bold text-foreground">{chapters.length}</p>
          <p className="text-[13px] text-muted-foreground">Bolum</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Headphones className="w-6 h-6 text-[#3b82f6] mx-auto mb-1" aria-hidden="true" />
          <p className="text-[24px] font-bold text-foreground">{completedAudio}/{totalAudio}</p>
          <p className="text-[13px] text-muted-foreground">Ses Kaydi</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <HelpCircle className="w-6 h-6 text-[#22c55e] mx-auto mb-1" aria-hidden="true" />
          <p className="text-[24px] font-bold text-foreground">{correctQuestions}/{totalQuestions}</p>
          <p className="text-[13px] text-muted-foreground">Soru</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <PlayCircle className="w-6 h-6 text-[#eab308] mx-auto mb-1" aria-hidden="true" />
          <p className="text-[24px] font-bold text-foreground">{totalAudio > 0 ? Math.round((completedAudio / totalAudio) * 100) : 0}%</p>
          <p className="text-[13px] text-muted-foreground">Genel Ilerleme</p>
        </div>
      </section>

      {/* Chapters */}
      <section aria-labelledby="chapters-heading">
        <h2 id="chapters-heading" className="text-2xl font-bold text-foreground mb-4">Bolumler</h2>
        {chapters.length > 0 ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {chapters.map((chapter) => (
              <ChapterNode key={chapter.id} chapter={chapter} contentType={content.type} />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-[18px] text-muted-foreground">Bu icerik icin henuz bolum eklenmemistir.</p>
          </div>
        )}
      </section>
    </div>
  );
}
