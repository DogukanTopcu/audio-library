"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface NarratorContextType {
  isEnabled: boolean;
  toggleNarrator: () => void;
  speak: (text: string, rate?: number) => void;
  stop: () => void;
}

const NarratorContext = createContext<NarratorContextType | undefined>(undefined);

export function NarratorProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false);

  const speak = useCallback(
    (text: string, rate = 1) => {
      if (!isEnabled || !text) return;

      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.lang = "tr-TR";

      window.speechSynthesis.speak(utterance);
    },
    [isEnabled]
  );

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  const toggleNarrator = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  return (
    <NarratorContext.Provider value={{ isEnabled, toggleNarrator, speak, stop }}>
      {children}
    </NarratorContext.Provider>
  );
}

export function useNarrator() {
  const context = useContext(NarratorContext);
  if (!context) {
    throw new Error("useNarrator must be used within a NarratorProvider");
  }
  return context;
}

