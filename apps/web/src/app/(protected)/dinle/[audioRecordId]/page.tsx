"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Loader2,
  Keyboard,
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

interface AudioInfo {
  id: string;
  title: string;
  chapterTitle?: string;
  contentTitle?: string;
  previousId?: string | null;
  nextId?: string | null;
  signedUrl?: string;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function AudioPlayerPage() {
  const params = useParams();
  const audioRecordId = params.audioRecordId as string;

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressSaveInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showShortcuts, setShowShortcuts] = useState(false);

  /* ---- Fetch audio token & info ---- */
  const fetchAudio = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setIsPlaying(false);
      try {
        const { data } = await api.get(
          `/player/token?audioRecordId=${id}`
        );
        const result = data.data || data;
        setSignedUrl(result.signedUrl || result.url);
        setAudioInfo({
          id,
          title: result.title || "Ses Kaydi",
          chapterTitle: result.chapterTitle,
          contentTitle: result.contentTitle,
          previousId: result.previousId,
          nextId: result.nextId,
        });
      } catch {
        toast.error("Ses kaydi yuklenirken bir hata olustu.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (audioRecordId) {
      fetchAudio(audioRecordId);
    }
  }, [audioRecordId, fetchAudio]);

  /* ---- Save progress every 5 seconds ---- */
  useEffect(() => {
    if (isPlaying && audioRecordId) {
      progressSaveInterval.current = setInterval(() => {
        const audio = audioRef.current;
        if (audio) {
          api
            .patch("/player/progress", {
              audioRecordId,
              currentTime: Math.floor(audio.currentTime),
              duration: Math.floor(audio.duration || 0),
            })
            .catch(() => {
              /* silently fail */
            });
        }
      }, 5000);
    }

    return () => {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
    };
  }, [isPlaying, audioRecordId]);

  /* ---- Audio event handlers ---- */
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    // Auto-advance to next
    if (audioInfo?.nextId) {
      fetchAudio(audioInfo.nextId);
      // Update URL without full navigation
      window.history.pushState(null, "", `/dinle/${audioInfo.nextId}`);
    }
  };

  /* ---- Playback controls ---- */
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {
        toast.error("Ses oynatilirken bir hata olustu.");
      });
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const seek = useCallback((offset: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(
      0,
      Math.min(audio.duration || 0, audio.currentTime + offset)
    );
  }, []);

  const changeSpeed = useCallback(
    (direction: number) => {
      const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed);
      const newIndex = Math.max(
        0,
        Math.min(SPEED_OPTIONS.length - 1, currentIndex + direction)
      );
      const newSpeed = SPEED_OPTIONS[newIndex]!;
      setPlaybackSpeed(newSpeed);
      if (audioRef.current) {
        audioRef.current.playbackRate = newSpeed;
      }
    },
    [playbackSpeed]
  );

  const goToPrevious = useCallback(() => {
    if (audioInfo?.previousId) {
      fetchAudio(audioInfo.previousId);
      window.history.pushState(null, "", `/dinle/${audioInfo.previousId}`);
    }
  }, [audioInfo, fetchAudio]);

  const goToNext = useCallback(() => {
    if (audioInfo?.nextId) {
      fetchAudio(audioInfo.nextId);
      window.history.pushState(null, "", `/dinle/${audioInfo.nextId}`);
    }
  }, [audioInfo, fetchAudio]);

  const handleProgressClick = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    if ("clientX" in e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      audio.currentTime = ratio * duration;
    }
  };

  const handleProgressKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      seek(5);
    } else if (e.key === "ArrowLeft") {
      seek(-5);
    }
  };

  /* ---- Keyboard shortcuts ---- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

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
          goToPrevious();
          break;
        case "]":
          e.preventDefault();
          goToNext();
          break;
        case "+":
        case "=":
          e.preventDefault();
          changeSpeed(1);
          break;
        case "-":
          e.preventDefault();
          changeSpeed(-1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, seek, goToPrevious, goToNext, changeSpeed]);

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <div
        className="min-h-[80vh] flex items-center justify-center"
        role="status"
        aria-label="Ses kaydi yukleniyor"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2
            className="w-12 h-12 text-white animate-spin"
            aria-hidden="true"
          />
          <p className="text-[18px] text-[#a1a1aa]">Ses kaydi yukleniyor...</p>
        </div>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8">
      {/* Hidden audio element */}
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

      {/* Content info */}
      <div className="w-full max-w-2xl text-center mb-10">
        {audioInfo?.contentTitle && (
          <p className="text-[16px] text-[#52525b] mb-2">
            {audioInfo.contentTitle}
          </p>
        )}
        {audioInfo?.chapterTitle && (
          <p className="text-[18px] text-[#a1a1aa] mb-2">
            {audioInfo.chapterTitle}
          </p>
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          {audioInfo?.title || "Ses Kaydi"}
        </h1>
      </div>

      {/* Player controls */}
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-6">
          <div
            role="slider"
            tabIndex={0}
            aria-label="Ses ilerleme cubugu"
            aria-valuenow={Math.floor(currentTime)}
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration)}
            aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
            className="w-full h-3 bg-[#222222] rounded-full cursor-pointer relative group"
            onClick={handleProgressClick}
            onKeyDown={handleProgressKeyDown}
          >
            <div
              className="h-full bg-white rounded-full relative transition-all"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[18px] text-[#a1a1aa] font-mono">
              {formatTime(currentTime)}
            </span>
            <span className="text-[18px] text-[#a1a1aa] font-mono">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-center gap-6 mb-8">
          {/* Previous */}
          <Button
            onClick={goToPrevious}
            disabled={!audioInfo?.previousId}
            aria-label="Onceki kayit"
            className="w-[56px] h-[56px] rounded-full bg-[#0a0a0a] border border-[#222222] text-white hover:bg-[#111111] hover:border-[#333333] disabled:opacity-30 flex items-center justify-center"
          >
            <SkipBack className="w-6 h-6" aria-hidden="true" />
          </Button>

          {/* Rewind 10s */}
          <Button
            onClick={() => seek(-10)}
            aria-label="10 saniye geri"
            className="w-[48px] h-[48px] rounded-full bg-[#0a0a0a] border border-[#222222] text-white hover:bg-[#111111] hover:border-[#333333] flex items-center justify-center text-[14px] font-bold"
          >
            -10
          </Button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Duraklat" : "Oynat"}
            className="w-[80px] h-[80px] rounded-full bg-white text-black hover:bg-[#e4e4e7] transition-colors flex items-center justify-center shadow-lg"
          >
            {isPlaying ? (
              <Pause className="w-10 h-10" aria-hidden="true" />
            ) : (
              <Play className="w-10 h-10 ml-1" aria-hidden="true" />
            )}
          </button>

          {/* Forward 10s */}
          <Button
            onClick={() => seek(10)}
            aria-label="10 saniye ileri"
            className="w-[48px] h-[48px] rounded-full bg-[#0a0a0a] border border-[#222222] text-white hover:bg-[#111111] hover:border-[#333333] flex items-center justify-center text-[14px] font-bold"
          >
            +10
          </Button>

          {/* Next */}
          <Button
            onClick={goToNext}
            disabled={!audioInfo?.nextId}
            aria-label="Sonraki kayit"
            className="w-[56px] h-[56px] rounded-full bg-[#0a0a0a] border border-[#222222] text-white hover:bg-[#111111] hover:border-[#333333] disabled:opacity-30 flex items-center justify-center"
          >
            <SkipForward className="w-6 h-6" aria-hidden="true" />
          </Button>
        </div>

        {/* Speed controls */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className="text-[16px] text-[#52525b]">Hiz:</span>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => changeSpeed(-1)}
              aria-label="Hizi azalt"
              disabled={playbackSpeed <= SPEED_OPTIONS[0]!}
              className="w-[48px] h-[48px] rounded-lg bg-[#0a0a0a] border border-[#222222] text-white hover:bg-[#111111] disabled:opacity-30 flex items-center justify-center"
            >
              <Minus className="w-5 h-5" aria-hidden="true" />
            </Button>
            <span
              className="text-[20px] font-bold text-white min-w-[60px] text-center"
              aria-live="polite"
              aria-label={`Oynatma hizi: ${playbackSpeed} kat`}
            >
              {playbackSpeed}x
            </span>
            <Button
              onClick={() => changeSpeed(1)}
              aria-label="Hizi artir"
              disabled={playbackSpeed >= SPEED_OPTIONS[SPEED_OPTIONS.length - 1]!}
              className="w-[48px] h-[48px] rounded-lg bg-[#0a0a0a] border border-[#222222] text-white hover:bg-[#111111] disabled:opacity-30 flex items-center justify-center"
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Speed preset buttons */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              onClick={() => {
                setPlaybackSpeed(speed);
                if (audioRef.current) {
                  audioRef.current.playbackRate = speed;
                }
              }}
              aria-label={`Oynatma hizini ${speed} kat olarak ayarla`}
              aria-pressed={playbackSpeed === speed}
              className={`px-4 py-2 rounded-lg text-[16px] font-medium transition-colors min-h-[48px] ${
                playbackSpeed === speed
                  ? "bg-white text-black"
                  : "bg-[#0a0a0a] border border-[#222222] text-[#a1a1aa] hover:text-white hover:border-[#333333]"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Keyboard shortcuts */}
        <div className="text-center">
          <Button
            onClick={() => setShowShortcuts(!showShortcuts)}
            aria-expanded={showShortcuts}
            aria-label="Klavye kisayollarini goster"
            className="inline-flex items-center gap-2 px-4 py-2 text-[16px] text-[#a1a1aa] hover:text-white bg-transparent border-none min-h-[48px]"
          >
            <Keyboard className="w-5 h-5" aria-hidden="true" />
            Klavye Kisayollari
          </Button>

          {showShortcuts && (
            <div className="mt-4 bg-[#0a0a0a] border border-[#222222] rounded-xl p-6 text-left">
              <h2 className="text-[18px] font-semibold text-white mb-4">
                Klavye Kisayollari
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "Bosluk", action: "Oynat / Duraklat" },
                  { key: "Sol Ok", action: "10 saniye geri" },
                  { key: "Sag Ok", action: "10 saniye ileri" },
                  { key: "[", action: "Onceki kayit" },
                  { key: "]", action: "Sonraki kayit" },
                  { key: "+", action: "Hizi artir" },
                  { key: "-", action: "Hizi azalt" },
                ].map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center gap-3"
                  >
                    <kbd className="inline-flex items-center justify-center min-w-[40px] h-[36px] px-3 bg-[#111111] border border-[#333333] rounded text-[14px] font-mono text-white">
                      {shortcut.key}
                    </kbd>
                    <span className="text-[16px] text-[#a1a1aa]">
                      {shortcut.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
