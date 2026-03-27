"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2,
  ArrowLeft,
  Plus,
  GripVertical,
  Trash2,
  AudioLines,
  X,
} from "lucide-react";

const audioTypeLabels: Record<string, string> = {
  TOPIC_INTRO: "Konu Anlatımı",
  QUESTION: "Soru",
  EXPLANATION: "Açıklama",
  STORY_PASSAGE: "Hikaye / Parça",
  OTHER: "Diğer",
};

interface AudioRecord {
  id: string;
  title: string;
  type: string;
  durationSeconds?: number;
  bucketKey?: string;
  orderIndex: number;
}

type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

export default function ChapterAudioPage() {
  const params = useParams();
  const contentId = params.id as string;
  const chapterId = params.chapterId as string;

  const [audios, setAudios] = useState<AudioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioTitle, setAudioTitle] = useState("");
  const [audioType, setAudioType] = useState("TOPIC_INTRO");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const fetchAudios = useCallback(async () => {
    try {
      const res = await api.get("/admin/audio-records", { params: { chapterId } });
      const payload = res.data?.data ?? res.data;
      const items: AudioRecord[] = Array.isArray(payload) ? payload : payload.items || [];
      setAudios(items.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)));
    } catch {
      toast.error("Ses kayıtları yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    fetchAudios();
  }, [fetchAudios]);

  const handleUpload = async () => {
    if (!audioFile || !audioTitle.trim()) return;
    setUploading(true);
    try {
      // Step 1: Upload file to GCP
      const formData = new FormData();
      formData.append("file", audioFile);
      const uploadRes = await api.post(
        `/upload/audio?contentId=${contentId}&chapterId=${chapterId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const uploadData = uploadRes.data?.data ?? uploadRes.data;

      // Step 2: Create audio record with bucketKey
      await api.post("/admin/audio-records", {
        chapterId,
        title: audioTitle,
        type: audioType,
        bucketKey: uploadData.key,
        durationSeconds: uploadData.durationSeconds || 0,
        orderIndex: audios.length,
      });

      toast.success("Ses kaydı eklendi");
      setShowForm(false);
      setAudioFile(null);
      setAudioTitle("");
      setAudioType("TOPIC_INTRO");
      fetchAudios();
    } catch (err: unknown) {
      const msg = (err as ApiErrorLike)?.response?.data?.message || "Yükleme başarısız";
      toast.error(typeof msg === "string" ? msg : "Yükleme başarısız");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu ses kaydını silmek istediğinizden emin misiniz?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/audio-records/${id}`);
      toast.success("Ses kaydı silindi");
      setAudios((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error("Silme başarısız");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    setAudios((prev) => {
      const items = [...prev];
      const dragIdx = items.findIndex((a) => a.id === draggedId);
      const targetIdx = items.findIndex((a) => a.id === targetId);
      if (dragIdx === -1 || targetIdx === -1) return prev;

      const [dragged] = items.splice(dragIdx, 1);
      items.splice(targetIdx, 0, dragged);
      return items;
    });
  };

  const handleDragEnd = async () => {
    if (!draggedId) return;
    setDraggedId(null);

    // Reorder each item individually via the existing endpoint
    try {
      await Promise.all(
        audios.map((audio, index) =>
          api.patch(`/admin/audio-records/${audio.id}/reorder`, { orderIndex: index })
        ),
      );
      toast.success("Sıralama güncellendi");
    } catch {
      toast.error("Sıralama güncellenemedi");
      fetchAudios();
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/icerikler/${contentId}`}
          className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Ses Kayıtları</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">
            Kayıtlar ({audios.length})
          </h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Ses Kaydı Ekle
          </button>
        </div>

        {/* Upload form */}
        {showForm && (
          <div className="mb-4 rounded-lg border border-border bg-muted p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground">Yeni Ses Kaydı</h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setAudioFile(null);
                  setAudioTitle("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              type="text"
              value={audioTitle}
              onChange={(e) => setAudioTitle(e.target.value)}
              placeholder="Başlık"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-ring"
            />

            <select
              value={audioType}
              onChange={(e) => setAudioType(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
            >
              <option value="TOPIC_INTRO">Konu Anlatımı</option>
              <option value="QUESTION">Soru</option>
              <option value="EXPLANATION">Açıklama</option>
              <option value="STORY_PASSAGE">Hikaye / Parça</option>
              <option value="OTHER">Diğer</option>
            </select>

            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-xs file:text-muted-foreground file:cursor-pointer"
            />

            <div className="flex justify-end">
              <button
                onClick={handleUpload}
                disabled={uploading || !audioFile || !audioTitle.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {uploading && <Loader2 className="h-3 w-3 animate-spin" />}
                Yükle
              </button>
            </div>
          </div>
        )}

        {/* Audio list */}
        {audios.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Henüz ses kaydı eklenmemiş
          </p>
        ) : (
          <div className="space-y-1">
            {audios.map((audio) => (
              <div
                key={audio.id}
                draggable
                onDragStart={() => handleDragStart(audio.id)}
                onDragOver={(e) => handleDragOver(e, audio.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted cursor-grab active:cursor-grabbing",
                  draggedId === audio.id && "opacity-50 bg-muted"
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <AudioLines className="h-4 w-4 text-violet-600 flex-shrink-0" />
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {audioTypeLabels[audio.type] || audio.type}
                </span>
                <span className="flex-1 text-sm text-foreground">{audio.title}</span>
                <span className="text-xs text-muted-foreground">{formatDuration(audio.durationSeconds)}</span>
                <button
                  onClick={() => handleDelete(audio.id)}
                  disabled={deletingId === audio.id}
                  className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  {deletingId === audio.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
