"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Users, Clock, BookOpen, AudioLines, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  totalUsers: number;
  pendingVerifications: number;
  totalContent: number;
  totalAudioRecords: number;
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface PendingUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, recentRes, pendingRes] = await Promise.all([
        api.get("/admin/dashboard/stats"),
        api.get("/admin/dashboard/recent-registrations"),
        api.get("/admin/dashboard/pending-verifications"),
      ]);
      setStats(statsRes.data.data || statsRes.data);
      setRecentUsers(recentRes.data.data || recentRes.data);
      setPendingUsers(pendingRes.data.data || pendingRes.data);
    } catch {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      await api.patch(`/admin/users/${id}/verify`);
      toast.success("Kullanıcı doğrulandı");
      setPendingUsers((prev) => prev.filter((u) => u.id !== id));
      if (stats) {
        setStats({
          ...stats,
          pendingVerifications: stats.pendingVerifications - 1,
        });
      }
    } catch {
      toast.error("Doğrulama başarısız");
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const statCards = [
    { label: "Toplam Kullanıcı", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-400" },
    { label: "Bekleyen Doğrulama", value: stats?.pendingVerifications ?? 0, icon: Clock, color: "text-yellow-400" },
    { label: "Toplam İçerik", value: stats?.totalContent ?? 0, icon: BookOpen, color: "text-green-400" },
    { label: "Toplam Ses Kaydı", value: stats?.totalAudioRecords ?? 0, icon: AudioLines, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">{card.label}</p>
                <Icon className={cn("h-5 w-5", card.color)} />
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Son Kayıtlar */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Son Kayıtlar</h2>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-zinc-500">Henüz kayıt yok</p>
          ) : (
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg bg-[#111] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bekleyen Doğrulama */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Bekleyen Doğrulama</h2>
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-zinc-500">Bekleyen doğrulama yok</p>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg bg-[#111] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                  </div>
                  <button
                    onClick={() => handleVerify(user.id)}
                    disabled={verifyingId === user.id}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    {verifyingId === user.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    Onayla
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
