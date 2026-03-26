"use client";

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useMemo, createRef } from "react";
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
  SkipBack,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useVoiceAssistant, type VoiceCommand } from "@/lib/use-voice-assistant";
import { VoiceAssistantButton } from "@/components/voice-assistant-button";

/* ------------------------------------------------------------------ */
/*  Audio Coordinator — ensures only one player plays at a time         */
/* ------------------------------------------------------------------ */
type PlayerCallback = {
  play: () => void;
  pause: () => void;
  seek: (offset: number) => void;
  restart: () => void;
};

class AudioCoordinator {
  private activePlaying?: string | null;
  private players = new Map<string, PlayerCallback>();

  /** Register a player. Returns an unregister function. */
  register(id: string, cb: PlayerCallback) {
    this.players.set(id, cb);
    return () => { this.players.delete(id); };
  }

  /** Notify that a player started — pauses every other player. */
  notifyPlay(activeId: string) {
    this.activePlaying = activeId;
    console.log("notify play ", activeId);
    this.players.forEach((cb, id) => {
      if (id !== activeId) cb.pause();
    });
  }

  setCurrent(id: string) {
    this.activePlaying = id;
    console.log("set current ", id);
  }

  /** Resume the last active player. */
  playCurrent() {
    console.log("play current", this.activePlaying);
    if (!this.activePlaying) return;
    const cb = this.players.get(this.activePlaying);
    if (cb) cb.play();
  }

  /** Seek the last active player by offset seconds. */
  seekCurrent(offset: number) {
    if (!this.activePlaying) return;
    const cb = this.players.get(this.activePlaying);
    if (cb) cb.seek(offset);
  }

  /** Restart the last active player from the beginning. */
  restartCurrent() {
    if (!this.activePlaying) return;
    const cb = this.players.get(this.activePlaying);
    if (cb) cb.restart();
  }

  /** Pause ALL players (used by "durdur" voice command). */
  pauseAll() {
    this.activePlaying = null;
    console.log("active playing paused");
    this.players.forEach((cb) => cb.pause());
  }
}

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
/*  Inline Audio Player (with imperative handle)                        */
/* ------------------------------------------------------------------ */
export interface AudioPlayerHandle {
  play: () => void;
  pause: () => void;
  seek: (offset: number) => void;
  restart: () => void;
}

interface InlineAudioPlayerProps {
  audioRecordId: string;
  label: string;
  autoPlay?: boolean;
  autoLoad?: boolean;
  onPlayPause?: (key: string, state: boolean) => void;
  /** Show ±10s seek buttons (used for question audio) */
  showSeekControls?: boolean;
  /** Coordinator that pauses other players when this one starts */
  coordinator?: AudioCoordinator;
  /** Unique id for coordinator registration */
  coordinatorId?: string;
}

const InlineAudioPlayer = forwardRef<AudioPlayerHandle, InlineAudioPlayerProps>(
  function InlineAudioPlayer({ audioRecordId, label, autoPlay = false, autoLoad = false, showSeekControls = false, onPlayPause = null, coordinator, coordinatorId }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [url, setUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    if (autoPlay)
      autoLoad = true;

    const playerId = coordinatorId || audioRecordId;

    // Register with coordinator
    useEffect(() => {
      if (!coordinator) return;
      return coordinator.register(playerId, {
        play: async () => {
          audioRef.current?.play();
          console.log("aref ", audioRef.current);
          setIsPlaying(true);
        },
        pause: () => {
          audioRef.current?.pause();
          setIsPlaying(false);
        },
        seek: (offset: number) => {
          const el = audioRef.current;
          if (!el) return;
          el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + offset));
        },
        restart: () => {
          const el = audioRef.current;
          if (!el) return;
          el.currentTime = 0;
          el.play().catch(() => {});
          setIsPlaying(true);
        },
      });
    }, [coordinator, playerId]);

    const load = useCallback(async () => {
      if (url) return;
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
      if (autoLoad) load();
    }, [autoLoad, load]);

    useEffect(() => {
      if (url && autoPlay && audioRef.current) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }, [url, autoPlay]);

    const doPlay = useCallback(() => {
      coordinator?.notifyPlay(playerId);
      if (!url) {
        load().then(() => {
          setTimeout(() => {
            audioRef.current?.play().catch(() => {});
            setIsPlaying(true);
          }, 200);
        });
        return;
      }
      audioRef.current?.play().catch(() => {});
      setIsPlaying(true);
    }, [url, load, coordinator, playerId]);

    const doPause = useCallback(() => {
      audioRef.current?.pause();
      setIsPlaying(false);
    }, []);

    const doSeek = useCallback((offset: number) => {
      const el = audioRef.current;
      if (!el) return;
      el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + offset));
    }, []);

    const doRestart = useCallback(() => {
      const el = audioRef.current;
      if (!el) return;
      coordinator?.notifyPlay(playerId);
      el.currentTime = 0;
      el.play().catch(() => {});
      setIsPlaying(true);
    }, [coordinator, playerId]);

    // Expose imperative handle to parent
    useImperativeHandle(ref, () => ({
      play: doPlay,
      pause: doPause,
      seek: doSeek,
      restart: doRestart,
    }), [doPlay, doPause, doSeek, doRestart]);

    const togglePlay = async () => {
      if (!url) {
        await load();
        setTimeout(() => {
          coordinator?.notifyPlay(playerId);
          audioRef.current?.play().catch(() => {});
          setIsPlaying(true);
          if (onPlayPause) onPlayPause('', true);
        }, 200);
        return;
      }
      if (isPlaying) {
        doPause();
        if (onPlayPause) onPlayPause('', false);
      } else {
        doPlay();
        if (onPlayPause) onPlayPause('', true);
      }
    };

    const pct = duration > 0 ? (progress / duration) * 100 : 0;

    return (
      <div className="flex items-center gap-2">
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

        {/* Rewind button */}
        {showSeekControls && (
          <button
            onClick={() => doSeek(-10)}
            aria-label="10 saniye geri"
            className="w-[32px] h-[32px] rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}

        {/* Play/Pause */}
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

        {/* Forward button */}
        {showSeekControls && (
          <button
            onClick={() => doSeek(10)}
            aria-label="10 saniye ileri"
            className="w-[32px] h-[32px] rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}

        {/* Progress bar (click to seek) */}
        <div
          className="flex-1 h-2 rounded-full bg-muted overflow-hidden cursor-pointer group relative"
          onClick={(e) => {
            const el = audioRef.current;
            if (!el || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            el.currentTime = ratio * duration;
          }}
          role="slider"
          aria-label={`${label} ilerleme`}
          aria-valuenow={Math.floor(progress)}
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          tabIndex={0}
        >
          <div className="h-full rounded-full bg-primary transition-all relative" style={{ width: `${pct}%` }}>
            <div className="absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-primary shadow opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Explanation Dialog                                                  */
/* ------------------------------------------------------------------ */
function ExplanationDialog({
  open,
  explanationAudioId,
  onClose,
  coordinator,
}: {
  open: boolean;
  explanationAudioId: string | null;
  onClose: () => void;
  coordinator?: AudioCoordinator;
}) {
  if (!open) return null;
  console.log("set");
  coordinator?.setCurrent('explanation');
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
            <InlineAudioPlayer audioRecordId={explanationAudioId} label="Aciklama" autoLoad coordinator={coordinator} coordinatorId="explanation" />
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

  /* ---- Audio coordinator (only one player at a time) ---- */
  const [coordinator] = useState(() => new AudioCoordinator());

  /* ---- Question audio player ref ---- */
  const questionAudioRef = useRef<AudioPlayerHandle>(null);

  /* ---- Choice audio player refs (A=0, B=1, C=2, D=3) ---- */
  const choiceRefsMap = useRef<Map<number, React.RefObject<AudioPlayerHandle | null>>>(new Map());
  const getChoiceRef = useCallback((choiceIndex: number) => {
    if (!choiceRefsMap.current.has(choiceIndex)) {
      choiceRefsMap.current.set(choiceIndex, createRef<AudioPlayerHandle>());
    }
    return choiceRefsMap.current.get(choiceIndex)!;
  }, []);

  /* ---- Refs for voice commands (avoid stale closures) ---- */
  const currentIdxRef = useRef(currentIdx);
  const questionsRef = useRef(questions);
  const selectedChoiceRef = useRef(selectedChoice);
  const showExplanationRef = useRef(showExplanation);
  const lastResultRef = useRef(lastResult);

  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { selectedChoiceRef.current = selectedChoice; }, [selectedChoice]);
  useEffect(() => { showExplanationRef.current = showExplanation; }, [showExplanation]);
  useEffect(() => { lastResultRef.current = lastResult; }, [lastResult]);

  /* Stable navigation helpers for voice commands */
  const goNextStable = useCallback(() => {
    const idx = currentIdxRef.current;
    const len = questionsRef.current.length;
    if (idx < len - 1) setCurrentIdx(idx + 1);
  }, []);

  const goPrevStable = useCallback(() => {
    const idx = currentIdxRef.current;
    if (idx > 0) setCurrentIdx(idx - 1);
  }, []);

  /* ---- Voice assistant commands ---- */
  const voiceCommands = useMemo<VoiceCommand[]>(() => [
    // Navigation
    {
      keywords: ["sonraki", "sonraki soru", "ileri", "next"],
      action: () => goNextStable(),
    },
    {
      keywords: ["cevapla", "onayla", "cevabı gönder", "cevabi gonder", "answer it"],
      action: async ()  => {
        console.log("hello2");
        if (!hasSubmittedThis && !alreadyAnswered && !isSubmitting && selectedChoice != null) await handleSubmit();
      },
    },
    {
      keywords: ["önceki", "onceki", "önceki soru", "onceki soru", "geri", "previous"],
      action: () => goPrevStable(),
    },
    // Audio controls — pause ALL players
    {
      keywords: ["durdur", "dur", "pause", "stop", "sus"],
      action: () => coordinator.pauseAll(),
    },
    {
      keywords: ["başlat", "baslat", "oynat", "play", "çal", "cal"],
      action: () => {
        console.log("başlat");
        coordinator.playCurrent();
      },
    },
    {
      keywords: ["soruyu oynat", "soruyu dinle", "soruyu başlat"],
      action: () => {
        console.log("jejeje");
        questionAudioRef.current?.play();
      },
    },
    {
      keywords: ["tekrarla", "tekrar başlat", "tekrar baslat", "restart", "yeniden"],
      action: () => coordinator.restartCurrent(),
    },
    {
      keywords: ["ileri sar", "ileri", "fast forward"],
      action: () => coordinator.seekCurrent(10),
    },
    {
      keywords: ["geri sar", "rewind"],
      action: () => coordinator.seekCurrent(-10),
    },
    // Play specific choice audio: "a şıkkını oynat/dinle"
    {
      keywords: [
        "a şıkkını oynat", "a sikkini oynat", "a şıkkını dinle", "a sikkini dinle",
        "a yı oynat", "a yi oynat", "a yı dinle", "a yi dinle",
        "adana şıkkını oynat", "adana sikkini oynat", "adana şıkkını dinle", "adana sikkini dinle"
      ],
      action: () => {
        console.log("hello");
        getChoiceRef(0).current?.play();
      },
    },
    {
      keywords: [
        "b şıkkını oynat", "b sikkini oynat", "b şıkkını dinle", "b sikkini dinle",
        "b yi oynat", "b yi dinle",
        "bursa şıkkını oynat", "bursa sikkini oynat", "bursa şıkkını dinle", "bursa sikkini dinle"
      ],
      action: () => getChoiceRef(1).current?.play(),
    },
    {
      keywords: [
        "c şıkkını oynat", "c sikkini oynat", "c şıkkını dinle", "c sikkini dinle",
        "c yi oynat", "c yi dinle", "c'yi oynat", "c'yi dinle",
        "ceyhan şıkkını oynat", "ceyhan sikkini oynat", "ceyhan şıkkını dinle", "ceyhan sikkini dinle"
      ],
      action: () => getChoiceRef(2).current?.play(),
    },
    {
      keywords: [
        "d şıkkını oynat", "d sikkini oynat", "d şıkkını dinle", "d sikkini dinle",
        "d yi oynat", "d yi dinle", "d'yi oynat", "d'yi dinle",
        "denizli şıkkını oynat", "denizli sikkini oynat", "denizli şıkkını dinle", "denizli sikkini dinle"
      ],
      action: () => getChoiceRef(3).current?.play(),
    },
    // Select answer choices
    {
      keywords: ["cevap a", "a şıkkı", "a sikki", "şık a", "sik a", "cevap adana"],
      action: () => setSelectedChoice(0),
    },
    {
      keywords: ["cevap b", "b şıkkı", "b sikki", "şık b", "sik b", "cevap bursa"],
      action: () => setSelectedChoice(1),
    },
    {
      keywords: ["cevap c", "c şıkkı", "c sikki", "şık c", "sik c", "cevap ceyhan"],
      action: () => setSelectedChoice(2),
    },
    {
      keywords: ["cevap d", "d şıkkı", "d sikki", "şık d", "sik d", "cevap denizli"],
      action: () => setSelectedChoice(3),
    },
    // Popup yes/no
    {
      keywords: ["evet", "yes"],
      action: () => {
        if (showExplanationRef.current) {
          coordinator.playCurrent(); // explanation dialog sets itself as current
        }
      }
    },
    {
      keywords: ["açıklamayı dinle", "açıklama", "aciklamayi dinle", "aciklama", "explanation"],
      action: () => {
        setShowExplanation(true);
      }
    },
    {
      keywords: ["devam", "devam et"],
      action: () => {
        if (showExplanationRef.current) {
          setShowExplanation(false);
          goNextStable();
        }
      },
    },
    {
      keywords: ["hayır", "hayir", "no", "kapat"],
      action: () => {
        if (showExplanationRef.current) {
          setShowExplanation(false);
        }
      },
    },
  ], [goNextStable, goPrevStable, coordinator, getChoiceRef]);

  const {
    isListening,
    isSupported,
    lastTranscript,
    toggleListening,
  } = useVoiceAssistant({ commands: voiceCommands, enabled: true });

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
        // Pause all audio when wrong answer popup shows
        coordinator.pauseAll();
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
        coordinator={coordinator}
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
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 text-[14px]">
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
        <VoiceAssistantButton
          isListening={isListening}
          isSupported={isSupported}
          lastTranscript={lastTranscript}
          onToggle={toggleListening}
        />
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
              ref={questionAudioRef}
              key={currentQuestion.audioRecordId}
              audioRecordId={currentQuestion.audioRecordId}
              label={`Soru ${currentIdx + 1}`}
              autoPlay
              showSeekControls
              coordinator={coordinator}
              coordinatorId="question"
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
                  <div
                    key={choice.id}
                    onClick={() => {
                      if (!isAnswered) setSelectedChoice(choice.choiceIndex);
                    }}
                    //disabled={isAnswered}
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
                        ref={getChoiceRef(choice.choiceIndex)}
                        audioRecordId={choice.audioRecordId}
                        label={`Secenek ${letter}`}
                        coordinator={coordinator}
                        coordinatorId={`choice-${choice.choiceIndex}`}
                      />
                    </div>

                    {isAnswered && isCorrectChoice && (
                      <CheckCircle2 className="w-6 h-6 text-[#22c55e] flex-shrink-0" aria-hidden="true" />
                    )}
                    {isAnswered && wasUserChoice && !isCorrectChoice && (
                      <XCircle className="w-6 h-6 text-[#ef4444] flex-shrink-0" aria-hidden="true" />
                    )}
                  </div>
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

