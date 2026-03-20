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
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-background">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-foreground">
          Engelsiz Öğrenme
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
          Görme engelli bireyler için sesli ders kitapları, romanlar ve sınav
          hazırlık materyalleri. Ücretsiz ve erişilebilir.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/giris"
            className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg text-lg no-underline hover:opacity-90 transition-opacity"
            aria-label="Giriş yap sayfasına git"
          >
            Giriş Yap
          </Link>
          <Link
            href="/kayit"
            className="inline-flex items-center justify-center px-8 py-4 border-2 border-primary text-primary font-semibold rounded-lg text-lg no-underline hover:bg-primary hover:text-primary-foreground transition-colors"
            aria-label="Kayıt ol sayfasına git"
          >
            Kayıt Ol
          </Link>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 bg-secondary/30" aria-labelledby="nasil-calisir">
        <div className="max-w-5xl mx-auto">
          <h2
            id="nasil-calisir"
            className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground"
          >
            Nasıl Çalışır?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="bg-card border border-border rounded-xl p-8 text-center shadow-sm"
              >
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-card-foreground">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Types */}
      <section className="py-24 px-6 bg-background" aria-labelledby="icerik-turleri">
        <div className="max-w-5xl mx-auto">
          <h2
            id="icerik-turleri"
            className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground"
          >
            İçerik Türleri
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {contentTypes.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-card border border-border rounded-xl p-8 hover:border-primary/50 transition-colors shadow-sm"
                >
                  <Icon className="w-10 h-10 mb-4 text-primary" aria-hidden="true" />
                  <h3 className="text-xl font-semibold mb-2 text-card-foreground">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 bg-background">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-muted-foreground">
            Ozan Bayır Sesli Kütüphanesi — Bir sosyal sorumluluk projesi
          </p>
          <nav aria-label="Footer navigasyonu" className="flex gap-6">
            <Link href="/giris" className="text-muted-foreground hover:text-foreground">
              Giriş
            </Link>
            <Link href="/kayit" className="text-muted-foreground hover:text-foreground">
              Kayıt
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
