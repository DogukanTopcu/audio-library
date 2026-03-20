"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Loader2, Save } from "lucide-react";

interface ConfigItem {
  id: string;
  key: string;
  value: string;
  section: string;
}

const TABS = ["LANDING", "PLAYER", "AGENT", "LEGAL"] as const;
type TabType = (typeof TABS)[number];

const isJsonValue = (value: string): boolean => {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null;
  } catch {
    return false;
  }
};

export default function SettingsPage() {
  const { admin } = useAdminAuth();
  const router = useRouter();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("LANDING");
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Redirect if not SUPERADMIN
  useEffect(() => {
    if (admin && admin.role !== "SUPERADMIN") {
      router.push("/dashboard");
    }
  }, [admin, router]);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await api.get("/admin/config");
      const data = res.data.data || res.data;
      setConfigs(Array.isArray(data) ? data : data.items || []);
    } catch {
      toast.error("Ayarlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const sectionConfigs = configs.filter((c) => c.section === activeTab);

  const handleValueChange = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  const getDisplayValue = (item: ConfigItem): string => {
    return editedValues[item.key] !== undefined ? editedValues[item.key] : item.value;
  };

  const handleSave = async () => {
    const updates = sectionConfigs
      .filter((c) => editedValues[c.key] !== undefined && editedValues[c.key] !== c.value)
      .map((c) => ({
        key: c.key,
        value: editedValues[c.key],
        section: c.section,
      }));

    if (updates.length === 0) {
      toast.info("Değişiklik yok");
      return;
    }

    setSaving(true);
    try {
      await api.patch("/admin/config", { configs: updates });
      toast.success("Ayarlar kaydedildi");
      setEditedValues({});
      fetchConfigs();
    } catch {
      toast.error("Kaydetme başarısız");
    } finally {
      setSaving(false);
    }
  };

  if (admin?.role !== "SUPERADMIN") return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Site Ayarları</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Kaydet
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-[#222] bg-[#0a0a0a] p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Config fields */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5 space-y-4">
        {sectionConfigs.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">
            Bu bölümde henüz ayar bulunmuyor
          </p>
        ) : (
          sectionConfigs.map((item) => {
            const value = getDisplayValue(item);
            const isJson = isJsonValue(item.value);

            return (
              <div key={item.id} className="space-y-2">
                <label className="block text-xs font-medium text-zinc-400">
                  {item.key}
                </label>
                {isJson ? (
                  <textarea
                    rows={6}
                    value={value}
                    onChange={(e) => handleValueChange(item.key, e.target.value)}
                    className="w-full rounded-lg border border-[#222] bg-[#111] px-3 py-2 text-sm text-white font-mono outline-none focus:border-white resize-y"
                    spellCheck={false}
                  />
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleValueChange(item.key, e.target.value)}
                    className="w-full rounded-lg border border-[#222] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-white"
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
