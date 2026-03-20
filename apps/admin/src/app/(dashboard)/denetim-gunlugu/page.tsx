"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/auth-context";
import { ScrollText } from "lucide-react";

export default function AuditLogPage() {
  const { admin } = useAdminAuth();
  const router = useRouter();

  // Redirect if not SUPERADMIN
  useEffect(() => {
    if (admin && admin.role !== "SUPERADMIN") {
      router.push("/dashboard");
    }
  }, [admin, router]);

  if (admin?.role !== "SUPERADMIN") return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Denetim Günlüğü</h1>

      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted border border-border mb-4">
          <ScrollText className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Yakında Aktif Olacak</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Denetim günlüğü yakında aktif olacak. Bu sayfada yönetici işlemlerinin kayıtlarını
          görüntüleyebileceksiniz. Her işlem için yapan kişi, tarih, etkilenen kayıt ve
          önceki/sonraki durum bilgileri yer alacaktır.
        </p>
      </div>
    </div>
  );
}
