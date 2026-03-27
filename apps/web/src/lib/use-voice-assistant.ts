"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import api from "./api";

export interface VoiceCommand {
  /** Keywords that trigger this command (lowercased, trimmed). Any match fires the action. */
  keywords: string[];
  action: () => void;
}

interface UseVoiceAssistantOptions {
  commands: VoiceCommand[];
  /** Whether the assistant is enabled by default */
  enabled?: boolean;
}

interface UseVoiceAssistantReturn {
  isListening: boolean;
  isSupported: boolean;
  lastTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

/** Interval (ms) between sending audio chunks to Google Cloud Speech API */
const CHUNK_INTERVAL = 3000;

/**
 * Voice assistant hook that uses Google Cloud Speech-to-Text API via the
 * backend (`POST /api/speech/recognize`).  Always recognises Turkish (tr-TR).
 *
 * Audio is captured with MediaRecorder, sent every ~3 s to the backend which
 * forwards it to the Google Cloud Speech-to-Text service and returns the
 * transcript.
 */
export function useVoiceAssistant({
  commands,
  enabled = false,
}: UseVoiceAssistantOptions): UseVoiceAssistantReturn {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [isSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      typeof navigator.mediaDevices !== "undefined" &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      typeof MediaRecorder !== "undefined"
    );
  });

  const commandsRef = useRef(commands);
  const shouldListenRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isUploadingRef = useRef(false);

  // Keep commands ref fresh
  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  /** Pick the best supported MIME type for recording */
  const getMimeType = useCallback((): string => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return "audio/webm"; // fallback
  }, []);

  /** Send accumulated audio to the backend for recognition */
  const sendAudioForRecognition = useCallback(async (blob: Blob) => {
    if (blob.size < 1000 || isUploadingRef.current) return; // skip near-empty or overlapping clips

    isUploadingRef.current = true;
    try {
      const formData = new FormData();
      const extension = getAudioExtension(blob.type);
      formData.append("audio", blob, `voice.${extension}`);

      const { data } = await api.post("/speech/recognize", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result = data?.data ?? data;     // handle wrapped responses
      const transcript: string = result?.transcript ?? "";
      const alternatives: string[] = result?.alternatives ?? [];

      if (!transcript) return;

      setLastTranscript(transcript);

      // Try to match a command using transcript and all alternatives
      const textsToTry = [transcript, ...alternatives];
      for (const text of textsToTry) {
        const matched = matchCommand(text, commandsRef.current);
        if (matched) {
          matched.action();
          return;
        }
      }
    } catch (err) {
      const serverMessage =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof err.response === "object" &&
        err.response !== null &&
        "data" in err.response &&
        typeof err.response.data === "object" &&
        err.response.data !== null &&
        "message" in err.response.data
          ? String(err.response.data.message)
          : null;

      console.warn(
        "[VoiceAssistant] recognition request failed:",
        serverMessage ?? err,
      );
    } finally {
      isUploadingRef.current = false;
    }
  }, []);

  /** Start the record-send cycle */
  const startRecordingCycle = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = getMimeType();

      // Cycle: record for CHUNK_INTERVAL → stop → send → restart
      const recordChunk = () => {
        if (!shouldListenRef.current || !streamRef.current) return;

        chunksRef.current = [];
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          if (chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            sendAudioForRecognition(blob);
          }
          // Start next chunk if still listening
          if (shouldListenRef.current) {
            recordChunk();
          }
        };

        recorder.start();
        // Stop after CHUNK_INTERVAL so onstop fires → sends → restarts
        intervalRef.current = setTimeout(() => {
          if (recorder.state === "recording") {
            recorder.stop();
          }
        }, CHUNK_INTERVAL);
      };

      recordChunk();
    } catch (err) {
      console.error("[VoiceAssistant] microphone access denied:", err);
      shouldListenRef.current = false;
      setIsListening(false);
    }
  }, [getMimeType, sendAudioForRecognition]);

  /** Clean up recording resources */
  const stopRecording = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) return;
    shouldListenRef.current = true;
    setIsListening(true);
    startRecordingCycle();
  }, [isSupported, startRecordingCycle]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    stopRecording();
    setIsListening(false);
  }, [stopRecording]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Auto start/stop when `enabled` prop changes
  useEffect(() => {
    if (!isSupported) return;
    if (enabled && !shouldListenRef.current) {
      startListening();
    } else if (!enabled && shouldListenRef.current) {
      stopListening();
    }
  }, [enabled, isSupported, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isListening,
    isSupported,
    lastTranscript,
    startListening,
    stopListening,
    toggleListening,
  };
}

/* ------------------------------------------------------------------ */
/*  Command matching logic                                              */
/* ------------------------------------------------------------------ */
function matchCommand(
  transcript: string,
  commands: VoiceCommand[],
): VoiceCommand | null {
  const normalized = normalizeTurkish(transcript);

  for (const cmd of commands) {
    for (const keyword of cmd.keywords) {
      const normalizedKeyword = normalizeTurkish(keyword);
      if (normalized == normalizedKeyword) return cmd;
      /*if (
        normalized.includes(normalizedKeyword) ||
        normalizedKeyword.includes(normalized)
      ) {
        return cmd;
      }*/
    }
  }
  return null;
}

function normalizeTurkish(text: string): string {
  return text
    .toLowerCase()
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .trim();
}

function getAudioExtension(mimeType: string): string {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("flac")) return "flac";
  return "webm";
}

