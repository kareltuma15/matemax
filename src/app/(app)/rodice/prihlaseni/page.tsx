"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function RodicePrihlaseni() {
  return <Suspense fallback={null}><RodicePrihlaseniObsah /></Suspense>;
}

function RodicePrihlaseniObsah() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Odkaz „Vytvořit účet rodiče“ ze stránky /rodice otevře rovnou registraci
  const rezim = useSearchParams().get("rezim");
  const [mode, setMode] = useState<"login" | "register">(rezim === "registrace" ? "register" : "login");
  const [done, setDone] = useState(false);
  const [obsazeno, setObsazeno] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError("Připojení k databázi není dostupné."); return; }
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          setError(err.message === "Invalid login credentials"
            ? "Nesprávný email nebo heslo."
            : err.message);
          return;
        }
        router.push("/rodice/dashboard");
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) { setError(err.message); return; }
        // E-mail už má účet (nejčastěji účet dítěte). Supabase to neřekne chybou, jen vrátí účet bez identit
        // a žádný potvrzovací e-mail nepřijde, takže rodič dřív čekal marně.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setObsazeno(true);
          return;
        }
        setDone(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-6 items-center text-center pt-6">
        <span className="text-6xl">📬</span>
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>Zkontrolujte email</h2>
          <p className="mt-2 text-slate-500 text-sm leading-relaxed max-w-sm">
            Odeslali jsme potvrzovací odkaz na <strong>{email}</strong>.
            Po kliknutí se budete moci přihlásit.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setDone(false); setMode("login"); }}
          className="text-sm font-semibold underline"
          style={{ color: "#2E6DA4" }}
        >
          Přihlásit se
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
          👨‍👩‍👧
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>
          Rodičovský portál
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sledujte pokrok svého dítěte v přípravě na přijímačky.
        </p>
      </div>

      {/* Toggle login / register */}
      <div className="flex rounded-xl overflow-hidden border border-slate-200">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); }}
            className="flex-1 py-2.5 text-sm font-semibold transition-colors"
            style={{
              background: mode === m ? "#0D1B3E" : "transparent",
              color: mode === m ? "#fff" : "#94a3b8",
            }}
          >
            {m === "login" ? "Přihlásit se" : "Registrovat"}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="vas@email.cz"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Heslo</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400 transition-colors"
          />
          {mode === "register" && (
            <p className="text-[11px] text-slate-400">Minimálně 8 znaků</p>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {obsazeno && mode === "register" && (
          <div className="text-sm rounded-xl px-4 py-3 flex flex-col gap-2" style={{ background: "#fff4f2", border: "1px solid #f7cdc6", color: "#9a2b1c" }} data-testid="rodice-email-obsazeny">
            <p>
              Tento e-mail už v MateMaxu používá jiný účet, nejspíš vašeho dítěte. Týdenní report pak zapnete přímo v jeho profilu: <b>Profil → Týdenní report pro rodiče → Na tento e-mail</b>.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <button type="button" onClick={() => { setMode("login"); setObsazeno(false); }} className="font-bold underline">Přihlásit se tímto e-mailem</button>
              <button type="button" onClick={() => { setEmail(""); setObsazeno(false); }} className="font-bold underline">Použít jiný e-mail</button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full py-3.5 rounded-xl text-white font-extrabold text-base disabled:opacity-50 transition-opacity"
          style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}
        >
          {loading
            ? "Přihlašuji…"
            : mode === "login"
              ? "Přihlásit se →"
              : "Vytvořit účet →"}
        </button>
      </form>

      {/* Info */}
      <div
        className="rounded-xl px-4 py-3 text-sm leading-relaxed"
        style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" }}
      >
        💡 Po přihlášení budete moci propojit svůj účet s dítětem a sledovat jeho pokrok.
      </div>

      <div className="text-center">
        <Link
          href="/rodice/propojeni"
          className="text-sm text-slate-400 hover:text-slate-600 underline"
        >
          Jak propojit účet s dítětem?
        </Link>
      </div>
    </div>
  );
}
