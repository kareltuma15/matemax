"use client";

import { useState } from "react";
import Link from "next/link";

export default function RodicePage() {
  const [parentEmail, setParentEmail] = useState("");
  const [childEmail, setChildEmail]   = useState("");
  const [consent, setConsent]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError("Prosím potvrďte souhlas se zpracováním emailu.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/parent-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentEmail, childEmail }),
      });
      if (!res.ok) throw new Error("Chyba serveru");
      setDone(true);
    } catch {
      setError("Nepodařilo se uložit. Zkuste to znovu.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center flex flex-col gap-4">
        <div className="text-5xl">📬</div>
        <div>
          <h2 className="text-xl font-black" style={{ color: "#0D1B3E" }}>Přihlášení úspěšné!</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Každé pondělí vám pošleme přehled o pokroku na <strong>{parentEmail}</strong>.
          </p>
        </div>
        <div
          className="rounded-xl p-4 text-sm leading-relaxed"
          style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}
        >
          ✅ Potvrzovací email byl odeslán na váš email.
        </div>
        <Link
          href="/"
          className="block w-full py-3 text-white font-semibold rounded-xl text-sm text-center"
          style={{ background: "#0D1B3E" }}
        >
          Zpět na úvod
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
      >
        <p className="text-3xl mb-2">👨‍👩‍👧</p>
        <h1 className="text-2xl font-black leading-tight">Týdenní report pro rodiče</h1>
        <p className="text-blue-200 text-sm mt-2 leading-relaxed">
          Každé pondělí dostanete přehled jak se dítě připravuje na přijímačky.
          Bez zkoušení u večeře — jen fakta z algoritmů.
        </p>
      </div>

      {/* What you get */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
        <p className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Co dostanete každé pondělí</p>
        {[
          { icon: "📊", text: "Kolik příkladů dítě vyřešilo za týden" },
          { icon: "🎯", text: "Kde má mezery a co procvičovat dál" },
          { icon: "🔥", text: "Aktuální streak a motivační trendy" },
          { icon: "✅", text: "Doporučení na příští týden" },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-start gap-3">
            <span className="text-lg shrink-0">{icon}</span>
            <p className="text-sm text-slate-700">{text}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
        <p className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Přihlásit se k odběru</p>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Váš email (rodič)</label>
          <input
            type="email"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            required
            placeholder="vas@email.cz"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Email dítěte (MateMax účet)</label>
          <input
            type="email"
            value={childEmail}
            onChange={(e) => setChildEmail(e.target.value)}
            required
            placeholder="dite@email.cz"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400 transition-colors"
          />
          <p className="text-[11px] text-slate-400">Email, pod kterým je dítě registrované v MateMax</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded"
          />
          <span className="text-xs text-slate-600 leading-relaxed">
            Souhlasím se zpracováním emailové adresy za účelem zasílání týdenního reportu.
            Odhlásit se lze kdykoliv odpovědí na report.
          </span>
        </label>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !parentEmail || !childEmail || !consent}
          className="w-full py-3 text-white font-bold rounded-xl text-sm disabled:opacity-50 transition-opacity"
          style={{ background: "#0D1B3E" }}
        >
          {loading ? "Ukládám…" : "Přihlásit k odběru →"}
        </button>
      </form>

      <p className="text-center text-xs text-slate-400">
        Zdarma · Bez závazku · Odhlášení kdykoliv
      </p>
    </div>
  );
}
