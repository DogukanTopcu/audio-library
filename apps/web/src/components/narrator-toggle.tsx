"use client";

import { useNarrator } from "@/lib/narrator-context";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

export function NarratorToggle() {
  const { isEnabled, toggleNarrator } = useNarrator();

  return (
    <Button
      onClick={toggleNarrator}
      aria-label={isEnabled ? "Anlatici kapat" : "Anlatici ac"}
      title={isEnabled ? "Anlatici aktif" : "Anlatici deaktif"}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[16px] font-medium min-h-[48px] transition-colors ${
        isEnabled
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent border-none"
      }`}
    >
      {isEnabled ? (
        <Volume2 className="w-5 h-5" aria-hidden="true" />
      ) : (
        <VolumeX className="w-5 h-5" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{isEnabled ? "Anlatici" : "Sessiz"}</span>
    </Button>
  );
}

