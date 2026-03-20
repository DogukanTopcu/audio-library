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
      <body className="min-h-full flex flex-col bg-black text-white">
        <AdminAuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#0a0a0a",
                border: "1px solid #222222",
                color: "#ffffff",
              },
            }}
          />
        </AdminAuthProvider>
      </body>
    </html>
  );
}
