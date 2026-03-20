"use client";

import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";

export default function EmailVerificationPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-black">
      <div className="w-full max-w-lg text-center">
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-xl p-10">
          <div
            className="w-20 h-20 bg-[#111111] border border-[#222222] rounded-full flex items-center justify-center mx-auto mb-6"
            aria-hidden="true"
          >
            <Mail className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">
            E-posta Doğrulama Bekliyor
          </h1>

          <p className="text-[18px] text-[#a1a1aa] mb-6 leading-relaxed">
            Kayıt sırasında belirttiğiniz e-posta adresine bir doğrulama
            bağlantısı gönderdik. Lütfen gelen kutunuzu kontrol ediniz ve
            bağlantıya tıklayarak e-posta adresinizi doğrulayınız.
          </p>

          <p className="text-[18px] text-[#a1a1aa] mb-8 leading-relaxed">
            E-postayı bulamıyorsanız, spam veya istenmeyen postalar klasörünü
            kontrol etmeyi unutmayınız.
          </p>

          <div className="space-y-4">
            <Link
              href="/giris"
              className="inline-flex items-center justify-center gap-2 w-full px-8 py-4 bg-white text-black font-semibold rounded-lg text-[18px] no-underline hover:bg-[#e4e4e7] transition-colors min-h-[48px]"
              aria-label="Giriş sayfasına git"
            >
              Giriş Sayfasına Git
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
