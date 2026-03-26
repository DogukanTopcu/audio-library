"use client";

import { Mic, MicOff } from "lucide-react";

interface VoiceAssistantButtonProps {
  isListening: boolean;
  isSupported: boolean;
  lastTranscript: string;
  onToggle: () => void;
  showLabel?: boolean;
}

export function VoiceAssistantButton({
  isListening,
  isSupported,
  lastTranscript,
  onToggle,
  showLabel = false,
}: VoiceAssistantButtonProps) {
  if (!isSupported) return null;

  return (
    <div className="flex items-center gap-2">
      <div
        onClick={onToggle}
        aria-label={isListening ? "Sesli asistanı kapat" : "Sesli asistanı aç"}
        className={`relative flex items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          showLabel ? "gap-2 px-3 py-2" : "w-10 h-10"
        } ${
          isListening
            ? "bg-red-500/10 text-red-500 border-2 border-red-500/40 hover:bg-red-500/20"
            : "bg-muted text-muted-foreground border-2 border-border hover:bg-muted/80 hover:text-foreground"
        }`}
      >
        {/* Pulse animation when listening */}
        {isListening && (
          <span className="absolute inset-0 rounded-full animate-ping bg-red-500/20 pointer-events-none" />
        )}
        {isListening ? (
          <Mic className="w-5 h-5 relative z-10" aria-hidden="true" />
        ) : (
          <MicOff className="w-5 h-5" aria-hidden="true" />
        )}
        {showLabel && (
          <span className="text-sm font-medium relative z-10">
            {isListening ? "Dinliyor..." : "Sesli Asistan"}
          </span>
        )}
      </div>

      {/* Last transcript tooltip */}
      {isListening && lastTranscript && (
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded max-w-[200px] truncate">
          &ldquo;{lastTranscript}&rdquo;
        </span>
      )}
    </div>
  );
}
