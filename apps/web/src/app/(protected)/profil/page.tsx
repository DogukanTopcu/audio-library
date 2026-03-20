"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Shield, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  status: string;
  createdAt?: string;
}

const statusLabels: Record<string, { text: string; color: string }> = {
  ACTIVE: { text: "Aktif", color: "#22c55e" },
  PENDING: { text: "Onay Bekliyor", color: "#eab308" },
  REJECTED: { text: "Reddedildi", color: "#ef4444" },
  SUSPENDED: { text: "Askiya Alindi", color: "#ef4444" },
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get("/auth/me");
        setProfile(data.data || data);
      } catch {
        toast.error("Profil bilgileri yuklenirken bir hata olustu.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        role="status"
        aria-label="Profil yukleniyor"
      >
        <Loader2
          className="w-10 h-10 text-foreground animate-spin"
          aria-hidden="true"
        />
        <span className="ml-4 text-[18px] text-muted-foreground">Yukleniyor...</span>
      </div>
    );
  }

  const displayProfile = profile || user;
  if (!displayProfile) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 text-center">
        <p className="text-[20px] text-muted-foreground">
          Profil bilgileri bulunamadi.
        </p>
      </div>
    );
  }

  const statusInfo = statusLabels[displayProfile.status] || {
    text: displayProfile.status,
    color: "#a1a1aa",
  };

  const memberSince =
    profile?.createdAt
      ? new Date(profile.createdAt).toLocaleDateString("tr-TR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">Profil</h1>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-xl p-8">
        {/* Avatar / Name */}
        <div className="flex items-center gap-5 mb-8 pb-8 border-b border-border">
          <div
            className="w-20 h-20 rounded-full bg-muted border border-input flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {displayProfile.name}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: statusInfo.color }}
                aria-hidden="true"
              />
              <span
                className="text-[16px] font-medium"
                style={{ color: statusInfo.color }}
              >
                {statusInfo.text}
              </span>
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <Mail className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[14px] text-muted-foreground">E-posta Adresi</p>
              <p className="text-[18px] text-foreground">{displayProfile.email}</p>
            </div>
          </div>

          {profile?.phone_number && (
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
              >
                <Phone className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[14px] text-muted-foreground">Telefon Numarasi</p>
                <p className="text-[18px] text-foreground">
                  {profile.phone_number}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <Shield className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[14px] text-muted-foreground">Hesap Durumu</p>
              <p className="text-[18px]" style={{ color: statusInfo.color }}>
                {statusInfo.text}
              </p>
            </div>
          </div>

          {memberSince && (
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
              >
                <Calendar className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[14px] text-muted-foreground">Uyelik Tarihi</p>
                <p className="text-[18px] text-foreground">{memberSince}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
