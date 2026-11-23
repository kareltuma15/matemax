"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Stav = "odeslano" | "uz_ceka" | "uz_overeno";

/** Formulář rodiče „Propojit s dítětem“: pošle žádost, kterou pak musí potvrdit dítě (stránka /rodice/propojeni, náhled /nahled?propojit=1). */
export default function PropojitDite() {
  const router = useRouter();
  const [childEmail, setChildEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ email: string; stav: Stav } | null>(null);
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

      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; stav?: Stav };

      if (!res.ok) {
        setError(json.error ?? "Nepodařilo se propojit účet.");
        return;
      }

      setSuccess({ email: childEmail.trim(), stav: json.stav ?? "odeslano" });
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
    const overeno = success.stav === "uz_overeno";
    return (
      <div className="max-w-sm mx-auto flex flex-col gap-6 items-center text-center pt-8" data-testid="propojeni-odeslano" data-stav={success.stav}>
        <span className="text-6xl">{overeno ? "🔗" : "⏳"}</span>
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            {overeno ? "Už jste propojeni" : "Čeká na potvrzení dítětem"}
          </h2>
          <p className="mt-2 text-slate-500 text-sm leading-relaxed break-words">
            {overeno ? (
              <>Účet <strong>{success.email}</strong> už propojení potvrdil. Přehled najdete na dashboardu.</>
            ) : (
              <>
                Žádost o propojení s účtem <strong>{success.email}</strong> {success.stav === "uz_ceka" ? "už čeká" : "jsme odeslali"}.
                Až se dítě přihlásí do MateMaxu, uvidí ji na Domově a potvrdí. Do té doby z jeho účtu neuvidíte žádná data.
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/rodice/dashboard")}
          className="w-full py-4 rounded-2xl text-white font-extrabold text-base shadow-md transition-transform active:scale-95"
          style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}
        >
          Přejít na dashboard →
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
          Zadejte e-mail, pod kterým je dítě registrované v MateMaxu.
          Až dítě propojení potvrdí, uvidíte jeho pokrok.
        </p>
      </div>

      {/* How it works */}
      <div
        className="rounded-xl px-4 py-4 flex flex-col gap-3"
        style={{ background: "#f8faff", border: "1px solid #e2e8f0" }}
      >
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#2E6DA4" }}>Jak to funguje</p>
        {[
          { icon: "1️⃣", text: "Zadejte e-mail dítěte z MateMax účtu" },
          { icon: "2️⃣", text: "Dítě po přihlášení uvidí na Domově vaši žádost" },
          { icon: "3️⃣", text: "Když ji potvrdí, uvidíte jeho přehled" },
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
          <label htmlFor="email-ditete" className="text-xs font-medium text-slate-500">E-mail dítěte (MateMax účet)</label>
          <input
            id="email-ditete"
            type="email"
            value={childEmail}
            onChange={(e) => setChildEmail(e.target.value)}
            required
            placeholder="dite@email.cz"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400 transition-colors"
          />
          <p className="text-[11px] text-slate-400">
            E-mail, pod kterým je dítě zaregistrované v MateMaxu
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
          {loading ? "Odesílám…" : "Poslat žádost o propojení →"}
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
