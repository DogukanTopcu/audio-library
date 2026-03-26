"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Headphones,
  Clock,
  CheckCircle2,
  PlayCircle,
  Loader2,
  BarChart3,
  HelpCircle,
  XCircle,
  RefreshCw,
  Play,
  Pause,
  Volume2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface ProgressItem {
  id: string;
  audioRecord: {
    id: string;
    title: string;
    type: string;
    durationSeconds: number;
    chapterId: string;
  } | null;
  chapter: { id: string; title: string; contentId: string } | null;
  positionSeconds: number;
  isCompleted: boolean;
  progressPercent: number;
  updatedAt: string;
}

interface IncorrectQuestion {
  id: string;
  audioRecordId: string;
  explanationAudioRecordId?: string | null;
  chapterId: string;
  correctChoiceIndex: number;
  orderIndex: number;
  difficultyLevel?: string;
  choices: {
    id: string;
    choiceIndex: number;
    audioRecordId: string;
    choiceText?: string;
  }[];
  chapter?: { id: string; title: string; contentId: string } | null;
  userAnswer: {
    selectedChoiceIndex: number;
    attemptCount: number;
    answeredAt: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Inline Audio Player                                                 */
/* ------------------------------------------------------------------ */
function InlineAudioPlayer({
  audioRecordId,
  label,
}: {
  audioRecordId: string;
  label: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const load = useCallback(async () => {
    if (url) return;
    setIsLoading(true);
    try {
      const { data } = await api.get(
        `/player/token?audioRecordId=${audioRecordId}`
      );
      const result = data.data || data;
      setUrl(result.url);
    } catch {
      toast.error("Ses yuklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [audioRecordId, url]);

  const togglePlay = async () => {
    if (!url) {
      await load();
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      }, 200);
      return;
    }
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <div className="inline-flex items-center">
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
        />
      )}
      <button
        onClick={togglePlay}
        disabled={isLoading}
        aria-label={isPlaying ? `${label} duraklat` : `${label} oynat`}
        className="w-[32px] h-[32px] rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-colors"
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
        ) : isPlaying ? (
          <Pause className="w-3 h-3" aria-hidden="true" />
        ) : (
          <Play className="w-3 h-3 ml-0.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Retry Question Card                                                 */
/* ------------------------------------------------------------------ */
function RetryQuestionCard({
  question,
  index,
  onRetrySuccess,
}: {
  question: IncorrectQuestion;
  index: number;
  onRetrySuccess: (questionId: string) => void;
}) {
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleSubmit = async () => {
    if (selectedChoice === null) return;
    setIsSubmitting(true);
    try {
      const { data } = await api.post(`/questions/${question.id}/answer`, {
        questionId: question.id,
        selectedChoiceIndex: selectedChoice,
        timeSpentSeconds: 0,
      });
      const res = data.data || data;
      setResult(res.isCorrect);
      if (res.isCorrect) {
        toast.success("Dogru cevap!");
        onRetrySuccess(question.id);
      } else {
        setShowExplanation(true);
      }
    } catch {
      toast.error("Cevap gonderilirken hata olustu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted transition-colors min-h-[48px]"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown
            className="w-5 h-5 text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className="w-5 h-5 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <span className="text-[16px] font-medium text-foreground flex-1">
          Soru {index + 1}
          {question.chapter && (
            <span className="text-[14px] text-muted-foreground ml-2">
              ({question.chapter.title})
            </span>
          )}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {question.userAnswer.attemptCount} deneme
        </span>
        {result === true && (
          <CheckCircle2
            className="w-5 h-5 text-[#22c55e]"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-4">
          {/* Question audio */}
          <div className="mb-4">
            <p className="text-[14px] text-muted-foreground mb-2 flex items-center gap-2">
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              Soruyu dinleyin
            </p>
            <InlineAudioPlayer
              audioRecordId={question.audioRecordId}
              label="Soru"
            />
          </div>

          {/* Choices */}
          <div className="space-y-2 mb-4">
            {question.choices
              .sort((a, b) => a.choiceIndex - b.choiceIndex)
              .map((choice) => {
                const letter = String.fromCharCode(65 + choice.choiceIndex);
                const isSelected = selectedChoice === choice.choiceIndex;
                const isAnswered = result !== null;
                const isCorrectChoice = choice.choiceIndex === question.correctChoiceIndex;

                let borderColor = "border-border";
                if (isAnswered && isCorrectChoice) borderColor = "border-[#22c55e]";
                else if (isAnswered && isSelected && !isCorrectChoice)
                  borderColor = "border-[#ef4444]";
                else if (isSelected) borderColor = "border-primary";

                return (
                  <button
                    key={choice.id}
                    onClick={() => !isAnswered && setSelectedChoice(choice.choiceIndex)}
                    disabled={isAnswered}
                    className={`w-full flex items-center gap-3 px-3 py-3 border rounded-lg transition-colors text-left min-h-[44px] ${borderColor} ${
                      isAnswered
                        ? "cursor-default"
                        : "cursor-pointer hover:bg-muted"
                    }`}
                  >
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold bg-muted text-muted-foreground flex-shrink-0">
                      {letter}
                    </span>
                    <div className="flex-1 min-w-0">
                      {choice.choiceText && (
                        <p className="text-[14px] text-foreground">
                          {choice.choiceText}
                        </p>
                      )}
                      <InlineAudioPlayer
                        audioRecordId={choice.audioRecordId}
                        label={`Secenek ${letter}`}
                      />
                    </div>
                    {isAnswered && isCorrectChoice && (
                      <CheckCircle2
                        className="w-5 h-5 text-[#22c55e]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
          </div>

          {/* Submit */}
          {result === null && (
            <Button
              onClick={handleSubmit}
              disabled={selectedChoice === null || isSubmitting}
              className="w-full h-[44px] text-[16px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg disabled:opacity-40"
            >
              {isSubmitting ? "Gonderiliyor..." : "Cevabi Gonder"}
            </Button>
          )}

          {/* Explanation */}
          {showExplanation && question.explanationAudioRecordId && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-[14px] text-muted-foreground mb-2 flex items-center gap-2">
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                Aciklama
              </p>
              <InlineAudioPlayer
                audioRecordId={question.explanationAudioRecordId}
                label="Aciklama"
              />
            </div>
          )}

          {result !== null && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                result ? "bg-[#22c55e]/10" : "bg-[#ef4444]/10"
              }`}
            >
              <span
                className={`text-[14px] font-medium ${
                  result ? "text-[#22c55e]" : "text-[#ef4444]"
                }`}
              >
                {result ? "Dogru cevap!" : "Yanlis cevap"}
              </span>
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
export default function ProgressPage() {
  const [activeTab, setActiveTab] = useState<"audio" | "questions" | "retry">(
    "audio"
  );
  const [audioItems, setAudioItems] = useState<ProgressItem[]>([]);
  const [incorrectQuestions, setIncorrectQuestions] = useState<IncorrectQuestion[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [audioFilter, setAudioFilter] = useState<"all" | "in_progress" | "completed">(
    "all"
  );

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const [audioRes, incorrectRes] = await Promise.all([
          api.get("/player/progress"),
          api.get("/questions/progress/incorrect?limit=50"),
        ]);

        const audioData = audioRes.data.data || audioRes.data;
        setAudioItems(audioData.items || []);

        const incorrectData = incorrectRes.data.data || incorrectRes.data;
        setIncorrectQuestions(incorrectData.questions || []);
      } catch {
        toast.error("Ilerleme bilgileri yuklenirken hata olustu.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleRetrySuccess = (questionId: string) => {
    setIncorrectQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  const completedAudio = audioItems.filter((i) => i.isCompleted).length;
  const inProgressAudio = audioItems.filter((i) => !i.isCompleted).length;

  const filteredAudioItems = audioItems.filter((item) => {
    if (audioFilter === "completed") return item.isCompleted;
    if (audioFilter === "in_progress") return !item.isCompleted;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-label="Yukleniyor">
        <Loader2 className="w-10 h-10 text-foreground animate-spin" aria-hidden="true" />
        <span className="ml-4 text-[18px] text-muted-foreground">Yukleniyor...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">Ilerleme</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <Headphones className="w-7 h-7 text-[#3b82f6] mx-auto mb-2" aria-hidden="true" />
          <p className="text-[26px] font-bold text-foreground">{audioItems.length}</p>
          <p className="text-[14px] text-muted-foreground">Toplam Dinleme</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <CheckCircle2 className="w-7 h-7 text-[#22c55e] mx-auto mb-2" aria-hidden="true" />
          <p className="text-[26px] font-bold text-foreground">{completedAudio}</p>
          <p className="text-[14px] text-muted-foreground">Tamamlanan</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <PlayCircle className="w-7 h-7 text-[#eab308] mx-auto mb-2" aria-hidden="true" />
          <p className="text-[26px] font-bold text-foreground">{inProgressAudio}</p>
          <p className="text-[14px] text-muted-foreground">Devam Eden</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <XCircle className="w-7 h-7 text-[#ef4444] mx-auto mb-2" aria-hidden="true" />
          <p className="text-[26px] font-bold text-foreground">{incorrectQuestions.length}</p>
          <p className="text-[14px] text-muted-foreground">Yanlis Cevap</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6" role="tablist" aria-label="Ilerleme sekmeleri">
        {[
          {
            key: "audio" as const,
            label: "Ders Dinle",
            icon: Headphones,
          },
          {
            key: "questions" as const,
            label: "Soru Coz",
            icon: HelpCircle,
          },
          {
            key: "retry" as const,
            label: `Tekrar Coz (${incorrectQuestions.length})`,
            icon: RefreshCw,
          },
        ].map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg text-[15px] font-medium transition-colors min-h-[48px] ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-border hover:border-ring hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {tab.label}
          </button>
        );
        })}
      </div>

      {/* ===================== AUDIO TAB ===================== */}
      {activeTab === "audio" && (
        <>
          {/* Audio filter */}
          <div className="flex gap-2 mb-6">
            {[
              {
                key: "all" as const,
                label: "Tumu",
              },
              {
                key: "in_progress" as const,
                label: "Devam Eden",
              },
              {
                key: "completed" as const,
                label: "Tamamlanan",
              },
            ].map((f) => (
            <button
              key={f.key}
              onClick={() => setAudioFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors min-h-[40px] ${
                audioFilter === f.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
          </div>

          {filteredAudioItems.length === 0 ? (
            <div className="text-center py-16">
              <BarChart3 className="mx-auto mb-4 h-16 w-16 text-muted-foreground" aria-hidden="true" />
              <p className="text-[18px] text-muted-foreground">
                {audioItems.length === 0
                  ? "Henuz dinleme gecmisiniz bulunmamaktadir."
                  : "Bu filtreyle eslesen kayit bulunamadi."}
              </p>
              {audioItems.length === 0 && (
                <Link
                  href="/kesfet"
                  className="inline-flex items-center justify-center mt-6 px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg text-[18px] no-underline hover:bg-primary/90 min-h-[48px]"
                >
                  Kesfet
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAudioItems.map((item) => {
                const pct = item.progressPercent;
                return (
                  <Link
                    key={item.id}
                    href={item.audioRecord ? `/dinle/${item.audioRecord.id}` : "#"}
                    className="block bg-card border border-border rounded-xl p-5 hover:border-ring transition-colors no-underline"
                    aria-label={`${item.audioRecord?.title || "Ses kaydi"} - ${item.isCompleted ? "Tamamlandi" : `Yuzde ${pct}`}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[17px] font-semibold text-foreground truncate">
                          {item.audioRecord?.title || "Bilinmeyen Kayit"}
                        </h3>
                        {item.chapter && (
                          <p className="text-[14px] text-muted-foreground truncate mt-1">
                            {item.chapter.title}
                          </p>
                        )}
                      </div>
                      {item.isCompleted ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-medium bg-[#22c55e]/10 text-[#22c55e]">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Tamamlandi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-medium bg-[#eab308]/10 text-[#eab308]">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          Devam Ediyor
                        </span>
                      )}
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: item.isCompleted ? "#22c55e" : "var(--primary)",
                        }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[13px] text-muted-foreground">
                      <span>
                        {formatTime(item.positionSeconds)} /{" "}
                        {formatTime(item.audioRecord?.durationSeconds || 0)}
                      </span>
                      <span>{formatDate(item.updatedAt)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===================== QUESTIONS TAB ===================== */}
      {activeTab === "questions" && (
        <div>
          <p className="text-[16px] text-muted-foreground mb-6">
            Cozdugunuz sorularin ilerleme durumunu kitap detay sayfalarindan takip edebilirsiniz.
            Asagida yanlis cevaplanan sorulari tekrar cozebilirsiniz.
          </p>
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
            <p className="text-[18px] text-muted-foreground mb-4">
              Soru ilerlemenizi her kitabin detay sayfasindan gorebilirsiniz.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/kesfet"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg text-[16px] no-underline hover:bg-primary/90 min-h-[48px]"
              >
                Kesfet&apos;e Git
              </Link>
              {incorrectQuestions.length > 0 && (
                <Button
                  onClick={() => setActiveTab("retry")}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#ef4444] text-white font-semibold rounded-lg text-[16px] hover:bg-[#ef4444]/90 min-h-[48px]"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  {incorrectQuestions.length} Yanlis Soruyu Tekrar Coz
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== RETRY TAB ===================== */}
      {activeTab === "retry" && (
        <div>
          {incorrectQuestions.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-[#22c55e]" aria-hidden="true" />
              <p className="text-[20px] font-semibold text-foreground mb-2">Tebrikler!</p>
              <p className="text-[16px] text-muted-foreground">
                Tekrar cozmeniz gereken yanlis soru bulunmamaktadir.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6 p-4 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl">
                <RefreshCw className="w-5 h-5 text-[#ef4444]" aria-hidden="true" />
                <p className="text-[16px] text-foreground">
                  <span className="font-semibold">{incorrectQuestions.length} yanlis cevaplanmis soru</span>{" "}
                  bulunmaktadir. Tekrar cozerek ogrenmenizi pekistirebilirsiniz.
                </p>
              </div>

              <div className="space-y-3">
                {incorrectQuestions.map((q, idx) => (
                  <RetryQuestionCard
                    key={q.id}
                    question={q}
                    index={idx}
                    onRetrySuccess={handleRetrySuccess}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
