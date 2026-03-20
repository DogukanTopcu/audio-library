import Link from "next/link";
import { BookOpen, Headphones, FileText, HelpCircle } from "lucide-react";

const steps = [
  {
    number: "1",
    title: "Kayıt Olun",
    description: "Kişisel bilgilerinizi ve engel belgenizi yükleyerek başvurun.",
  },
  {
    number: "2",
    title: "Doğrulama",
    description: "Yöneticilerimiz başvurunuzu 1-3 iş günü içinde değerlendirir.",
  },
  {
    number: "3",
    title: "Dinlemeye Başlayın",
    description: "Hesabınız aktifleştirildikten sonra tüm içeriklere erişebilirsiniz.",
  },
];

const contentTypes = [
  {
    icon: BookOpen,
    title: "Ders Kitapları",
    description: "TYT, AYT ve KPSS müfredatına uygun sesli ders kitapları.",
  },
  {
    icon: Headphones,
    title: "Romanlar",
    description: "Türk ve dünya edebiyatından seçme eserler.",
  },
  {
    icon: FileText,
    title: "Deneme Sınavları",
    description: "Sesli deneme sınavları ile kendinizi test edin.",
  },
  {
    icon: HelpCircle,
    title: "Soru Bankaları",
    description: "Konu bazlı sorular ve çözümleriyle pratik yapın.",
  },
];

export default function LandingPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Engelsiz Öğrenme
        </h1>
        <p className="text-lg md:text-xl text-[#a1a1aa] max-w-2xl mb-12 leading-relaxed">
          Görme engelli bireyler için sesli ders kitapları, romanlar ve sınav
          hazırlık materyalleri. Ücretsiz ve erişilebilir.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/giris"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-black font-semibold rounded-lg text-lg no-underline hover:bg-[#e4e4e7] transition-colors"
            aria-label="Giriş yap sayfasına git"
          >
            Giriş Yap
          </Link>
          <Link
            href="/kayit"
            className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-lg text-lg no-underline hover:bg-white hover:text-black transition-colors"
            aria-label="Kayıt ol sayfasına git"
          >
            Kayıt Ol
          </Link>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6" aria-labelledby="nasil-calisir">
        <div className="max-w-5xl mx-auto">
          <h2
            id="nasil-calisir"
            className="text-3xl md:text-4xl font-bold text-center mb-16"
          >
            Nasıl Çalışır?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="bg-[#0a0a0a] border border-[#222222] rounded-xl p-8 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-[#a1a1aa]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Types */}
      <section className="py-24 px-6" aria-labelledby="icerik-turleri">
        <div className="max-w-5xl mx-auto">
          <h2
            id="icerik-turleri"
            className="text-3xl md:text-4xl font-bold text-center mb-16"
          >
            İçerik Türleri
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {contentTypes.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-[#0a0a0a] border border-[#222222] rounded-xl p-8 hover:border-[#333333] transition-colors"
                >
                  <Icon className="w-10 h-10 mb-4 text-white" aria-hidden="true" />
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-[#a1a1aa]">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#222222] py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[#a1a1aa]">
            Ozan Bayır Sesli Kütüphanesi — Bir sosyal sorumluluk projesi
          </p>
          <nav aria-label="Footer navigasyonu" className="flex gap-6">
            <Link href="/giris" className="text-[#a1a1aa] hover:text-white">
              Giriş
            </Link>
            <Link href="/kayit" className="text-[#a1a1aa] hover:text-white">
              Kayıt
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
