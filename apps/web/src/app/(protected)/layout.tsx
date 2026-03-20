"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Compass, BarChart3, User, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/kesfet", label: "Kesfet sayfasina git", text: "Kesfet", icon: Compass },
  { href: "/ilerleme", label: "Ilerleme sayfasina git", text: "Ilerleme", icon: BarChart3 },
  { href: "/profil", label: "Profil sayfasina git", text: "Profil", icon: User },
];

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/giris");
    }
  }, [isLoading, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/giris");
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-black"
        role="status"
        aria-label="Yukleniyor"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2
            className="w-12 h-12 text-white animate-spin"
            aria-hidden="true"
          />
          <p className="text-[18px] text-[#a1a1aa]">Yukleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-[#222222] bg-[#0a0a0a]">
        <nav
          className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16"
          aria-label="Ana navigasyon"
        >
          {/* Logo / Title */}
          <Link
            href="/kesfet"
            className="text-[20px] font-bold text-white no-underline hover:opacity-80 transition-opacity"
            aria-label="Ana sayfaya git"
          >
            Sesli Kutuphane
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[16px] font-medium no-underline transition-colors min-h-[48px] ${
                    isActive
                      ? "bg-white text-black"
                      : "text-[#a1a1aa] hover:text-white hover:bg-[#111111]"
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  <span className="hidden sm:inline">{item.text}</span>
                </Link>
              );
            })}

            <Button
              onClick={handleLogout}
              aria-label="Cikis yap"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[16px] font-medium text-[#a1a1aa] hover:text-white hover:bg-[#111111] bg-transparent border-none min-h-[48px] ml-2"
            >
              <LogOut className="w-5 h-5" aria-hidden="true" />
              <span className="hidden sm:inline">Cikis</span>
            </Button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
