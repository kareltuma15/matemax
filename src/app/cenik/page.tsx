"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePremium } from "@/lib/premium";

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
  const router = useRouter();
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistState, setWaitlistState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [trialState, setTrialState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const { isPremium, trialDaysLeft } = usePremium();

  async function handleStartTrial() {
    if (!supabase) { router.push("/registrace"); return; }
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.push("/registrace?trial=1"); return; }
    setTrialState("loading");
    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.session.user.id }),
      });
      setTrialState(res.ok ? "done" : "error");
      if (res.ok) setTimeout(() => router.push("/trenink"), 1500);
    } catch {
      setTrialState("error");
    }
  }

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!waitlistEmail.includes("@")) return;
    setWaitlistState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail }),
      });
      setWaitlistState(res.ok ? "done" : "error");
    } catch {
      setWaitlistState("error");
    }
  }

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

      {/* 7-day trial banner */}
      {!isPremium && (
        <section className="max-w-2xl mx-auto px-6 pb-8">
          <div
            className="rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4"
            style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
          >
            <div className="text-4xl">🎁</div>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-black text-white text-base">Vyzkoušej 7 dní Premium zdarma</p>
              <p className="text-sm mt-0.5" style={{ color: "#93c5fd" }}>
                Bez kreditní karty · Žádný závazek · Zrušení jedním klikem
              </p>
            </div>
            {trialState === "done" ? (
              <div className="shrink-0 px-5 py-2.5 rounded-xl font-black text-sm" style={{ background: "#dcfce7", color: "#166534" }}>
                ✓ Trial aktivován!
              </div>
            ) : (
              <button
                onClick={handleStartTrial}
                disabled={trialState === "loading"}
                className="shrink-0 px-5 py-2.5 rounded-xl font-black text-sm transition-opacity disabled:opacity-60"
                style={{ background: "#fff", color: "#0D1B3E" }}
              >
                {trialState === "loading" ? "Aktivuji…" : "Spustit trial →"}
              </button>
            )}
          </div>
        </section>
      )}

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

            {waitlistState === "done" ? (
              <div
                className="mt-8 w-full py-3.5 rounded-xl text-center font-black text-base"
                style={{ background: "#f0fdf4", color: "#16a34a", border: "2px solid #bbf7d0" }}
              >
                ✅ Zapsáno! Dáme ti vědět jako prvním.
              </div>
            ) : (
              <form onSubmit={handleWaitlist} className="mt-8 flex flex-col gap-2">
                <p className="text-xs text-center font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  🚀 Spuštění brzy — zapiš se na čekací listinu
                </p>
                <input
                  type="email"
                  required
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="tvůj@email.cz"
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-colors"
                  style={{ borderColor: waitlistState === "error" ? "#fca5a5" : "#2E6DA4" }}
                />
                <button
                  type="submit"
                  disabled={waitlistState === "loading"}
                  className="w-full py-3.5 text-white font-black rounded-xl text-base transition-opacity disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
                >
                  {waitlistState === "loading" ? "Ukládám…" : "Chci být první →"}
                </button>
                {waitlistState === "error" && (
                  <p className="text-xs text-center text-red-500">Něco se pokazilo, zkus to znovu.</p>
                )}
              </form>
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
