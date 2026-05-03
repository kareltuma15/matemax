"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ─── DATA ───────────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: "🎯",
    title: "Diagnostika",
    subtitle: "Zjistíme, kde stojíš",
    desc: "MateMax začne krátkým adaptivním testem (5 minut). Automaticky pozná, která témata ovládáš a kde máš mezery — a sestaví tréninkový plán přímo na míru.",
    color: "bg-blue-50 border-blue-200",
    accent: "text-blue-600",
  },
  {
    step: "02",
    icon: "🏋️",
    title: "Denní trénink",
    subtitle: "10 minut každý den stačí",
    desc: "Každý den dostaneš sadu příkladů seřazených od lehčích k těžším. Algoritmus sleduje tvé chyby a automaticky tě vrátí k tématům, kde se zasekáváš — dokud je neovládneš.",
    color: "bg-orange-50 border-orange-200",
    accent: "text-orange-600",
  },
  {
    step: "03",
    icon: "📊",
    title: "Týdenní report",
    subtitle: "Rodiče vědí, jak to jde",
    desc: "Každé pondělí ráno dostanou rodiče email s přehledem: kolik příkladů dítě zvládlo, jaký má streak, kde má mezery a co procvičovat příští týden. Bez zkoušení u večeře.",
    color: "bg-green-50 border-green-200",
    accent: "text-green-600",
  },
];

const PRICING = [
  {
    name: "Zdarma",
    price: "0 Kč",
    period: "",
    desc: "Pro vyzkoušení, bez závazku",
    highlight: false,
    features: [
      "✓ Diagnostický test",
      "✓ 3 témata (zlomky, procenta, rovnice)",
      "✓ 10 příkladů denně",
      "✓ Základní statistiky",
      "✗ Týdenní report pro rodiče",
      "✗ Plná databáze 2 000+ příkladů",
      "✗ CERMAT cvičné testy",
    ],
    cta: "Začít zdarma",
    ctaHref: "/diagnostika",
    ctaStyle: "border-2 border-[#2E6DA4] text-[#2E6DA4] hover:bg-blue-50",
  },
  {
    name: "Premium",
    price: "99 Kč",
    period: "/ měsíc",
    desc: "Plná příprava na přijímačky",
    highlight: true,
    badge: "Nejoblíbenější",
    features: [
      "✓ Všechna témata CERMAT (9 oblastí)",
      "✓ Neomezený počet příkladů",
      "✓ Adaptivní algoritmus",
      "✓ Týdenní report pro rodiče",
      "✓ 2 kompletní CERMAT cvičné testy",
      "✓ Streak systém + motivační odměny",
      "✓ Přístup na mobilu i počítači",
    ],
    cta: "Vyzkoušet Premium",
    ctaHref: "/diagnostika",
    ctaStyle: "bg-[#2E6DA4] text-white hover:bg-[#1e5a8a]",
  },
];

const FAQS = [
  {
    q: "Pro jaký věk je MateMax určen?",
    a: "Pro žáky 8. a 9. třídy, ideálně rok před přijímačkami. Obsah přesně odpovídá formátu CERMAT, který používá většina gymnázií a středních škol.",
  },
  {
    q: "Jak dlouho denně se má dítě učit?",
    a: "Stačí 10 minut. Algoritmus sám vybere 7 příkladů — seřazených podle toho, kde žák nejvíc potřebuje procvičit. Pravidelnost je důležitější než délka.",
  },
  {
    q: "Co když dítě udělá chybu? Jak algoritmus reaguje?",
    a: "Příklad se vrátí za 1–2 dny znovu. Přesně tak funguje SM-2 (spaced repetition) — opakování ve chvíli, kdy hrozí zapomenutí. Čím víc chyb, tím dřív se příklad vrátí.",
  },
  {
    q: "Mohu MateMax použít i bez přijímaček?",
    a: "Ano, pro kohokoliv kdo chce procvičovat matematiku. Databáze pokrývá celý 2. stupeň ZŠ — zlomky, rovnice, geometrie, procenta, mocniny i slovní úlohy.",
  },
  {
    q: "Jak se liší MateMax od pracovního sešitu Matematika Snadno?",
    a: "Sešit je fyzická pomůcka — cheat sheety a příklady na papíře. MateMax je digitální trenér s adaptivním algoritmem, který sleduje pokrok a posílá rodičům týdenní report. Oba produkty se skvěle doplňují.",
  },
];

// ─── KOMPONENTY ──────────────────────────────────────────────────────────────

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
      {children}
    </span>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border rounded-xl overflow-hidden"
      style={{ borderColor: open ? "#2E6DA4" : "#e5e7eb" }}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors"
        style={{ background: open ? "#f0f7ff" : "#fff" }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="font-semibold pr-4 text-[15px]" style={{ color: "#0D1B3E" }}>
          {q}
        </span>
        <span
          className="text-2xl flex-shrink-0 font-light transition-transform duration-200 select-none"
          style={{
            color: "#2E6DA4",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
            display: "inline-block",
          }}
        >
          +
        </span>
      </button>
      {open && (
        <div
          className="px-6 pb-5 pt-1 text-sm leading-relaxed border-t"
          style={{ color: "#4b5563", borderColor: "#e0ecf8", background: "#f8fbff" }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

// ─── HLAVNÍ KOMPONENTA ───────────────────────────────────────────────────────

export default function LandingPage() {
  const [diagDone, setDiagDone] = useState(false);

  useEffect(() => {
    setDiagDone(localStorage.getItem("matemax-diag-done") === "1");
  }, []);

  const primaryCta = diagDone ? "/trenink" : "/diagnostika";
  const primaryLabel = diagDone ? "Pokračovat v tréninku →" : "🚀 Začít zdarma";

  return (
    <div className="bg-white">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm" style={{ background: "#0D1B3E" }}>
              M²
            </div>
            <span className="font-bold text-base" style={{ color: "#0D1B3E" }}>MateMax</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#jak-to-funguje" className="text-sm text-gray-500 hover:text-gray-800 hidden sm:block transition-colors">
              Jak to funguje
            </a>
            <a href="#cena" className="text-sm text-gray-500 hover:text-gray-800 hidden sm:block transition-colors">
              Ceník
            </a>
            <Link
              href={primaryCta}
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-colors"
              style={{ background: "#2E6DA4" }}
            >
              {diagDone ? "Trénovat →" : "Začít zdarma"}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 50%, #0D1B3E 100%)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5 translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ background: "#2E6DA4" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-5 -translate-x-1/2 translate-y-1/2 pointer-events-none" style={{ background: "#00B4D8" }} />

        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28 text-center relative z-10">
          <Badge>Nový produkt od Matematika Snadno</Badge>

          <h1 className="mt-6 text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Matematika, která{" "}
            <span style={{ color: "#00B4D8" }}>baví.</span>
            <br />
            Každý den trochu.
          </h1>

          <p className="mt-6 text-lg md:text-xl text-blue-200 max-w-2xl mx-auto leading-relaxed">
            MateMax je adaptivní matematický trenér pro žáky 8. a 9. třídy.
            10 minut denně, chytrý algoritmus a týdenní report pro rodiče —
            příprava na přijímačky bez stresu a bez doučování.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["Pro žáky 8. a 9. třídy", "Příklady ve stylu CERMAT", "Funguje na mobilu i PC", "Rodiče mají přehled"].map((tag) => (
              <span key={tag} className="text-sm bg-white/10 text-blue-100 px-4 py-2 rounded-full border border-white/20">
                ✓ {tag}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={primaryCta}
              className="inline-block text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors shadow-lg"
              style={{ background: "#00B4D8" }}
            >
              {primaryLabel}
            </Link>
            <a
              href="#jak-to-funguje"
              className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/20 transition-colors"
            >
              Jak to funguje →
            </a>
          </div>

          <p className="mt-4 text-sm text-blue-300">
            Zdarma navždy pro 3 témata · Premium od 99 Kč/měsíc · Bez kreditní karty
          </p>
        </div>
      </section>

      {/* ── ČÍSLA ───────────────────────────────────────────────────── */}
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "500+", label: "příkladů v databázi" },
            { value: "6", label: "témat CERMAT" },
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

      {/* ── JAK TO FUNGUJE ──────────────────────────────────────────── */}
      <section id="jak-to-funguje" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <Badge>Jak to funguje</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>
            Tři kroky k lepším výsledkům
          </h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            MateMax se přizpůsobí každému žákovi individuálně. Žádné zbytečné opakování toho, co už umí.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className={`relative border-2 rounded-2xl p-7 ${item.color}`}>
              <div className={`text-5xl font-black opacity-10 absolute top-4 right-6 ${item.accent}`}>
                {item.step}
              </div>
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold" style={{ color: "#0D1B3E" }}>{item.title}</h3>
              <p className={`text-sm font-semibold mt-1 mb-3 ${item.accent}`}>{item.subtitle}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── APP MOCKUP ──────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge>Ukázka aplikace</Badge>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>
                Přehledné a jednoduché rozhraní
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Dítě vidí svůj denní cíl, aktuální streak a seznam příkladů k vyřešení.
                Žádné zbytečné tlačítka, žádný chaos — jen čisté procvičování.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                {[
                  "Příklady seřazeny od lehčích k těžším",
                  "Okamžitá zpětná vazba po každé odpovědi",
                  "Vysvětlení správného postupu po chybě",
                  "Vizuální pokrok a streak motivace",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="font-bold mt-0.5" style={{ color: "#00B4D8" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={primaryCta}
                className="inline-block mt-8 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                style={{ background: "#0D1B3E" }}
              >
                {diagDone ? "Pokračovat v tréninku →" : "Vyzkoušet zdarma →"}
              </Link>
            </div>

            {/* App mockup */}
            <div className="rounded-2xl p-6 shadow-2xl" style={{ background: "#0D1B3E" }}>
              <div className="rounded-xl p-4 mb-3" style={{ background: "#1e3a6e" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-bold text-sm">🧮 MateMax</span>
                  <span className="text-yellow-400 text-sm font-bold">🔥 7 dní</span>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: "#0D1B3E" }}>
                  <div className="text-xs text-blue-300 mb-1">Dnešní úloha — Zlomky</div>
                  <div className="text-white text-lg font-bold">Vypočítej: ³⁄₄ + ⅙ = ?</div>
                </div>
              </div>
              {["11/12", "5/6", "7/12", "1/2"].map((ans, i) => (
                <div
                  key={ans}
                  className="mb-2 px-4 py-3 rounded-lg text-sm font-semibold"
                  style={{
                    background: i === 0 ? "#22c55e" : "rgba(255,255,255,0.1)",
                    color: i === 0 ? "#fff" : "rgba(255,255,255,0.8)",
                  }}
                >
                  {String.fromCharCode(65 + i)}) {ans}
                </div>
              ))}
              <div className="mt-4 rounded-lg p-3" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
                <div className="text-green-400 text-xs font-semibold">✓ Správně! +10 XP</div>
                <div className="text-xs mt-1" style={{ color: "#93c5fd" }}>³⁄₄ = ⁹⁄₁₂, ⅙ = ²⁄₁₂ → ⁹⁄₁₂ + ²⁄₁₂ = ¹¹⁄₁₂</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CENÍK ───────────────────────────────────────────────────── */}
      <section id="cena" className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <Badge>Ceník</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>
            Začni zdarma, upgraduj kdykoliv
          </h2>
          <p className="mt-3 text-gray-500">Premium lze kdykoli zrušit. Žádné skryté poplatky.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 border-2 ${plan.highlight ? "shadow-xl" : "border-gray-200"}`}
              style={plan.highlight ? { borderColor: "#00B4D8", boxShadow: "0 20px 40px rgba(0,180,216,0.12)" } : {}}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-white text-xs font-bold px-4 py-1 rounded-full" style={{ background: "#00B4D8" }}>
                    {plan.badge}
                  </span>
                </div>
              )}
              <div className="text-lg font-bold" style={{ color: "#0D1B3E" }}>{plan.name}</div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>{plan.price}</span>
                {plan.period && <span className="text-gray-400 mb-1">{plan.period}</span>}
              </div>
              <p className="text-sm text-gray-500 mt-1">{plan.desc}</p>
              <ul className="mt-6 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className={`text-sm ${f.startsWith("✗") ? "text-gray-400" : "text-gray-700"}`}>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className={`mt-8 w-full block text-center font-bold py-3 rounded-xl transition-colors ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          💳 Platba kartou nebo bankovním převodem · Faktura na firmu k dispozici
        </p>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge>FAQ</Badge>
            <h2 className="mt-4 text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>
              Nejčastější otázky
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────── */}
      <section className="py-20 text-center" style={{ background: "#0D1B3E" }}>
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Přijímačky jsou za rohem.
            <br />
            <span style={{ color: "#00B4D8" }}>Začni dnes.</span>
          </h2>
          <p className="mt-4 text-blue-200 text-lg">
            10 minut denně. Adaptivní algoritmus. Rodiče s přehledem.{" "}
            <br className="hidden sm:block" />
            Příprava, která skutečně funguje.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={primaryCta}
              className="inline-block text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors"
              style={{ background: "#00B4D8" }}
            >
              {diagDone ? "Pokračovat v tréninku →" : "Začít zdarma →"}
            </Link>
            <Link
              href="/report-preview"
              className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/20 transition-colors"
            >
              📧 Ukázka report emailu
            </Link>
          </div>
          <p className="mt-4 text-sm text-blue-400">
            Bez kreditní karty · Zrušení kdykoliv · Sešit a aplikace se skvěle doplňují
          </p>
        </div>
      </section>

      {/* ── MINI FOOTER ─────────────────────────────────────────────── */}
      <div className="bg-white border-t border-gray-100 text-center py-5 text-xs text-gray-400">
        MateMax © 2026 · by Karel Tůma · Matematika Snadno ·{" "}
        <Link href="/report-preview" className="hover:underline">Report preview</Link>
      </div>
    </div>
  );
}
