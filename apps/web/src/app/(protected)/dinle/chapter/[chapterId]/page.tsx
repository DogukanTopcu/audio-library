"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Loader2,
  ArrowLeft,
  Minus,
  Plus,
  CheckCircle2,
  Headphones,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface AudioProgress {
  positionSeconds: number;
  isCompleted: boolean;
  progressPercent: number;
}

interface AudioItem {
  id: string;
  title: string;
  type: string;
  durationSeconds: number | null;
  orderIndex: number;
  previousId: string | null;
  nextId: string | null;
  progress: AudioProgress | null;
}

interface ChapterAudioData {
  chapter: { id: string; title: string; contentId: string };
  content: { id: string; title: string };
  audioRecords: AudioItem[];
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function ChapterPlayerPage() {
  const params = useParams();
  const chapterId = params.chapterId as string;

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressSaveInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const [data, setData] = useState<ChapterAudioData | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  /* ---- Fetch chapter audio list ---- */
  useEffect(() => {
    if (!chapterId) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: res } = await api.get(`/player/chapter/${chapterId}/audio-list`);
        setData(res.data || res);
      } catch {
        toast.error("Bolum bilgileri yuklenirken hata olustu.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [chapterId]);

  /* ---- Load audio for active index ---- */
  const loadAudio = useCallback(
    async (index: number) => {
      if (!data || index < 0 || index >= data.audioRecords.length) return;
      setIsAudioLoading(true);
      setIsPlaying(false);
      const audio = data.audioRecords[index]!;
      try {
        const { data: res } = await api.get(`/player/token?audioRecordId=${audio.id}`);
        const result = res.data || res;
        setSignedUrl(result.url);
        setActiveIndex(index);

        // Resume from saved position
        if (audio.progress && !audio.progress.isCompleted) {
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.currentTime = audio.progress!.positionSeconds;
            }
          }, 300);
        }
      } catch {
        toast.error("Ses kaydi yuklenirken hata olustu.");
      } finally {
        setIsAudioLoading(false);
      }
    },
    [data]
  );

  // Load first audio on data
  useEffect(() => {
    if (data && data.audioRecords.length > 0) {
      // Find last-in-progress or first
      const inProgressIdx = data.audioRecords.findIndex(
        (a) => a.progress && !a.progress.isCompleted && a.progress.positionSeconds > 0
      );
      loadAudio(inProgressIdx >= 0 ? inProgressIdx : 0);
    }
  }, [data, loadAudio]);

  /* ---- Save progress every 5s ---- */
  useEffect(() => {
    if (isPlaying && data) {
      const activeAudio = data.audioRecords[activeIndex];
      if (!activeAudio) return;
      progressSaveInterval.current = setInterval(() => {
        const el = audioRef.current;
        if (el) {
          api
            .patch("/player/progress", {
              audioRecordId: activeAudio.id,
              positionSeconds: Math.floor(el.currentTime),
              isCompleted: false,
            })
            .catch(() => {});
        }
      }, 5000);
    }
    return () => {
      if (progressSaveInterval.current) clearInterval(progressSaveInterval.current);
    };
  }, [isPlaying, activeIndex, data]);

  /* ---- Audio event handlers ---- */
  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (!data) return;
    const activeAudio = data.audioRecords[activeIndex];
    if (activeAudio) {
      api
        .patch("/player/progress", {
          audioRecordId: activeAudio.id,
          positionSeconds: Math.floor(duration),
          isCompleted: true,
        })
        .catch(() => {});
      // Mark in local data
      activeAudio.progress = {
        positionSeconds: Math.floor(duration),
        isCompleted: true,
        progressPercent: 100,
      };
    }
    // Auto-advance
    if (activeIndex < data.audioRecords.length - 1) {
      loadAudio(activeIndex + 1);
    }
  };

  /* ---- Playback controls ---- */
  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().catch(() => toast.error("Ses oynatilirken hata olustu."));
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const seek = useCallback((offset: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + offset));
  }, []);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    el.currentTime = ratio * duration;
  };

  const changeSpeed = useCallback(
    (dir: number) => {
      const idx = SPEED_OPTIONS.indexOf(playbackSpeed);
      const newIdx = Math.max(0, Math.min(SPEED_OPTIONS.length - 1, idx + dir));
      const newSpeed = SPEED_OPTIONS[newIdx]!;
      setPlaybackSpeed(newSpeed);
      if (audioRef.current) audioRef.current.playbackRate = newSpeed;
    },
    [playbackSpeed]
  );

  /* ---- Keyboard shortcuts ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(10);
          break;
        case "[":
          e.preventDefault();
          if (activeIndex > 0) loadAudio(activeIndex - 1);
          break;
        case "]":
          e.preventDefault();
          if (data && activeIndex < data.audioRecords.length - 1) loadAudio(activeIndex + 1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seek, activeIndex, data, loadAudio]);

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center" role="status" aria-label="Yukleniyor">
        <Loader2 className="w-12 h-12 text-foreground animate-spin" aria-hidden="true" />
        <span className="ml-4 text-[18px] text-muted-foreground">Yukleniyor...</span>
      </div>
    );
  }

  if (!data || data.audioRecords.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <Headphones className="mx-auto mb-4 h-16 w-16 text-muted-foreground" aria-hidden="true" />
        <p className="text-[20px] text-muted-foreground">Bu bolumde ses kaydi bulunamadi.</p>
        <Link href="/kesfet" className="inline-flex items-center gap-2 mt-6 text-[18px] text-foreground hover:underline">
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Kesfet
        </Link>
      </div>
    );
  }

  const activeAudio = data.audioRecords[activeIndex]!;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <Link
        href={`/kesfet/${data.content.id}`}
        className="inline-flex items-center gap-2 text-[16px] text-muted-foreground hover:text-foreground transition-colors mb-6"
        aria-label="Kitaba don"
      >
        <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        {data.content.title}
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-2">{data.chapter.title}</h1>
      <p className="text-[16px] text-muted-foreground mb-8">Ders Dinle</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar - Audio list */}
        <aside className="lg:col-span-1 order-2 lg:order-1">
          <h2 className="text-[18px] font-semibold text-foreground mb-3">Ses Kayitlari</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {data.audioRecords.map((audio, idx) => (
              <button
                key={audio.id}
                onClick={() => loadAudio(idx)}
                aria-label={`${audio.title} ${audio.progress?.isCompleted ? "- Tamamlandi" : ""}`}
                aria-current={idx === activeIndex ? "true" : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border last:border-b-0 min-h-[48px] ${
                  idx === activeIndex
                    ? "bg-primary/10 border-l-4 border-l-primary"
                    : "hover:bg-muted"
                }`}
              >
                <span className="text-[14px] text-muted-foreground w-6 text-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-[15px] text-foreground block truncate">{audio.title}</span>
                  {audio.durationSeconds && (
                    <span className="text-[13px] text-muted-foreground">
                      {formatTime(audio.durationSeconds)}
                    </span>
                  )}
                </div>
                {audio.progress?.isCompleted && (
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e] flex-shrink-0" aria-hidden="true" />
                )}
                {audio.progress && !audio.progress.isCompleted && audio.progress.progressPercent > 0 && (
                  <span className="text-[12px] text-muted-foreground flex-shrink-0">
                    %{audio.progress.progressPercent}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Player */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          {/* Hidden audio */}
          {signedUrl && (
            <audio
              ref={audioRef}
              src={signedUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              preload="metadata"
            />
          )}

          <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
            {/* Current track info */}
            <div className="text-center mb-8">
              <p className="text-[14px] text-muted-foreground mb-1">
                Kayit {activeIndex + 1} / {data.audioRecords.length}
              </p>
              <h3 className="text-xl font-bold text-foreground">
                {isAudioLoading ? "Yukleniyor..." : activeAudio.title}
              </h3>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div
                role="slider"
                tabIndex={0}
                aria-label="Ses ilerleme cubugu"
                aria-valuenow={Math.floor(currentTime)}
                aria-valuemin={0}
                aria-valuemax={Math.floor(duration)}
                className="relative h-3 w-full cursor-pointer rounded-full bg-muted group"
                onClick={handleProgressClick}
              >
                <div
                  className="relative h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-primary shadow-lg opacity-0 group-hover:opacity-100" />
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[16px] text-muted-foreground font-mono">{formatTime(currentTime)}</span>
                <span className="text-[16px] text-muted-foreground font-mono">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6">
              <Button
                onClick={() => loadAudio(activeIndex - 1)}
                disabled={activeIndex <= 0 || isAudioLoading}
                aria-label="Onceki kayit"
                className="w-[48px] h-[48px] rounded-full bg-card border border-border text-foreground hover:bg-muted disabled:opacity-30 flex items-center justify-center"
              >
                <SkipBack className="w-5 h-5" aria-hidden="true" />
              </Button>

              <Button
                onClick={() => seek(-10)}
                aria-label="10 saniye geri"
                className="w-[44px] h-[44px] rounded-full bg-card border border-border text-foreground hover:bg-muted flex items-center justify-center text-[13px] font-bold"
              >
                -10
              </Button>

              <button
                onClick={togglePlay}
                disabled={isAudioLoading}
                aria-label={isPlaying ? "Duraklat" : "Oynat"}
                className="w-[72px] h-[72px] rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center shadow-lg disabled:opacity-50"
              >
                {isAudioLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin" aria-hidden="true" />
                ) : isPlaying ? (
                  <Pause className="w-8 h-8" aria-hidden="true" />
                ) : (
                  <Play className="w-8 h-8 ml-1" aria-hidden="true" />
                )}
              </button>

              <Button
                onClick={() => seek(10)}
                aria-label="10 saniye ileri"
                className="w-[44px] h-[44px] rounded-full bg-card border border-border text-foreground hover:bg-muted flex items-center justify-center text-[13px] font-bold"
              >
                +10
              </Button>

              <Button
                onClick={() => loadAudio(activeIndex + 1)}
                disabled={activeIndex >= data.audioRecords.length - 1 || isAudioLoading}
                aria-label="Sonraki kayit"
                className="w-[48px] h-[48px] rounded-full bg-card border border-border text-foreground hover:bg-muted disabled:opacity-30 flex items-center justify-center"
              >
                <SkipForward className="w-5 h-5" aria-hidden="true" />
              </Button>
            </div>

            {/* Speed controls */}
            <div className="flex items-center justify-center gap-3">
              <span className="text-[14px] text-muted-foreground">Hiz:</span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => changeSpeed(-1)}
                  disabled={playbackSpeed <= SPEED_OPTIONS[0]!}
                  aria-label="Hizi azalt"
                  className="w-[36px] h-[36px] rounded-lg bg-card border border-border text-foreground hover:bg-muted disabled:opacity-30 flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" aria-hidden="true" />
                </Button>
                <span className="text-[18px] font-bold text-foreground min-w-[50px] text-center" aria-live="polite">
                  {playbackSpeed}x
                </span>
                <Button
                  onClick={() => changeSpeed(1)}
                  disabled={playbackSpeed >= SPEED_OPTIONS[SPEED_OPTIONS.length - 1]!}
                  aria-label="Hizi artir"
                  className="w-[36px] h-[36px] rounded-lg bg-card border border-border text-foreground hover:bg-muted disabled:opacity-30 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

