"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function RegistracePage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

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

    // If session exists immediately (email confirmation disabled), redirect
    if (data.session) {
      router.push("/trenink");
    } else {
      // Email confirmation required
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-7 flex flex-col gap-5">
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
