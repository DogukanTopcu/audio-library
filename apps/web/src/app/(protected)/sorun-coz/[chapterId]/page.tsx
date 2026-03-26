"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Choice {
  id: string;
  choiceIndex: number;
  audioRecordId: string;
  choiceText?: string;
}

interface UserAnswer {
  selectedChoiceIndex: number;
  isCorrect: boolean;
  attemptCount: number;
  answeredAt: string;
}

interface Question {
  id: string;
  audioRecordId: string;
  explanationAudioRecordId?: string | null;
  chapterId: string;
  correctChoiceIndex: number;
  orderIndex: number;
  difficultyLevel?: string;
  topicTags?: string[];
  choices: Choice[];
  userAnswer: UserAnswer | null;
}

/* ------------------------------------------------------------------ */
/*  Inline Audio Player                                                 */
/* ------------------------------------------------------------------ */
function InlineAudioPlayer({
  audioRecordId,
  label,
  autoPlay = false,
}: {
  audioRecordId: string;
  label: string;
  autoPlay?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const load = useCallback(async () => {
    if (url) return; // already loaded
    setIsLoading(true);
    try {
      const { data } = await api.get(`/player/token?audioRecordId=${audioRecordId}`);
      const result = data.data || data;
      setUrl(result.url);
    } catch {
      toast.error("Ses yuklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [audioRecordId, url]);

  useEffect(() => {
    if (autoPlay) load();
  }, [autoPlay, load]);

  useEffect(() => {
    if (url && autoPlay && audioRef.current) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [url, autoPlay]);

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

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onTimeUpdate={() => audioRef.current && setProgress(audioRef.current.currentTime)}
          onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
        />
      )}
      <button
        onClick={togglePlay}
        disabled={isLoading}
        aria-label={isPlaying ? `${label} duraklat` : `${label} oynat`}
        className="w-[40px] h-[40px] rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-colors"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" aria-hidden="true" />
        )}
      </button>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Explanation Dialog                                                  */
/* ------------------------------------------------------------------ */
function ExplanationDialog({
  open,
  explanationAudioId,
  onClose,
}: {
  open: boolean;
  explanationAudioId: string | null;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Yanlis cevap"
    >
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <XCircle className="w-8 h-8 text-[#ef4444]" aria-hidden="true" />
          <h2 className="text-xl font-bold text-foreground">Yanlis Cevap</h2>
        </div>
        <p className="text-[16px] text-muted-foreground mb-6">
          Cevabiniz yanlis. {explanationAudioId ? "Aciklamayi dinlemek ister misiniz?" : ""}
        </p>

        {explanationAudioId && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <p className="text-[14px] text-muted-foreground mb-3 flex items-center gap-2">
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              Aciklama
            </p>
            <InlineAudioPlayer audioRecordId={explanationAudioId} label="Aciklama" autoPlay />
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            className="flex-1 h-[48px] text-[16px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
          >
            Devam Et
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function QuestionBankPage() {
  const params = useParams();
  const chapterId = params.chapterId as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; questionId: string } | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const [contentInfo, setContentInfo] = useState<{ id: string; title: string } | null>(null);
  const [startTime, setStartTime] = useState(Date.now());

  /* ---- Fetch questions ---- */
  useEffect(() => {
    if (!chapterId) return;
    const fetchQuestions = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/questions/chapter/${chapterId}`);
        const result = data.data || data;
        const qs = Array.isArray(result) ? result : result.questions || [];
        setQuestions(qs);

        // Find first unanswered or first incorrect
        const firstUnanswered = qs.findIndex((q: Question) => !q.userAnswer);
        const firstIncorrect = qs.findIndex((q: Question) => q.userAnswer && !q.userAnswer.isCorrect);
        if (firstUnanswered >= 0) setCurrentIdx(firstUnanswered);
        else if (firstIncorrect >= 0) setCurrentIdx(firstIncorrect);

        // Fetch chapter info
        const { data: chapterData } = await api.get(`/kesfet/chapter/${chapterId}`);
        const chResult = chapterData.data || chapterData;
        setChapterTitle(chResult.chapter?.title || "");
        setContentInfo(chResult.content || null);
      } catch {
        toast.error("Sorular yuklenirken hata olustu.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, [chapterId]);

  // Reset selected choice when navigating
  useEffect(() => {
    setSelectedChoice(null);
    setLastResult(null);
    setStartTime(Date.now());
  }, [currentIdx]);

  const currentQuestion = questions[currentIdx];

  /* ---- Submit answer ---- */
  const handleSubmit = async () => {
    if (selectedChoice === null || !currentQuestion) return;
    setIsSubmitting(true);
    try {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      const { data } = await api.post(`/questions/${currentQuestion.id}/answer`, {
        questionId: currentQuestion.id,
        selectedChoiceIndex: selectedChoice,
        timeSpentSeconds: timeSpent,
      });
      const result = data.data || data;
      const isCorrect = result.isCorrect;

      // Update local state
      setLastResult({ isCorrect, questionId: currentQuestion.id });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === currentQuestion.id
            ? {
                ...q,
                userAnswer: {
                  selectedChoiceIndex: selectedChoice,
                  isCorrect,
                  attemptCount: (q.userAnswer?.attemptCount || 0) + 1,
                  answeredAt: new Date().toISOString(),
                },
              }
            : q
        )
      );

      if (isCorrect) {
        toast.success("Dogru cevap!");
      } else {
        // Show explanation dialog
        setShowExplanation(true);
      }
    } catch {
      toast.error("Cevap gonderilirken hata olustu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    if (currentIdx < questions.length - 1) setCurrentIdx(currentIdx + 1);
  };

  const goPrev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  /* ---- Keyboard ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" && lastResult) {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center" role="status" aria-label="Yukleniyor">
        <Loader2 className="w-12 h-12 text-foreground animate-spin" aria-hidden="true" />
        <span className="ml-4 text-[18px] text-muted-foreground">Sorular yukleniyor...</span>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <HelpCircle className="mx-auto mb-4 h-16 w-16 text-muted-foreground" aria-hidden="true" />
        <p className="text-[20px] text-muted-foreground">Bu bolumde soru bulunamadi.</p>
        <Link href="/kesfet" className="inline-flex items-center gap-2 mt-6 text-[18px] text-foreground hover:underline">
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Kesfet
        </Link>
      </div>
    );
  }

  const answeredCount = questions.filter((q) => q.userAnswer).length;
  const correctCount = questions.filter((q) => q.userAnswer?.isCorrect).length;
  const alreadyAnswered = currentQuestion?.userAnswer && lastResult?.questionId !== currentQuestion.id;
  const hasSubmittedThis = lastResult?.questionId === currentQuestion?.id;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Explanation popup */}
      <ExplanationDialog
        open={showExplanation}
        explanationAudioId={currentQuestion?.explanationAudioRecordId || null}
        onClose={() => setShowExplanation(false)}
      />

      {/* Back */}
      {contentInfo && (
        <Link
          href={`/kesfet/${contentInfo.id}`}
          className="inline-flex items-center gap-2 text-[16px] text-muted-foreground hover:text-foreground transition-colors mb-6"
          aria-label="Kitaba don"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          {contentInfo.title}
        </Link>
      )}

      <h1 className="text-2xl font-bold text-foreground mb-1">{chapterTitle || "Soru Bankasi"}</h1>
      <p className="text-[16px] text-muted-foreground mb-6">Soru Coz</p>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-6 text-[14px]">
        <span className="text-muted-foreground">
          Soru {currentIdx + 1} / {questions.length}
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="flex items-center gap-1 text-[#22c55e]">
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          {correctCount} dogru
        </span>
        <span className="flex items-center gap-1 text-[#ef4444]">
          <XCircle className="w-4 h-4" aria-hidden="true" />
          {answeredCount - correctCount} yanlis
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex flex-wrap gap-1.5 mb-8" role="navigation" aria-label="Soru navigasyonu">
        {questions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => setCurrentIdx(idx)}
            aria-label={`Soru ${idx + 1}${q.userAnswer ? (q.userAnswer.isCorrect ? " - dogru" : " - yanlis") : ""}`}
            aria-current={idx === currentIdx ? "step" : undefined}
            className={`w-8 h-8 rounded-full text-[12px] font-medium transition-colors flex items-center justify-center ${
              idx === currentIdx
                ? "bg-primary text-primary-foreground"
                : q.userAnswer?.isCorrect
                  ? "bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40"
                  : q.userAnswer && !q.userAnswer.isCorrect
                    ? "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40"
                    : "bg-muted text-muted-foreground"
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      {/* Question card */}
      {currentQuestion && (
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 mb-6">
          {/* Question audio */}
          <div className="mb-6">
            <p className="text-[14px] text-muted-foreground mb-3 flex items-center gap-2">
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              Soru {currentIdx + 1} - Soruyu dinleyin
            </p>
            <InlineAudioPlayer
              key={currentQuestion.audioRecordId}
              audioRecordId={currentQuestion.audioRecordId}
              label={`Soru ${currentIdx + 1}`}
              autoPlay
            />
          </div>

          {/* Difficulty badge */}
          {currentQuestion.difficultyLevel && (
            <span
              className={`inline-block px-3 py-1 rounded-full text-[12px] font-medium mb-4 ${
                currentQuestion.difficultyLevel === "EASY"
                  ? "bg-[#22c55e]/10 text-[#22c55e]"
                  : currentQuestion.difficultyLevel === "MEDIUM"
                    ? "bg-[#eab308]/10 text-[#eab308]"
                    : "bg-[#ef4444]/10 text-[#ef4444]"
              }`}
            >
              {currentQuestion.difficultyLevel === "EASY" ? "Kolay" : currentQuestion.difficultyLevel === "MEDIUM" ? "Orta" : "Zor"}
            </span>
          )}

          {/* Choices */}
          <div className="space-y-3">
            <p className="text-[16px] font-medium text-foreground">Secenekler:</p>
            {currentQuestion.choices
              .sort((a, b) => a.choiceIndex - b.choiceIndex)
              .map((choice) => {
                const letter = String.fromCharCode(65 + choice.choiceIndex);
                const isSelected = selectedChoice === choice.choiceIndex;
                const isAnswered = hasSubmittedThis || !!alreadyAnswered;
                const isCorrectChoice = choice.choiceIndex === currentQuestion.correctChoiceIndex;
                const wasUserChoice =
                  (hasSubmittedThis && isSelected) ||
                  (alreadyAnswered && currentQuestion.userAnswer?.selectedChoiceIndex === choice.choiceIndex);

                let borderColor = "border-border";
                let bgColor = "bg-card hover:bg-muted";

                if (isAnswered) {
                  if (isCorrectChoice) {
                    borderColor = "border-[#22c55e]";
                    bgColor = "bg-[#22c55e]/10";
                  } else if (wasUserChoice && !isCorrectChoice) {
                    borderColor = "border-[#ef4444]";
                    bgColor = "bg-[#ef4444]/10";
                  }
                } else if (isSelected) {
                  borderColor = "border-primary";
                  bgColor = "bg-primary/10";
                }

                return (
                  <button
                    key={choice.id}
                    onClick={() => {
                      if (!isAnswered) setSelectedChoice(choice.choiceIndex);
                    }}
                    disabled={isAnswered}
                    aria-label={`Secenek ${letter}${choice.choiceText ? `: ${choice.choiceText}` : ""}`}
                    className={`w-full flex items-center gap-4 px-4 py-4 border-2 rounded-xl transition-colors min-h-[60px] text-left ${borderColor} ${bgColor} ${
                      isAnswered ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0 ${
                        isSelected && !isAnswered
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {letter}
                    </span>

                    <div className="flex-1 min-w-0">
                      {choice.choiceText && (
                        <p className="text-[16px] text-foreground mb-2">{choice.choiceText}</p>
                      )}
                      <InlineAudioPlayer
                        audioRecordId={choice.audioRecordId}
                        label={`Secenek ${letter}`}
                      />
                    </div>

                    {isAnswered && isCorrectChoice && (
                      <CheckCircle2 className="w-6 h-6 text-[#22c55e] flex-shrink-0" aria-hidden="true" />
                    )}
                    {isAnswered && wasUserChoice && !isCorrectChoice && (
                      <XCircle className="w-6 h-6 text-[#ef4444] flex-shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
          </div>

          {/* Submit button */}
          {!hasSubmittedThis && !alreadyAnswered && (
            <Button
              onClick={handleSubmit}
              disabled={selectedChoice === null || isSubmitting}
              className="w-full mt-6 h-[52px] text-[18px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg disabled:opacity-40"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  Gonderiliyor...
                </span>
              ) : (
                "Cevabi Gonder"
              )}
            </Button>
          )}

          {/* Result indicator */}
          {(hasSubmittedThis || alreadyAnswered) && (
            <div
              className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${
                (hasSubmittedThis ? lastResult?.isCorrect : currentQuestion.userAnswer?.isCorrect)
                  ? "bg-[#22c55e]/10 border border-[#22c55e]/30"
                  : "bg-[#ef4444]/10 border border-[#ef4444]/30"
              }`}
            >
              {(hasSubmittedThis ? lastResult?.isCorrect : currentQuestion.userAnswer?.isCorrect) ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-[#22c55e]" aria-hidden="true" />
                  <span className="text-[16px] font-medium text-[#22c55e]">Dogru cevap!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-[#ef4444]" aria-hidden="true" />
                  <span className="text-[16px] font-medium text-[#ef4444]">Yanlis cevap</span>
                  {currentQuestion.explanationAudioRecordId && (
                    <button
                      onClick={() => setShowExplanation(true)}
                      className="ml-auto text-[14px] text-foreground underline hover:no-underline"
                    >
                      Aciklamayi dinle
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          onClick={goPrev}
          disabled={currentIdx <= 0}
          aria-label="Onceki soru"
          className="flex items-center gap-2 h-[48px] px-5 text-[16px] bg-card border border-border text-foreground hover:bg-muted rounded-lg disabled:opacity-40"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          Onceki
        </Button>

        <span className="text-[16px] text-muted-foreground">
          {currentIdx + 1} / {questions.length}
        </span>

        <Button
          onClick={goNext}
          disabled={currentIdx >= questions.length - 1}
          aria-label="Sonraki soru"
          className="flex items-center gap-2 h-[48px] px-5 text-[16px] bg-card border border-border text-foreground hover:bg-muted rounded-lg disabled:opacity-40"
        >
          Sonraki
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

