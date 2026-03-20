import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AdminAuthProvider } from "@/lib/auth-context";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Yönetici Paneli — Ozan Bayır Sesli Kütüphanesi",
  description: "Sesli kütüphane yönetim paneli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`h-full antialiased ${inter.variable} font-sans`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AdminAuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#ffffff",
                border: "1px solid #e4e4e7",
                color: "#09090b",
              },
            }}
          />
        </AdminAuthProvider>
      </body>
    </html>
  );
}
