"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PENDING_REF_KEY } from "@/lib/referral";

export default function RegistraceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [done, setDone]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) localStorage.setItem(PENDING_REF_KEY, ref.toUpperCase());
  }, [searchParams]);

  async function handleGoogleSignup() {
    if (!supabase) return;
    setGoogleLoading(true);
    const ref = searchParams.get("ref");
    const next = ref ? `/vitej?ref=${encodeURIComponent(ref)}` : "/vitej";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setGoogleLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Registrace není dostupná – chybí konfigurace.");
      return;
    }
    if (password !== confirm) {
      setError("Hesla se neshodují.");
      return;
    }
    if (password.length < 6) {
      setError("Heslo musí mít alespoň 6 znaků.");
      return;
    }
    setError(null);
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (authError) {
      setError(authError.message === "User already registered"
        ? "Tento email je již registrován."
        : authError.message);
      return;
    }

    if (data.user) {
      const firstName = data.user?.user_metadata?.full_name?.split(" ")[0] ?? "";
      fetch("/api/welcome-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName }),
      }).catch(() => {});
    }

    if (data.session) {
      supabase
        .from("user_onboarding")
        .upsert(
          { user_id: data.session.user.id, current_state: "registered" },
          { onConflict: "user_id" }
        )
        .then(() => {});

      router.push("/vitej");
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-7 flex flex-col gap-5 text-center">
        <div className="text-4xl">📬</div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#0D1B3E" }}>Zkontroluj email</h2>
          <p className="text-sm text-slate-500 mt-2">
            Poslali jsme ti potvrzovací link na <strong>{email}</strong>.
            Po kliknutí se přihlas a začni trénovat.
          </p>
        </div>
        <Link
          href="/prihlaseni"
          className="w-full py-3 text-white font-semibold rounded-xl text-sm text-center"
          style={{ background: "#0D1B3E" }}
        >
          Přejít na přihlášení →
        </Link>
      </div>
    );
  }

  const refCode = searchParams.get("ref");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-7 flex flex-col gap-5">
      {refCode && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-medium"
          style={{ background: "#f0fdf4", border: "1.5px solid #86efac", color: "#166534" }}
        >
          <span className="text-xl">🎁</span>
          <span>Kamarád tě zve! Registruj se a oba dostanete <strong>7 dní Premium zdarma</strong>.</span>
        </div>
      )}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#0D1B3E" }}>Vytvořit účet</h1>
        <p className="text-sm text-slate-400 mt-0.5">Zadarmo, žádná karta nepotřebná</p>
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
          <label className="text-xs font-medium text-slate-500">Heslo</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="alespoň 6 znaků"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Heslo znovu</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          {loading ? "Registruji…" : "Vytvořit účet →"}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 font-medium">nebo</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {googleLoading ? "Přesměrovávám…" : "Registrovat se přes Google"}
      </button>

      <div className="text-center text-sm text-slate-400">
        Máš účet?{" "}
        <Link href="/prihlaseni" className="font-semibold" style={{ color: "#2E6DA4" }}>
          Přihlásit se
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
