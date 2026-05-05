"use client";

import { useState } from "react";
import Link from "next/link";

const FREE_FEATURES = [
  "✓ Diagnostický test (všechna témata)",
  "✓ 3 témata: Zlomky, Rovnice, Procenta",
  "✓ 10 příkladů denně",
  "✓ Streak systém a XP",
  "✓ Základní statistiky a odznaky",
  "✗ Geometrie, Mocniny, Slovní úlohy",
  "✗ Číselné řady, Výrazy, Kombinované",
  "✗ Týdenní report pro rodiče",
];

const PREMIUM_FEATURES = [
  "✓ Všech 9 témat CERMAT",
  "✓ 500+ příkladů, neomezený přístup",
  "✓ Adaptivní algoritmus SM-2",
  "✓ Streak systém a XP",
  "✓ Všechny odznaky a achievementy",
  "✓ Týdenní report pro rodiče (email)",
  "✓ Prioritní podpora",
  "✓ Přístup na mobilu i PC",
];

export default function CenikPage() {
  const [showComingSoon, setShowComingSoon] = useState(false);

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
      <section className="max-w-2xl mx-auto px-6 pt-14 pb-8 text-center">
        <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide mb-4">
          Ceník
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>
          Začni zdarma.
          <br />
          Upgraduj kdykoliv.
        </h1>
        <p className="mt-3 text-gray-500 text-base">
          Žádná kreditní karta, žádné skryté poplatky.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-6">

          {/* Free */}
          <div className="rounded-2xl border-2 border-slate-200 p-7 flex flex-col">
            <div>
              <p className="text-lg font-bold" style={{ color: "#0D1B3E" }}>Zdarma</p>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>0 Kč</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">Navždy zdarma, bez závazku</p>
            </div>

            <ul className="mt-6 space-y-2.5 flex-1">
              {FREE_FEATURES.map((f) => (
                <li
                  key={f}
                  className={`text-sm flex items-start gap-2 ${f.startsWith("✗") ? "text-slate-400" : "text-slate-700"}`}
                >
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/registrace"
              className="mt-8 block w-full text-center font-bold py-3 rounded-xl border-2 transition-colors"
              style={{ borderColor: "#2E6DA4", color: "#2E6DA4" }}
            >
              Začít zdarma
            </Link>
          </div>

          {/* Premium */}
          <div
            className="rounded-2xl border-2 p-7 flex flex-col relative shadow-xl"
            style={{ borderColor: "#2E6DA4", boxShadow: "0 20px 40px rgba(46,109,164,0.12)" }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span
                className="text-white text-xs font-bold px-4 py-1 rounded-full"
                style={{ background: "#2E6DA4" }}
              >
                Nejoblíbenější
              </span>
            </div>

            <div>
              <p className="text-lg font-bold" style={{ color: "#0D1B3E" }}>Premium</p>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>99 Kč</span>
                <span className="text-slate-400 mb-1">/ měsíc</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">Plná příprava na přijímačky</p>
            </div>

            <ul className="mt-6 space-y-2.5 flex-1">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="text-sm text-slate-700 flex items-start gap-2">
                  {f}
                </li>
              ))}
            </ul>

            {showComingSoon ? (
              <div
                className="mt-8 w-full py-3.5 rounded-xl text-center font-black text-base"
                style={{ background: "#f0fdf4", color: "#16a34a", border: "2px solid #bbf7d0" }}
              >
                Brzy dostupné 🚀
              </div>
            ) : (
              <button
                onClick={() => setShowComingSoon(true)}
                className="mt-8 w-full py-3.5 text-white font-black rounded-xl text-base transition-colors"
                style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
              >
                Vyzkoušet Premium →
              </button>
            )}
          </div>
        </div>

        {/* Note */}
        <p className="text-center text-sm text-slate-400 mt-6">
          Platba kartou nebo převodem · Zrušení kdykoliv · Faktura na firmu k dispozici
        </p>

        {/* FAQ mini */}
        <div className="mt-10 flex flex-col gap-4">
          {[
            ["Mohu zrušit kdykoliv?", "Ano. Předplatné lze zrušit kdykoliv z účtu, bez poplatků."],
            ["Co se stane s mým pokrokem po zrušení?", "Veškerý lokální pokrok (XP, odznaky, karty) zůstane uložen. Přístup k premium tématům se omezí na free plán."],
            ["Je premium pro rodiče nebo žáky?", "Pro obojí — žák trénuje v aplikaci, rodiče dostávají týdenní email s přehledem."],
          ].map(([q, a]) => (
            <div key={q} className="bg-slate-50 rounded-xl p-5">
              <p className="text-sm font-bold" style={{ color: "#0D1B3E" }}>{q}</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-gray-100 text-center py-5 text-xs text-gray-400">
        MateMax © 2026 · by Karel Tůma ·{" "}
        <Link href="/" className="hover:underline">Zpět na úvod</Link>
      </div>
    </div>
  );
}
