"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ZapomneteHesloPage() {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Přihlášení není dostupné – chybí konfigurace.");
      return;
    }
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/nova-heslo`,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-7 flex flex-col gap-5 text-center">
        <div className="text-4xl">📬</div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#0D1B3E" }}>Email odeslán</h2>
          <p className="text-sm text-slate-500 mt-2">
            Zkontroluj svůj email <strong>{email}</strong> a klikni na odkaz pro reset hesla.
          </p>
        </div>
        <Link
          href="/prihlaseni"
          className="w-full py-3 text-white font-semibold rounded-xl text-sm text-center"
          style={{ background: "#0D1B3E" }}
        >
          Zpět na přihlášení
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-7 flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#0D1B3E" }}>Zapomenuté heslo</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Zadej svůj email a pošleme ti odkaz pro reset hesla.
        </p>
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
          {loading ? "Odesílám…" : "Odeslat odkaz →"}
        </button>
      </form>

      <div className="text-center text-sm text-slate-400">
        Vzpomněl sis?{" "}
        <Link href="/prihlaseni" className="font-semibold" style={{ color: "#2E6DA4" }}>
          Přihlásit se
        </Link>
      </div>
    </div>
  );
}
