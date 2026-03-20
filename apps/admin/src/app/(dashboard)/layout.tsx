"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAdminAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Library,
  FolderTree,
  Users,
  ShieldCheck,
  Settings,
  ScrollText,
  LogOut,
  Loader2,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  superadminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "İçerikler", href: "/icerikler", icon: Library },
  { label: "Kategoriler", href: "/kategoriler", icon: FolderTree },
  { label: "Kullanıcılar", href: "/kullanicilar", icon: Users },
  { label: "Yöneticiler", href: "/yoneticiler", icon: ShieldCheck, superadminOnly: true },
  { label: "Site Ayarları", href: "/ayarlar", icon: Settings, superadminOnly: true },
  { label: "Denetim Günlüğü", href: "/denetim-gunlugu", icon: ScrollText, superadminOnly: true },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { admin, isLoading, logout } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !admin) {
      router.push("/login");
    }
  }, [admin, isLoading, router]);

  if (isLoading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const filteredNav = navItems.filter(
    (item) => !item.superadminOnly || admin.role === "SUPERADMIN"
  );

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-[240px] flex-col border-r border-[#222] bg-[#0a0a0a]">
        <div className="flex h-16 items-center border-b border-[#222] px-5">
          <span className="text-sm font-bold text-white tracking-wide">
            Sesli Kütüphane
          </span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {filteredNav.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:bg-[#111] hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#222] p-3">
          <div className="rounded-lg bg-[#111] px-3 py-2">
            <p className="text-xs text-zinc-500">Giriş yapan</p>
            <p className="text-sm font-medium text-white truncate">{admin.name}</p>
            <p className="text-xs text-zinc-500">{admin.role}</p>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="ml-[240px] flex flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#222] bg-[#0a0a0a] px-6">
          <div className="text-sm text-zinc-400">
            {filteredNav.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))?.label || ""}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">{admin.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-[#222] px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-[#111] hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Çıkış
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-black p-6">{children}</main>
      </div>
    </div>
  );
}
