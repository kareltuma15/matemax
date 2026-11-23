"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function RodicePropojeni() {
  const router = useRouter();
  const [childEmail, setChildEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stejny, setStejny] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (!supabase) { setCheckingAuth(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/rodice/prihlaseni");
      else setCheckingAuth(false);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError("Připojení k databázi není dostupné."); return; }
    setError(null);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/rodice/prihlaseni"); return; }

      const res = await fetch("/api/parent-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ childEmail }),
      });

      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; stejnyEmail?: boolean };

      if (!res.ok) {
        setError(json.error ?? "Žádost se nepodařilo odeslat. Zkuste to znovu.");
        return;
      }

      setStejny(!!json.stejnyEmail);
      setSuccess(childEmail.trim());
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-40">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#2E6DA4", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (success) {
    // Stejná odpověď, ať účet s tím e-mailem existuje, nebo ne (nedá se zjišťovat, kdo má v MateMaxu účet).
    return (
      <div className="max-w-sm mx-auto flex flex-col gap-5 pt-8" data-testid="rodice-propojeni-odeslano">
        <span className="text-5xl" aria-hidden="true">{stejny ? "👨‍👩‍👧" : "📨"}</span>
        <h2 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>{stejny ? "Používáte společný e-mail" : "Žádost je odeslaná"}</h2>
        {stejny ? (
          <p className="text-sm text-slate-500 leading-relaxed">
            Jste přihlášeni přímo účtem dítěte. Týdenní report zapnete v jeho profilu: <b>Profil → Týdenní report pro rodiče → Na tento e-mail</b>.
          </p>
        ) : (
          <div className="rounded-2xl p-4 text-sm leading-relaxed" style={{ background: "#ecfdf3", border: "1px solid #bbf0cf", color: "#166534" }}>
            Pokud je dítě v MateMaxu registrované pod e-mailem <b className="break-all">{success}</b>, uvidí žádost při příštím otevření appky. Jakmile ji povolí, uvidíte v rodičovském přehledu jeho pokrok.
          </div>
        )}
        <p className="text-sm text-slate-500">Máte s dítětem společný e-mail? Report zapnete přímo v jeho profilu.</p>
        <button
          type="button"
          onClick={() => router.push(stejny ? "/profil#rodice" : "/rodice/dashboard")}
          className="w-full py-4 rounded-2xl text-white font-extrabold text-base"
          style={{ background: "#0D1B3E" }}
        >
          {stejny ? "Otevřít profil" : "Rodičovský přehled"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-sm mx-auto pt-4">
      {/* Header */}
      <div className="text-center">
        <div
          className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-2xl mb-4"
          style={{ background: "#0D1B3E" }}
        >
          🔗
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>
          Propojit s dítětem
        </h1>
        <p className="mt-1 text-sm text-slate-500 leading-relaxed">
          Zadejte email, pod kterým je dítě registrované v MateMax.
          Dítě pak žádost povolí v appce a vy uvidíte jeho pokrok.
        </p>
      </div>

      {/* How it works */}
      <div
        className="rounded-xl px-4 py-4 flex flex-col gap-3"
        style={{ background: "#f8faff", border: "1px solid #e2e8f0" }}
      >
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#2E6DA4" }}>Jak to funguje</p>
        {[
          { icon: "1️⃣", text: "Zadejte email dítěte z MateMax účtu" },
          { icon: "2️⃣", text: "Dítěti se v appce ukáže vaše žádost" },
          { icon: "3️⃣", text: "Po povolení uvidíte jeho přehled a začne chodit report" },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <span className="text-sm text-slate-600">{text}</span>
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Email dítěte (MateMax účet)</label>
          <input
            type="email"
            value={childEmail}
            onChange={(e) => setChildEmail(e.target.value)}
            required
            placeholder="dite@email.cz"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400 transition-colors"
          />
          <p className="text-[11px] text-slate-400">
            Email, pod kterým je dítě zaregistrované v MateMax
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !childEmail}
          className="w-full py-3.5 rounded-xl text-white font-extrabold text-base disabled:opacity-50 transition-opacity"
          style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}
        >
          {loading ? "Odesílám…" : "Poslat žádost"}
        </button>
      </form>

      <div className="text-center">
        <Link href="/rodice/prihlaseni" className="text-sm text-slate-400 hover:text-slate-600 underline">
          ← Zpět na přihlášení
        </Link>
      </div>
    </div>
  );
}
