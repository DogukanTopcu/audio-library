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
import { NarratorToggle } from "@/components/narrator-toggle";
import { NarratorHoverProvider } from "@/components/narrator-hover-provider";

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
    <div className="flex min-h-screen bg-background">
      <NarratorHoverProvider />
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-[240px] flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center border-b border-border px-5">
          <span className="text-sm font-bold text-foreground tracking-wide">
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
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="rounded-lg bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">Giriş yapan</p>
            <p className="text-sm font-medium text-foreground truncate">{admin.name}</p>
            <p className="text-xs text-muted-foreground">{admin.role}</p>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="ml-[240px] flex flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="text-sm text-muted-foreground">
            {filteredNav.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))?.label || ""}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{admin.name}</span>
            <NarratorToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Çıkış
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
