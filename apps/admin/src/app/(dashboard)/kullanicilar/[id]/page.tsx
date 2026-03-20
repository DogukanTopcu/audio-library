"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  Ban,
  User as UserIcon,
  Mail,
  Calendar,
  FileText,
  Shield,
} from "lucide-react";

interface UserData {
  id: string;
  name: string;
  email: string;
  tcId?: string;
  phone?: string;
  status: string;
  createdAt: string;
  documentUrl?: string;
  documentType?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Aktif", className: "bg-green-900/30 text-green-400 border-green-800" },
  PENDING: { label: "Bekleyen", className: "bg-yellow-900/30 text-yellow-400 border-yellow-800" },
  SUSPENDED: { label: "Askıda", className: "bg-red-900/30 text-red-400 border-red-800" },
};

export default function UserDetailPage() {
  const params = useParams();
  const { admin } = useAdminAuth();
  const userId = params.id as string;

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get(`/admin/users/${userId}`);
      const data = res.data.data || res.data;
      setUser(data);

      // Fetch document signed URL if available
      if (data.documentUrl) {
        try {
          const docRes = await api.get(`/admin/users/${userId}/document-url`);
          const docData = docRes.data.data || docRes.data;
          setDocUrl(docData.url || docData);
        } catch {
          // Document URL might not be available
        }
      }
    } catch {
      toast.error("Kullanıcı bilgileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleVerify = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/users/${userId}/verify`);
      toast.success("Kullanıcı hesabı onaylandı");
      fetchUser();
    } catch {
      toast.error("Onaylama başarısız");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!confirm("Bu kullanıcıyı askıya almak istediğinizden emin misiniz?")) return;
    setActionLoading(true);
    try {
      await api.patch(`/admin/users/${userId}/suspend`);
      toast.success("Kullanıcı askıya alındı");
      fetchUser();
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">Kullanıcı bulunamadı</p>
        <Link href="/kullanicilar" className="mt-4 inline-block text-sm text-white hover:underline">
          Geri dön
        </Link>
      </div>
    );
  }

  const status = statusConfig[user.status] || {
    label: user.status,
    className: "bg-zinc-800 text-zinc-400 border-zinc-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/kullanicilar"
          className="rounded-lg border border-[#222] p-2 text-zinc-400 transition-colors hover:bg-[#111] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-white">Kullanıcı Detayı</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile Card */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#111] border border-[#222]">
                <UserIcon className="h-6 w-6 text-zinc-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{user.name}</h2>
                <span className={cn("inline-block mt-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", status.className)}>
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-zinc-500" />
              <span className="text-zinc-400">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-400">{user.phone}</span>
              </div>
            )}
            {user.tcId && (
              <div className="flex items-center gap-3 text-sm">
                <FileText className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-400 font-mono">
                  {user.tcId.slice(0, 3)}{"*".repeat(Math.max(0, user.tcId.length - 3))}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-zinc-500" />
              <span className="text-zinc-400">
                {new Date(user.createdAt).toLocaleDateString("tr-TR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-[#222]">
            {user.status === "PENDING" && (
              <button
                onClick={handleVerify}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Hesabı Onayla
              </button>
            )}
            {admin?.role === "SUPERADMIN" && user.status !== "SUSPENDED" && (
              <button
                onClick={handleSuspend}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Hesabı Askıya Al
              </button>
            )}
          </div>
        </div>

        {/* Document Viewer */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Belgeler</h2>
          {docUrl ? (
            <div className="space-y-3">
              {user.documentType?.includes("pdf") ? (
                <iframe
                  src={docUrl}
                  className="w-full h-[500px] rounded-lg border border-[#222] bg-[#111]"
                  title="Kullanıcı belgesi"
                />
              ) : (
                <img
                  src={docUrl}
                  alt="Kullanıcı belgesi"
                  className="w-full max-h-[500px] rounded-lg border border-[#222] object-contain bg-[#111]"
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">Belge yüklenmemiş</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
