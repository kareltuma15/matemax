"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Přihlášení není dostupné – chybí konfigurace.");
      return;
    }
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (authError) {
      setError(authError.message === "Invalid login credentials"
        ? "Špatný email nebo heslo."
        : authError.message);
      return;
    }
    const next = searchParams.get("next");
    router.push(next && next.startsWith("/") ? next : "/trenink");
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
          <label className="text-xs font-medium text-slate-500">Heslo</label>
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
