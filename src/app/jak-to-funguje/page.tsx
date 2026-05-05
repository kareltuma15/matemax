import Link from "next/link";

const STEPS = [
  {
    icon: "🎯",
    step: "1",
    title: "Diagnostický test",
    desc: "Začni 8minutovým adaptivním testem, který odhalí tvoje mezery ve všech 9 tématech CERMAT. MateMax okamžitě sestaví tréninkový plán přesně na míru.",
    color: "#eff6ff",
    accent: "#2563eb",
  },
  {
    icon: "🏋️",
    step: "2",
    title: "Denní trénink",
    desc: "Každý den dostaneš 7 příkladů seřazených od lehčích k těžším. Algoritmus SM-2 sleduje tvé chyby a automaticky tě vrátí k tématům, kde se zasekáváš — dokud je neovládneš.",
    color: "#fff7ed",
    accent: "#ea580c",
  },
  {
    icon: "📈",
    step: "3",
    title: "Sleduj pokrok",
    desc: "V profilu vidíš přesně, kde jsi se zlepšil a co ještě procvičit. Rodiče dostávají každý týden email s přehledem výsledků — bez zkoušení u večeře.",
    color: "#f0fdf4",
    accent: "#16a34a",
  },
];

const WHY_ITEMS = [
  ["🧠", "Spaced Repetition", "Příklady se opakují přesně ve chvíli, kdy je začínáš zapomínat — ne zbytečně brzy ani příliš pozdě."],
  ["🎮", "Gamifikace", "XP, level systém a odznaky tě motivují každý den. Streak ti nedovolí přestat."],
  ["📊", "CERMAT formát", "Databáze 500+ příkladů ve stejném formátu jako skutečný přijímací test."],
  ["📱", "Mobilní první", "Funguje na mobilu, tabletu i počítači. Nainstaluj jako PWA a trénuj i offline."],
];

export default function JakToFungujePageStatic() {
  return (
    <div className="bg-white min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm"
              style={{ background: "#0D1B3E" }}
            >
              M²
            </div>
            <span className="font-bold text-base" style={{ color: "#0D1B3E" }}>MateMax</span>
          </Link>
          <Link
            href="/registrace"
            className="text-sm font-semibold text-white px-4 py-2 rounded-lg"
            style={{ background: "#2E6DA4" }}
          >
            Začít zdarma
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="text-center py-16 px-6"
        style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 100%)" }}
      >
        <span className="inline-block bg-white/10 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide mb-4">
          Jak to funguje
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
          Od diagnostiky k výsledkům<br />
          <span style={{ color: "#00B4D8" }}>za 3 kroky</span>
        </h1>
        <p className="mt-4 text-blue-200 max-w-xl mx-auto text-base leading-relaxed">
          MateMax není jen další sbírka příkladů. Je to chytrý trenér,
          který se přizpůsobí přesně tobě.
        </p>
      </section>

      {/* 3 steps */}
      <section className="max-w-3xl mx-auto px-6 py-14">
        <div className="flex flex-col gap-8">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="flex gap-5 p-6 rounded-2xl border-2"
              style={{ background: s.color, borderColor: `${s.accent}30` }}
            >
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-base"
                  style={{ background: s.accent }}
                >
                  {s.step}
                </div>
                <span className="text-3xl">{s.icon}</span>
              </div>
              <div>
                <h2 className="text-lg font-black mb-2" style={{ color: "#0D1B3E" }}>
                  {s.title}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why MateMax */}
      <section className="bg-slate-50 py-14 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: "#0D1B3E" }}>
            Proč MateMax funguje
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {WHY_ITEMS.map(([icon, title, desc]) => (
              <div key={title} className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-2xl mb-2">{icon}</p>
                <p className="font-bold text-sm" style={{ color: "#0D1B3E" }}>{title}</p>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 text-center px-6" style={{ background: "#0D1B3E" }}>
        <div className="max-w-lg mx-auto">
          <p className="text-4xl mb-4">🚀</p>
          <h2 className="text-2xl font-extrabold text-white">
            Připraven začít?
          </h2>
          <p className="text-blue-200 mt-2 mb-8 text-sm">
            Registrace zabere 30 sekund. První diagnostika 8 minut. Zdarma.
          </p>
          <Link
            href="/registrace"
            className="inline-block text-white font-black text-base px-10 py-4 rounded-xl"
            style={{ background: "#00B4D8" }}
          >
            Začít zdarma →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-gray-800 bg-slate-900 text-center py-5 text-xs text-slate-500">
        MateMax © 2026 · by Karel Tůma ·{" "}
        <Link href="/" className="hover:underline">Zpět na úvod</Link>
        {" · "}
        <Link href="/cenik" className="hover:underline">Ceník</Link>
      </div>
    </div>
  );
}
