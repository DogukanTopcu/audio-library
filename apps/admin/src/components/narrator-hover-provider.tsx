"use client";

import { useNarrator } from "@/lib/narrator-context";
import { useEffect, useRef } from "react";

export function NarratorHoverProvider() {
  const { speak, stop, isEnabled } = useNarrator();
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);
  const currentTarget = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      stop();
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
      }
      return;
    }

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Skip certain elements
      if (
        target.tagName === "SCRIPT" ||
        target.tagName === "STYLE" ||
        target.classList.contains("no-narrate") ||
        !target.textContent?.trim()
      ) {
        return;
      }

      currentTarget.current = target;
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
      }

      // Add a small delay to avoid triggering speech immediately when quickly moving over elements
      hoverTimer.current = setTimeout(() => {
        if (currentTarget.current === target) {
          const text = target.textContent?.trim();
          if (text && text.length > 0 && text.length < 500) {
            speak(text);
          }
        }
      }, 300); // 300ms delay before speaking
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (currentTarget.current === target) {
        currentTarget.current = null;
        if (hoverTimer.current) {
          clearTimeout(hoverTimer.current);
        }
        stop();
      }
    };

    document.addEventListener("mouseenter", handleMouseEnter, true);
    document.addEventListener("mouseleave", handleMouseLeave, true);

    return () => {
      document.removeEventListener("mouseenter", handleMouseEnter, true);
      document.removeEventListener("mouseleave", handleMouseLeave, true);
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
      }
    };
  }, [isEnabled, speak, stop]);

  return null;
}
