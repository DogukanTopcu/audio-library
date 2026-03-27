"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2,
  ArrowLeft,
  Save,
  Plus,
  ChevronRight,
  ChevronDown,
  AudioLines,
  FolderOpen,
  X,
  Trash2,
  Tags,
} from "lucide-react";

const contentSchema = z.object({
  title: z.string().min(1, "Başlık gereklidir"),
  type: z.string().min(1, "Tür seçiniz"),
  description: z.string().optional(),
  author: z.string().optional(),
  publisher: z.string().optional(),
});

type ContentForm = z.infer<typeof contentSchema>;

interface ContentData {
  id: string;
  title: string;
  type: string;
  description?: string;
  author?: string;
  publisher?: string;
  coverImageKey?: string;
  isActive: boolean;
  createdAt: string;
  categoryIds?: string[];
}

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: CategoryNode[];
}

interface Chapter {
  id: string;
  title: string;
  parentId: string | null;
  orderIndex: number;
  children?: Chapter[];
}

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
      message?: string | string[];
    };
  };
};

function getApiErrorMessage(error: unknown) {
  const message = (error as ApiErrorLike)?.response?.data?.message;
  if (Array.isArray(message)) {
    return message.find((item) => typeof item === "string" && item.trim().length > 0) ?? null;
  }

  return typeof message === "string" && message.trim().length > 0
    ? message
    : null;
}

const audioTypeLabels: Record<string, string> = {
  TOPIC_INTRO: "Konu Anlatımı",
  QUESTION: "Soru",
  EXPLANATION: "Açıklama",
  STORY_PASSAGE: "Hikaye / Parça",
  OTHER: "Diğer",
};

function normalizeCategoryKey(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function isLessonsRoot(category: CategoryNode) {
  const slugKey = normalizeCategoryKey(category.slug);
  const nameKey = normalizeCategoryKey(category.name);
  return slugKey === "lessons" || nameKey === "lessons" || nameKey === "dersler";
}

function isClassRoot(category: CategoryNode) {
  const slugKey = normalizeCategoryKey(category.slug);
  const nameKey = normalizeCategoryKey(category.name);
  return slugKey === "class" || nameKey === "class" || nameKey === "sinif";
}

export default function ContentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [content, setContent] = useState<ContentData | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [chapterAudios, setChapterAudios] = useState<Record<string, AudioRecord[]>>({});
  const [loadingAudios, setLoadingAudios] = useState<Set<string>>(new Set());

  // New chapter form
  const [showNewChapter, setShowNewChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterParentId, setNewChapterParentId] = useState<string | null>(null);
  const [creatingChapter, setCreatingChapter] = useState(false);
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null);

  // Audio modal
  const [audioModal, setAudioModal] = useState<{ chapterId: string } | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioTitle, setAudioTitle] = useState("");
  const [audioType, setAudioType] = useState("TOPIC_INTRO");
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [deletingAudioId, setDeletingAudioId] = useState<string | null>(null);

  // Categories - one selection per root category
  const [allCategories, setAllCategories] = useState<CategoryNode[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [savingCategories, setSavingCategories] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContentForm>({
    resolver: zodResolver(contentSchema),
  });

  const lessonsRoot = useMemo(
    () => allCategories.find(isLessonsRoot) ?? null,
    [allCategories],
  );
  const classRoot = useMemo(
    () => allCategories.find(isClassRoot) ?? null,
    [allCategories],
  );
  const classCategories = useMemo(() => classRoot?.children ?? [], [classRoot]);
  const lessonCategories = useMemo(() => lessonsRoot?.children ?? [], [lessonsRoot]);

  const fetchContent = useCallback(async () => {
    try {
      const res = await api.get(`/admin/content/${id}`);
      const data = res.data?.data ?? res.data;
      setContent(data);

      // Determine current class + lessons from categoryIds
      const catIds: string[] = data.categoryIds || [];
      const foundClass = classCategories.find((category) => catIds.includes(category.id))?.id ?? "";
      const foundLesson = lessonCategories.find((category) => catIds.includes(category.id))?.id ?? "";
      setSelectedClassId(foundClass);
      setSelectedLessonId(foundLesson);

      reset({
        title: data.title,
        type: data.type,
        description: data.description || "",
        author: data.author || "",
        publisher: data.publisher || "",
      });
    } catch {
      toast.error("İçerik yüklenemedi");
    }
  }, [id, reset, classCategories, lessonCategories]);

  // Fetch all categories
  useEffect(() => {
    api.get("/admin/categories").then((res) => {
      const cats = res.data?.data ?? res.data ?? [];
      setAllCategories(Array.isArray(cats) ? cats : []);
    }).catch(() => {});
  }, []);

  const fetchChapters = useCallback(async () => {
    try {
      const res = await api.get(`/admin/chapters`, { params: { contentId: id } });
      const payload = res.data?.data ?? res.data;
      // API already returns a tree structure - use directly
      setChapters(Array.isArray(payload) ? payload : payload.items || []);
    } catch {
      toast.error("Bölümler yüklenemedi");
    }
  }, [id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchContent(), fetchChapters()]);
      setLoading(false);
    };
    load();
  }, [fetchContent, fetchChapters]);

  const onSubmit = async (data: ContentForm) => {
    setSaving(true);
    try {
      await api.patch(`/admin/content/${id}`, data);
      toast.success("İçerik güncellendi");
      fetchContent();
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setSaving(false);
    }
  };

  // Save categories (one per root)
  const saveCategories = async () => {
    setSavingCategories(true);
    try {
      const categoryIds = Array.from(
        new Set([selectedClassId, selectedLessonId].filter(Boolean)),
      );
      await api.post(`/admin/content/${id}/categories`, { categoryIds });
      toast.success("Kategoriler güncellendi");
      fetchContent();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error) ?? "Kategori güncellemesi başarısız");
    } finally {
      setSavingCategories(false);
    }
  };

  const toggleChapter = async (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
      // Load audios if not loaded
      if (!chapterAudios[chapterId]) {
        setLoadingAudios((prev) => new Set(prev).add(chapterId));
        try {
          const res = await api.get(`/admin/audio-records`, { params: { chapterId } });
          const payload = res.data?.data ?? res.data;
          setChapterAudios((prev) => ({
            ...prev,
            [chapterId]: Array.isArray(payload) ? payload : payload.items || [],
          }));
        } catch {
          toast.error("Ses kayıtları yüklenemedi");
        } finally {
          setLoadingAudios((prev) => {
            const s = new Set(prev);
            s.delete(chapterId);
            return s;
          });
        }
      }
    }
    setExpandedChapters(newExpanded);
  };

  const handleCreateChapter = async () => {
    if (!newChapterTitle.trim()) return;
    setCreatingChapter(true);
    try {
      await api.post("/admin/chapters", {
        title: newChapterTitle,
        contentId: id,
        parentId: newChapterParentId || undefined,
      });
      toast.success("Bölüm oluşturuldu");
      setNewChapterTitle("");
      setNewChapterParentId(null);
      setShowNewChapter(false);
      fetchChapters();
    } catch (err: unknown) {
      const msg = (err as ApiErrorLike)?.response?.data?.message;
      toast.error(typeof msg === "string" ? msg : "Bölüm oluşturulamadı");
    } finally {
      setCreatingChapter(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bu bölümü silmek istediğinizden emin misiniz? Alt bölümler ve ses kayıtları da silinecektir.")) return;
    setDeletingChapterId(chapterId);
    try {
      await api.delete(`/admin/chapters/${chapterId}`);
      toast.success("Bölüm silindi");
      // Clear audios cache for this chapter
      setChapterAudios((prev) => {
        const next = { ...prev };
        delete next[chapterId];
        return next;
      });
      fetchChapters();
    } catch (err: unknown) {
      const msg = (err as ApiErrorLike)?.response?.data?.message;
      toast.error(typeof msg === "string" ? msg : "Bölüm silinemedi");
    } finally {
      setDeletingChapterId(null);
    }
  };

  const handleUploadAudio = async () => {
    if (!audioModal || !audioFile || !audioTitle.trim()) return;
    setUploadingAudio(true);
    try {
      // Step 1: Upload file to GCP via upload endpoint
      const formData = new FormData();
      formData.append("file", audioFile);
      const uploadRes = await api.post(
        `/upload/audio?contentId=${id}&chapterId=${audioModal.chapterId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const uploadData = uploadRes.data?.data ?? uploadRes.data;

      // Step 2: Create audio record with the bucketKey
      await api.post("/admin/audio-records", {
        chapterId: audioModal.chapterId,
        title: audioTitle,
        type: audioType,
        bucketKey: uploadData.key || `audio/${id}/${audioModal.chapterId}/fallback.mp3`,
        durationSeconds: uploadData.durationSeconds || 0,
      });

      toast.success("Ses kaydı eklendi");

      // Refresh audios for this chapter
      const res = await api.get(`/admin/audio-records`, {
        params: { chapterId: audioModal.chapterId },
      });
      const payload = res.data?.data ?? res.data;
      setChapterAudios((prev) => ({
        ...prev,
        [audioModal.chapterId]: Array.isArray(payload) ? payload : payload.items || [],
      }));

      setAudioModal(null);
      setAudioFile(null);
      setAudioTitle("");
      setAudioType("TOPIC_INTRO");
    } catch (err: unknown) {
      const msg = (err as ApiErrorLike)?.response?.data?.message || "Ses kaydı yüklenemedi";
      toast.error(typeof msg === "string" ? msg : "Ses kaydı yüklenemedi");
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleDeleteAudio = async (chapterId: string, audioId: string) => {
    if (!confirm("Bu ses kaydını silmek istediğinizden emin misiniz?")) return;
    setDeletingAudioId(audioId);
    try {
      await api.delete(`/admin/audio-records/${audioId}`);
      toast.success("Ses kaydı silindi");
      setChapterAudios((prev) => ({
        ...prev,
        [chapterId]: (prev[chapterId] || []).filter((a) => a.id !== audioId),
      }));
    } catch (err: unknown) {
      const msg = (err as ApiErrorLike)?.response?.data?.message;
      toast.error(typeof msg === "string" ? msg : "Ses kaydı silinemedi");
    } finally {
      setDeletingAudioId(null);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // NOTE: API already returns a tree, so we use chapters directly (no buildTree)
  const renderChapterTree = (chapterList: Chapter[], depth = 0) => {
    return chapterList.map((chapter) => {
      const isExpanded = expandedChapters.has(chapter.id);
      const audios = chapterAudios[chapter.id] || [];
      const isLoadingAudio = loadingAudios.has(chapter.id);
      const hasChildren = chapter.children && chapter.children.length > 0;

      return (
        <div key={chapter.id} style={{ marginLeft: depth * 20 }}>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted transition-colors group">
            <button
              onClick={() => toggleChapter(chapter.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm text-foreground">{chapter.title}</span>
            {hasChildren && (
              <span className="text-xs text-muted-foreground">{chapter.children!.length} alt bölüm</span>
            )}
            <button
              onClick={() => {
                setNewChapterParentId(chapter.id);
                setShowNewChapter(true);
              }}
              className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-foreground"
              title="Alt bölüm ekle"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setAudioModal({ chapterId: chapter.id })}
              className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-foreground"
              title="Ses kaydı ekle"
            >
              <AudioLines className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => handleDeleteChapter(chapter.id, e)}
              disabled={deletingChapterId === chapter.id}
              className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-red-600 disabled:opacity-50"
              title="Bölümü sil"
            >
              {deletingChapterId === chapter.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {isExpanded && (
            <div className="ml-2 border-l border-border">
              {isLoadingAudio ? (
                <div className="flex items-center gap-2 px-6 py-2">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Yükleniyor...</span>
                </div>
              ) : (
                <>
                  {audios.map((audio) => (
                    <div
                      key={audio.id}
                      className="flex items-center gap-3 px-8 py-1.5 group/audio hover:bg-muted/50 rounded"
                    >
                      <AudioLines className="h-3 w-3 text-violet-600" />
                      <span className="text-xs text-foreground flex-1">{audio.title}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {audioTypeLabels[audio.type] || audio.type}
                      </span>
                      {audio.durationSeconds ? (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatDuration(audio.durationSeconds)}
                        </span>
                      ) : null}
                      <button
                        onClick={() => handleDeleteAudio(chapter.id, audio.id)}
                        disabled={deletingAudioId === audio.id}
                        className="opacity-0 group-hover/audio:opacity-100 rounded p-0.5 text-muted-foreground hover:text-red-600 disabled:opacity-50"
                        title="Ses kaydını sil"
                      >
                        {deletingAudioId === audio.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  ))}
                </>
              )}
              {chapter.children && renderChapterTree(chapter.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">İçerik bulunamadı</p>
        <Link href="/icerikler" className="mt-4 inline-block text-sm text-foreground hover:underline">
          Geri dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/icerikler"
          className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">{content.title}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: Metadata Form (40%) */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 rounded-xl border border-border bg-card p-5"
          >
            <h2 className="text-sm font-semibold text-foreground">İçerik Bilgileri</h2>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">Başlık</label>
              <input
                type="text"
                className={cn(
                  "w-full rounded-lg border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-ring",
                  errors.title ? "border-red-500" : "border-border"
                )}
                {...register("title")}
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">Tür</label>
              <select
                className={cn(
                  "w-full rounded-lg border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-ring",
                  errors.type ? "border-red-500" : "border-border"
                )}
                {...register("type")}
              >
                <option value="TEXTBOOK">Ders Kitabı</option>
                <option value="NOVEL">Roman</option>
                <option value="PRACTICE_TEST">Deneme Sınavı</option>
                <option value="QUESTION_BANK">Soru Bankası</option>
                <option value="OTHER">Diğer</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">Açıklama</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-ring resize-none"
                {...register("description")}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">Yazar</label>
              <input
                type="text"
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                {...register("author")}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">Yayınevi</label>
              <input
                type="text"
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                {...register("publisher")}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </button>
          </form>

          <div className="mt-4 space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Kategoriler</h2>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Sınıf
                </p>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                >
                  <option value="">Sınıf seçiniz...</option>
                  {classCategories.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Ders
                  </p>
                  {selectedLessonId && (
                    <button
                      type="button"
                      onClick={() => setSelectedLessonId("")}
                      className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Temizle
                    </button>
                  )}
                </div>

                {lessonCategories.length > 0 ? (
                  <select
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                  >
                    <option value="">Ders seçiniz...</option>
                    {lessonCategories.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                    Lessons altında ders kategorisi bulunamadı.
                  </p>
                )}

                <p className="text-[11px] text-muted-foreground">
                  Her ana kategori altında yalnızca 1 seçim yapılabilir.
                </p>
              </div>

              {(selectedClassId || selectedLessonId) && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Seçili:</span>
                  {selectedClassId && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                      {classCategories.find((item) => item.id === selectedClassId)?.name}
                    </span>
                  )}
                  {selectedLessonId && (
                    <span
                      className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary"
                    >
                      {lessonCategories.find((item) => item.id === selectedLessonId)?.name}
                    </span>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={saveCategories}
                disabled={savingCategories}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {savingCategories ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tags className="h-4 w-4" />}
                Kategorileri Kaydet
              </button>
          </div>
        </div>

        {/* Right: Chapter Tree (60%) */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Bölümler</h2>
              <button
                onClick={() => {
                  setNewChapterParentId(null);
                  setShowNewChapter(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
              >
                <Plus className="h-3.5 w-3.5" />
                Yeni Bölüm Ekle
              </button>
            </div>

            {/* New chapter inline form */}
            {showNewChapter && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted p-3">
                <input
                  type="text"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder={newChapterParentId ? "Alt bölüm adı" : "Bölüm adı"}
                  className="flex-1 rounded border border-input bg-card px-3 py-1.5 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-ring"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateChapter()}
                />
                {newChapterParentId && (
                  <span className="text-xs text-muted-foreground">Alt bölüm</span>
                )}
                <button
                  onClick={handleCreateChapter}
                  disabled={creatingChapter || !newChapterTitle.trim()}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {creatingChapter ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ekle"}
                </button>
                <button
                  onClick={() => {
                    setShowNewChapter(false);
                    setNewChapterTitle("");
                    setNewChapterParentId(null);
                  }}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {chapters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Henüz bölüm eklenmemiş
              </p>
            ) : (
              <div className="space-y-0.5">{renderChapterTree(chapters)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Audio Upload Modal */}
      {audioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/15 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Ses Kaydı Ekle</h3>
              <button
                onClick={() => {
                  setAudioModal(null);
                  setAudioFile(null);
                  setAudioTitle("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">Başlık</label>
              <input
                type="text"
                value={audioTitle}
                onChange={(e) => setAudioTitle(e.target.value)}
                placeholder="Ses kaydı başlığı"
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">Tür</label>
              <select
                value={audioType}
                onChange={(e) => setAudioType(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
              >
                <option value="TOPIC_INTRO">Konu Anlatımı</option>
                <option value="QUESTION">Soru</option>
                <option value="EXPLANATION">Açıklama</option>
                <option value="STORY_PASSAGE">Hikaye / Parça</option>
                <option value="OTHER">Diğer</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">Dosya</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-xs file:text-muted-foreground file:cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setAudioModal(null);
                  setAudioFile(null);
                  setAudioTitle("");
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
              >
                İptal
              </button>
              <button
                onClick={handleUploadAudio}
                disabled={uploadingAudio || !audioFile || !audioTitle.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {uploadingAudio && <Loader2 className="h-3 w-3 animate-spin" />}
                Yükle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
