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

interface AudioRecord {
  id: string;
  title: string;
  type: string;
  duration?: number;
  fileUrl?: string;
  order: number;
}

export default function ChapterAudioPage() {
  const params = useParams();
  const contentId = params.id as string;
  const chapterId = params.chapterId as string;

  const [audios, setAudios] = useState<AudioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioTitle, setAudioTitle] = useState("");
  const [audioType, setAudioType] = useState("RECORDING");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const fetchAudios = useCallback(async () => {
    try {
      const res = await api.get("/admin/audio-records", { params: { chapterId } });
      const data = res.data.data || res.data;
      const items: AudioRecord[] = Array.isArray(data) ? data : data.items || [];
      setAudios(items.sort((a, b) => a.order - b.order));
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
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("title", audioTitle);
      formData.append("type", audioType);
      formData.append("chapterId", chapterId);

      await api.post("/admin/audio-records", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Ses kaydı eklendi");
      setShowForm(false);
      setAudioFile(null);
      setAudioTitle("");
      setAudioType("RECORDING");
      fetchAudios();
    } catch {
      toast.error("Yükleme başarısız");
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

    try {
      const orderedIds = audios.map((a) => a.id);
      await api.patch("/admin/audio-records/reorder", {
        chapterId,
        orderedIds,
      });
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

  const typeBadgeColor = (type: string) => {
    switch (type) {
      case "RECORDING":
        return "bg-blue-900/30 text-blue-400";
      case "MUSIC":
        return "bg-purple-900/30 text-purple-400";
      case "NARRATION":
        return "bg-green-900/30 text-green-400";
      default:
        return "bg-zinc-800 text-zinc-400";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/icerikler/${contentId}`}
          className="rounded-lg border border-[#222] p-2 text-zinc-400 transition-colors hover:bg-[#111] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-white">Ses Kayıtları</h1>
      </div>

      <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">
            Kayıtlar ({audios.length})
          </h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-zinc-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Ses Kaydı Ekle
          </button>
        </div>

        {/* Upload form */}
        {showForm && (
          <div className="mb-4 rounded-lg border border-[#222] bg-[#111] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-300">Yeni Ses Kaydı</h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setAudioFile(null);
                  setAudioTitle("");
                }}
                className="text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              type="text"
              value={audioTitle}
              onChange={(e) => setAudioTitle(e.target.value)}
              placeholder="Başlık"
              className="w-full rounded-lg border border-[#222] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-white"
            />

            <select
              value={audioType}
              onChange={(e) => setAudioType(e.target.value)}
              className="w-full rounded-lg border border-[#222] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-white"
            >
              <option value="RECORDING">Kayıt</option>
              <option value="MUSIC">Müzik</option>
              <option value="NARRATION">Anlatım</option>
            </select>

            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border file:border-[#222] file:bg-[#0a0a0a] file:px-3 file:py-1.5 file:text-xs file:text-zinc-300 file:cursor-pointer"
            />

            <div className="flex justify-end">
              <button
                onClick={handleUpload}
                disabled={uploading || !audioFile || !audioTitle.trim()}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
              >
                {uploading && <Loader2 className="h-3 w-3 animate-spin" />}
                Yükle
              </button>
            </div>
          </div>
        )}

        {/* Audio list */}
        {audios.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#111] cursor-grab active:cursor-grabbing",
                  draggedId === audio.id && "opacity-50 bg-[#111]"
                )}
              >
                <GripVertical className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                <AudioLines className="h-4 w-4 text-purple-400 flex-shrink-0" />
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    typeBadgeColor(audio.type)
                  )}
                >
                  {audio.type}
                </span>
                <span className="flex-1 text-sm text-white">{audio.title}</span>
                <span className="text-xs text-zinc-500">{formatDuration(audio.duration)}</span>
                <button
                  onClick={() => handleDelete(audio.id)}
                  disabled={deletingId === audio.id}
                  className="rounded p-1 text-zinc-500 hover:text-red-400 disabled:opacity-50"
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
