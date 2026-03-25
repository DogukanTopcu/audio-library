"use client";

import { useNarrator } from "@/lib/narrator-context";
import { Volume2, VolumeX } from "lucide-react";

export function NarratorToggle() {
  const { isEnabled, toggleNarrator } = useNarrator();

  return (
    <button
      onClick={toggleNarrator}
      aria-label={isEnabled ? "Anlatici kapat" : "Anlatici ac"}
      title={isEnabled ? "Anlatici aktif" : "Anlatici deaktif"}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
        isEnabled
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {isEnabled ? (
        <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span>{isEnabled ? "Anlatici" : "Sessiz"}</span>
    </button>
  );
}


