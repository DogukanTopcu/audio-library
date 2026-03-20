import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Ozan Bayır Sesli Kütüphanesi",
  description:
    "Görme engelli bireyler için erişilebilir sesli kütüphane platformu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={cn("h-full antialiased", inter.variable, "font-sans")}>
      <body className="min-h-full flex flex-col bg-black text-white">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#0a0a0a",
                border: "1px solid #222222",
                color: "#ffffff",
                fontSize: "16px",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
