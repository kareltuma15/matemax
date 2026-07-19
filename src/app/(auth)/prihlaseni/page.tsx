"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getSmartRedirect } from "@/lib/smart-redirect";
import { hydrateFromRemote } from "@/lib/storage";

export default function PrihlaseniPage() {
  return (
    <Suspense>
      <PrihlaseniForm />
    </Suspense>
  );
}

function PrihlaseniForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleLogin() {
    if (!supabase) return;
    setGoogleLoading(true);
    const next = searchParams.get("next") ?? "/trenink";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setGoogleLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Přihlášení není dostupné – chybí konfigurace.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setLoading(false);
        setError(authError.message === "Invalid login credentials"
          ? "Špatný email nebo heslo."
          : authError.message);
        return;
      }

      // Obnov postup ze serveru DŘÍV, než se rozhodne kam jít. Odhlášení maže
      // localStorage a getSmartRedirect z něj čte — bez tohoto kroku by vracející
      // se žák vypadal jako nový a poslali bychom ho na „Vítej + diagnostika",
      // kterou má dávno hotovou.
      if (data.user) await hydrateFromRemote(data.user.id);

      setLoading(false);
      const next = searchParams.get("next");
      // Explicit ?next= param (e.g. from protected route) takes priority; otherwise smart redirect
      const destination = next && next.startsWith("/") ? next : getSmartRedirect();
      // Full page reload needed so server components + proxy see the fresh session cookie
      window.location.href = destination;
    } catch (err) {
      setLoading(false);
      setError("Přihlášení se nezdařilo, zkus to znovu.");
      console.error("[login]", err);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-7 flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#0D1B3E" }}>Přihlásit se</h1>
        <p className="text-sm text-slate-400 mt-0.5">Pokračuj ve svém tréninku</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="tvuj@email.cz"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-medium text-slate-500">Heslo</label>
            <Link href="/zapomenute-heslo" className="text-xs" style={{ color: "#2E6DA4" }}>
              Zapomenuté heslo?
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-white font-semibold rounded-xl text-sm disabled:opacity-60 transition-opacity mt-1"
          style={{ background: "#0D1B3E" }}
        >
          {loading ? "Přihlašuji…" : "Přihlásit se →"}
        </button>
      </form>

      {/* Google OAuth */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 font-medium">nebo</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {googleLoading ? "Přesměrovávám…" : "Přihlásit se přes Google"}
      </button>

      <div className="text-center text-sm text-slate-400">
        Nemáš účet?{" "}
        <Link href="/registrace" className="font-semibold" style={{ color: "#2E6DA4" }}>
          Registrovat se
        </Link>
      </div>

      <Link
        href="/"
        className="block text-center text-xs text-slate-300 hover:text-slate-400 transition-colors"
      >
        ← Zpět na úvod
      </Link>
    </div>
  );
}
