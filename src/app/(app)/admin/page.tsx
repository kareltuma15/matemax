"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { AdminUser } from "@/app/api/admin/users/route";

interface Stats {
  totalUsers: number;
  newThisWeek: number;
  totalSessions: number;
  activeToday: number;
  avgFeedback: number | null;
  feedbackCount: number;
}

const LEVEL_LABELS: Record<string, string> = {
  zacatecnik: "Začátečník",
  pokrocily: "Pokročilý",
  zdatny: "Zdatný",
  expert: "Expert",
  mistr: "Mistr",
  legenda: "Legenda",
};

const LEVEL_COLORS: Record<string, string> = {
  zacatecnik: "#94a3b8",
  pokrocily: "#60a5fa",
  zdatny: "#34d399",
  expert: "#f59e0b",
  mistr: "#f97316",
  legenda: "#a78bfa",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>{label}</div>
      <div className="text-3xl font-black" style={{ color: "#0D1B3E" }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: "#94a3b8" }}>{sub}</div>}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [resetting, setResetting] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async (tok: string) => {
    const headers = { Authorization: `Bearer ${tok}` };
    const [statsRes, usersRes] = await Promise.all([
      fetch("/api/admin/stats", { headers }),
      fetch("/api/admin/users", { headers }),
    ]);

    if (statsRes.status === 403 || usersRes.status === 403) {
      setError("Přístup odepřen — nejsi admin.");
      return;
    }
    if (!statsRes.ok || !usersRes.ok) {
      setError("Chyba při načítání dat.");
      return;
    }

    const [s, u] = await Promise.all([statsRes.json(), usersRes.json()]);
    setStats(s);
    setUsers(u.users ?? []);
  }, []);

  useEffect(() => {
    if (!supabase) { setError("Supabase není dostupné."); setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace("/prihlaseni"); return; }
      const tok = data.session.access_token;
      setToken(tok);
      try {
        await fetchData(tok);
      } catch {
        setError("Nepodařilo se načíst data.");
      } finally {
        setLoading(false);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleResetDiag(userId: string, email: string) {
    if (!token) return;
    if (!confirm(`Opravdu resetovat diagnostiku pro ${email}?`)) return;
    setResetting(userId);
    try {
      const res = await fetch("/api/admin/reset-diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const j = await res.json();
        alert("Chyba: " + (j.error ?? "neznámá"));
        return;
      }
      setResetDone((prev) => new Set([...prev, userId]));
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, diagDone: false } : u));
    } finally {
      setResetting(null);
    }
  }

  async function handleRefresh() {
    if (!token) return;
    setLoading(true);
    await fetchData(token).catch(() => {});
    setLoading(false);
  }

  const filtered = users.filter((u) =>
    search === "" || u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-400 text-sm">Načítám admin panel…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "#fff", border: "1px solid #fca5a5" }}>
        <div className="text-2xl mb-2">🔒</div>
        <div className="font-bold text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#93c5fd" }}>Admin panel</div>
            <div className="text-2xl font-black text-white">MateMax Dashboard</div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/testy"
              className="rounded-xl px-3 py-2 text-xs font-bold"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
            >
              📝 Testy
            </Link>
            <button
              onClick={handleRefresh}
              className="rounded-xl px-3 py-2 text-xs font-bold"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
            >
              ↻ Obnovit
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Celkem uživatelů" value={stats.totalUsers} />
          <StatCard label="Noví tento týden" value={stats.newThisWeek} />
          <StatCard label="Aktivní dnes" value={stats.activeToday} />
          <StatCard label="Sessions celkem" value={stats.totalSessions} />
          <StatCard
            label="Avg. hodnocení"
            value={stats.avgFeedback !== null ? `${stats.avgFeedback} ⭐` : "—"}
            sub={stats.feedbackCount > 0 ? `${stats.feedbackCount} odpovědí` : "Žádná zpětná vazba"}
          />
          <StatCard
            label="Diagnostika splněna"
            value={`${users.filter((u) => u.diagDone).length} / ${users.length}`}
            sub="uživatelů"
          />
        </div>
      )}

      {/* User table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
        <div className="px-4 py-3 flex items-center gap-3" style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div className="font-bold text-sm" style={{ color: "#0D1B3E" }}>
            Uživatelé ({filtered.length})
          </div>
          <input
            type="text"
            placeholder="Hledat email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto rounded-lg px-3 py-1.5 text-sm border outline-none"
            style={{ borderColor: "#cbd5e1", color: "#0D1B3E", background: "#fff", width: 180 }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: "#94a3b8" }}>Email</th>
                <th className="text-center px-3 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: "#94a3b8" }}>Sessions</th>
                <th className="text-center px-3 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: "#94a3b8" }}>Streak</th>
                <th className="text-center px-3 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: "#94a3b8" }}>Level</th>
                <th className="text-center px-3 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: "#94a3b8" }}>XP</th>
                <th className="text-center px-3 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: "#94a3b8" }}>Diag</th>
                <th className="text-center px-3 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: "#94a3b8" }}>Akce</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr
                  key={u.id}
                  style={{
                    background: i % 2 === 0 ? "#fff" : "#f8fafc",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: "#0D1B3E", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.email}
                    </div>
                    <div className="text-xs" style={{ color: "#94a3b8" }}>
                      {u.lastSession ? `Naposledy: ${u.lastSession}` : `Reg: ${u.createdAt.slice(0, 10)}`}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center font-bold" style={{ color: "#0D1B3E" }}>{u.sessionCount}</td>
                  <td className="px-3 py-3 text-center font-bold" style={{ color: u.streak >= 3 ? "#f97316" : "#64748b" }}>
                    {u.streak > 0 ? `🔥 ${u.streak}` : "—"}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ background: `${LEVEL_COLORS[u.level] ?? "#94a3b8"}22`, color: LEVEL_COLORS[u.level] ?? "#94a3b8" }}
                    >
                      {LEVEL_LABELS[u.level] ?? u.level}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-xs font-semibold" style={{ color: "#64748b" }}>{u.totalXp}</td>
                  <td className="px-3 py-3 text-center">
                    {u.diagDone
                      ? <span className="text-green-600 font-bold text-xs">✓</span>
                      : <span className="text-slate-300 text-xs">—</span>
                    }
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => handleResetDiag(u.id, u.email)}
                      disabled={resetting === u.id || resetDone.has(u.id)}
                      className="rounded-lg px-2 py-1 text-xs font-bold transition-opacity disabled:opacity-40"
                      style={{ background: "#fee2e2", color: "#dc2626" }}
                    >
                      {resetting === u.id ? "…" : resetDone.has(u.id) ? "✓ Reset" : "Reset diag"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-sm" style={{ color: "#94a3b8" }}>
                    Žádní uživatelé nenalezeni
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
