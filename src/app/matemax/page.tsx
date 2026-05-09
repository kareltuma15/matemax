import Link from "next/link";

const STEPS = [
  {
    icon: "🎯",
    title: "Udělej diagnostiku",
    desc: "Zjisti kde máš mezery (2 minuty)",
    detail: "Krátký adaptivní test odhalí tvoje slabá místa. Aplikace pak sestaví plán přímo na míru.",
    color: "bg-blue-50 border-blue-200",
    accent: "#2563eb",
    num: "01",
  },
  {
    icon: "💪",
    title: "Procvičuj cíleně",
    desc: "Aplikace tě vede k slabým místům",
    detail: "Každý den 7 příkladů vybraných algoritmem — zaměřených přesně tam, kde to potřebuješ.",
    color: "bg-orange-50 border-orange-200",
    accent: "#ea580c",
    num: "02",
  },
  {
    icon: "📈",
    title: "Sleduj pokrok",
    desc: "Rodiče vidí výsledky každý týden",
    detail: "Týdenní report pro rodiče automaticky každé pondělí — bez zkoušení u večeře.",
    color: "bg-green-50 border-green-200",
    accent: "#16a34a",
    num: "03",
  },
];

export default function MatemaxPage() {
  return (
    <div className="bg-white min-h-screen">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm"
              style={{ background: "#0D1B3E" }}
            >
              M²
            </div>
            <span className="font-bold text-base" style={{ color: "#0D1B3E" }}>MateMax</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 hidden sm:block transition-colors">
              Zpět na hlavní stránku
            </Link>
            <Link
              href="/vitej"
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-colors"
              style={{ background: "#2E6DA4" }}
            >
              Začít zdarma
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 50%, #0D1B3E 100%)" }}
      >
        <div className="max-w-3xl mx-auto px-6 py-20 text-center relative z-10">
          <span className="inline-block bg-blue-500/20 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide mb-6">
            Příprava na přijímačky
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
            Matematika každý den.{" "}
            <span style={{ color: "#00B4D8" }}>Bez stresu.</span>
          </h1>
          <p className="mt-5 text-lg text-blue-200 max-w-xl mx-auto leading-relaxed">
            MateMax je adaptivní trenér pro 8. a 9. třídu. 10 minut denně stačí k výraznému zlepšení.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/vitej"
              className="inline-block text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg transition-colors"
              style={{ background: "#00B4D8" }}
            >
              Vyzkoušet zdarma →
            </Link>
            <Link
              href="/diagnostika"
              className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold text-base px-8 py-4 rounded-xl border border-white/20 transition-colors"
            >
              🎯 Spustit diagnostiku
            </Link>
          </div>
          <p className="mt-4 text-sm text-blue-400">
            Bez kreditní karty · 3 témata zdarma navždy
          </p>
        </div>
      </section>

      {/* Jak to funguje */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
            Jak to funguje
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>
            Tři kroky k lepším výsledkům
          </h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto text-sm">
            Funguje to jednoduše — začni diagnostikou a aplikace udělá zbytek.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step) => (
            <div key={step.num} className={`relative border-2 rounded-2xl p-7 ${step.color}`}>
              <div
                className="text-5xl font-black opacity-10 absolute top-4 right-6"
                style={{ color: step.accent }}
              >
                {step.num}
              </div>
              <div className="text-4xl mb-4">{step.icon}</div>
              <h3 className="text-xl font-bold" style={{ color: "#0D1B3E" }}>
                {step.title}
              </h3>
              <p className="text-sm font-semibold mt-1 mb-3" style={{ color: step.accent }}>
                {step.desc}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">{step.detail}</p>
            </div>
          ))}
        </div>

        {/* Arrow connector hint on desktop */}
        <div className="hidden md:flex justify-center items-center gap-6 mt-8 text-slate-400 text-sm">
          <span>Začni hned</span>
          <span>→</span>
          <span>Každý den 10 min</span>
          <span>→</span>
          <span>Rodiče vidí výsledky</span>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "700+", label: "příkladů v databázi" },
            { value: "9", label: "témat CERMAT" },
            { value: "10 min", label: "denně stačí" },
            { value: "1×/týden", label: "report pro rodiče" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 text-center" style={{ background: "#0D1B3E" }}>
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Přijímačky jsou za rohem.
            <br />
            <span style={{ color: "#00B4D8" }}>Začni dnes.</span>
          </h2>
          <p className="mt-4 text-blue-200 text-lg">
            Udělej diagnostiku za 2 minuty a zjisti, kde začít.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/diagnostika"
              className="inline-block text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors"
              style={{ background: "#00B4D8" }}
            >
              🎯 Udělej diagnostiku →
            </Link>
            <Link
              href="/vitej"
              className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/20 transition-colors"
            >
              Registrovat se zdarma
            </Link>
          </div>
          <p className="mt-4 text-sm text-blue-400">
            Bez kreditní karty · Zrušení kdykoliv
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="bg-white border-t border-gray-100 text-center py-5 text-xs text-gray-400">
        MateMax © 2026 · by Karel Tůma · Matematika Snadno
      </div>

    </div>
  );
}
