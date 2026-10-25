"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { AdminUser } from "@/app/api/admin/users/route";
import type { AdminUserDetail } from "@/app/api/admin/user-detail/route";
import { TEMA_LABELS } from "@/types";

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
      <div className="text-3xl font-black" style={{ color: "var(--text-primary)" }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: "#94a3b8" }}>{sub}</div>}
    </div>
  );
}

const EVENT_LABELS: Record<string, string> = {
  session_completed: "dokončil trénink",
  diagnostika_dokoncena: "dokončil diagnostiku",
};

function UserDetailPanel({ detail }: { detail: AdminUserDetail | "chyba" | undefined }) {
  if (!detail) return <div className="text-sm" style={{ color: "#94a3b8" }}>Načítám…</div>;
  if (detail === "chyba") return <div className="text-sm text-red-600">Detail se nepodařilo načíst.</div>;
  const box = "rounded-xl p-3 bg-white border border-slate-200";
  const h = "text-xs font-bold uppercase tracking-widest mb-2";
  return (
    <div className="grid gap-3 md:grid-cols-3 text-sm" style={{ color: "var(--text-primary)" }}>
      <div className={box}>
        <div className={h} style={{ color: "#94a3b8" }}>Diagnostika podle témat</div>
        {detail.diagnostics.length === 0 ? <div style={{ color: "#94a3b8" }}>Zatím neudělal.</div> : detail.diagnostics.map((d) => (
          <div key={d.tema} className="flex justify-between gap-2"><span>{TEMA_LABELS[d.tema as keyof typeof TEMA_LABELS] ?? d.tema}</span><b>{d.correct} / {d.total}</b></div>
        ))}
      </div>
      <div className={box}>
        <div className={h} style={{ color: "#94a3b8" }}>Posledních 10 tréninků</div>
        {detail.sessions.length === 0 ? <div style={{ color: "#94a3b8" }}>Zatím žádný.</div> : detail.sessions.map((s, i) => (
          <div key={i} className="flex justify-between gap-2"><span>{s.date}</span><span>{s.correct} / {s.total} správně · {s.xp} XP</span></div>
        ))}
      </div>
      <div className={box}>
        <div className={h} style={{ color: "#94a3b8" }}>Shrnutí</div>
        <div>Úroveň: <b>{detail.xp ? `${LEVEL_LABELS[detail.xp.level] ?? detail.xp.level} (${detail.xp.total} XP, série ${detail.xp.streak})` : "—"}</b></div>
        <div>Odznaky: <b>{detail.badges}</b> · Opakovací karty: <b>{detail.cards}</b></div>
        <div>Onboarding: <b>{detail.onboarding ?? "—"}</b> · Propojení s rodičem: <b>{detail.parentLinks}</b></div>
        {detail.events.length > 0 && (
          <div className="mt-2" style={{ color: "#64748b" }}>
            Poslední akce: {detail.events.slice(0, 4).map((e) => `${EVENT_LABELS[e.name] ?? e.name} (${e.at.slice(0, 10)})`).join(", ")}
          </div>
        )}
      </div>
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
  const [resetAsk, setResetAsk] = useState<{ id: string; error: string | null } | null>(null);
  const [premiumBusy, setPremiumBusy] = useState<string | null>(null);
  const [premiumAsk, setPremiumAsk] = useState<{ id: string; revoke: boolean; until: string; error: string | null } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, AdminUserDetail | "chyba">>({});

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

  // Potvrzení přímo ve stránce (ne přes confirm/alert — blokují hlavní vlákno a kazí INP).
  function openResetAsk(userId: string) {
    setResetAsk((cur) => (cur?.id === userId ? null : { id: userId, error: null }));
  }

  async function handleResetDiag(userId: string) {
    if (!token) return;
    setResetting(userId);
    try {
      const res = await fetch("/api/admin/reset-diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setResetAsk({ id: userId, error: j.error ?? "Neznámá chyba" });
        return;
      }
      setResetDone((prev) => new Set([...prev, userId]));
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, diagDone: false } : u));
      setResetAsk(null);
    } finally {
      setResetting(null);
    }
  }

  /** Ruční udělení / odebrání Premium (zákazníci plánů z webu bez Stripe předplatného). */
  // Potvrzení a datum se zadávají přímo ve stránce (ne přes prompt/confirm — ty blokují hlavní vlákno a kazí INP).
  function openPremiumAsk(u: AdminUser) {
    const revoke = u.plan === "paid" || u.source === "manual";
    setPremiumAsk((cur) => (cur?.id === u.id ? null : { id: u.id, revoke, until: "", error: null }));
  }

  async function submitPremium(u: AdminUser) {
    if (!token || !premiumAsk || premiumAsk.id !== u.id) return;
    const { revoke, until } = premiumAsk;
    setPremiumBusy(u.id);
    try {
      const res = await fetch("/api/admin/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: u.id, action: revoke ? "revoke" : "grant", until: until.trim() === "" ? null : until.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPremiumAsk((cur) => (cur ? { ...cur, error: j.error ?? "Neznámá chyba" } : cur));
        return;
      }
      setUsers((prev) => prev.map((x) => x.id === u.id
        ? { ...x, plan: j.plan, trialUntil: j.trialUntil ?? null, source: j.plan === "free" ? null : "manual" }
        : x));
      setPremiumAsk(null);
    } finally {
      setPremiumBusy(null);
    }
  }

  async function toggleDetail(id: string) {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    if (!token || details[id]) return;
    try {
      const res = await fetch(`/api/admin/user-detail?id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const value: AdminUserDetail | "chyba" = res.ok ? ((await res.json()) as AdminUserDetail) : "chyba";
      setDetails((d) => ({ ...d, [id]: value }));
    } catch {
      setDetails((d) => ({ ...d, [id]: "chyba" }));
    }
  }

  async function handleRefresh() {
    if (!token) return;
    setLoading(true);
    await fetchData(token).catch(() => {});
    setLoading(false);
  }

  const filtered = users.filter((u) =>
    search === "" || u.email.toLowerCase().includes(search.toLowerCase()) || (u.name ?? "").toLowerCase().includes(search.toLowerCase())
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
          <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            Uživatelé ({filtered.length})
          </div>
          <input
            type="text"
            placeholder="Hledat jméno nebo e-mail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto rounded-lg px-3 py-1.5 text-sm border outline-none"
            style={{ borderColor: "#cbd5e1", color: "var(--text-primary)", background: "#fff", width: 180 }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: "#94a3b8" }}>Uživatel</th>
                <th className="text-center px-3 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: "#94a3b8" }}>Plán</th>
                <th className="text-center px-3 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: "#94a3b8" }}>Úspěšnost</th>
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
                <Fragment key={u.id}>
                <tr
                  style={{
                    background: i % 2 === 0 ? "#fff" : "#f8fafc",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <td className="px-4 py-3 cursor-pointer" onClick={() => toggleDetail(u.id)} title="Klikni pro detail">
                    {u.name && (
                      <div className="font-bold" style={{ color: "var(--text-primary)" }}>
                        {u.name}
                        <span className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold align-middle" style={{ background: u.trida === 5 ? "#fef3c7" : "#eff6ff", color: u.trida === 5 ? "#92400e" : "#2E6DA4" }}>{u.trida}. tř.</span>
                      </div>
                    )}
                    {!u.name && (
                      <div className="text-[10px] font-bold" style={{ color: u.trida === 5 ? "#92400e" : "#2E6DA4" }}>{u.trida}. třída</div>
                    )}
                    <div className="font-medium" style={{ color: "var(--text-primary)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.email}
                    </div>
                    <div className="text-xs" style={{ color: "#94a3b8" }}>
                      Reg: {u.createdAt.slice(0, 10)} · {u.lastSession ? `trénink: ${u.lastSession}` : "zatím netrénoval"}{u.lastLogin ? ` · přihlášen: ${u.lastLogin.slice(0, 10)}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ background: u.plan === "paid" ? "#dcfce7" : u.plan === "trial" ? "#fef3c7" : "#f1f5f9", color: u.plan === "paid" ? "#166534" : u.plan === "trial" ? "#92400e" : "#64748b" }}
                    >
                      {u.plan === "paid"
                        ? (u.source === "stripe" ? "Premium (Stripe)" : u.source === "manual" ? "Premium (ručně)" : "Premium")
                        : u.plan === "trial"
                          ? `${u.source === "manual" ? "Ručně do" : "Trial do"} ${(u.trialUntil ?? "").slice(0, 10)}`
                          : "Zdarma"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-xs font-semibold" style={{ color: "#64748b" }}>
                    {u.answered > 0 ? `${Math.round((u.correct / u.answered) * 100)} % z ${u.answered}` : "—"}
                  </td>
                  <td className="px-3 py-3 text-center font-bold" style={{ color: "var(--text-primary)" }}>{u.sessionCount}</td>
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
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {u.source === "stripe" ? (
                      <span className="mr-1 rounded-lg px-2 py-1 text-xs font-bold" style={{ background: "#f1f5f9", color: "#64748b" }} title="Platí přes Stripe — spravuje se tam">
                        Stripe
                      </span>
                    ) : (
                      <button
                        onClick={() => openPremiumAsk(u)}
                        disabled={premiumBusy === u.id}
                        className="mr-1 rounded-lg px-2 py-1 text-xs font-bold transition-opacity disabled:opacity-40"
                        style={u.plan === "paid" || u.source === "manual" ? { background: "#fef3c7", color: "#92400e" } : { background: "#dcfce7", color: "#166534" }}
                      >
                        {premiumBusy === u.id ? "…" : u.plan === "paid" || u.source === "manual" ? "Odebrat Premium" : "Udělit Premium"}
                      </button>
                    )}
                    <button
                      onClick={() => openResetAsk(u.id)}
                      disabled={resetting === u.id || resetDone.has(u.id)}
                      className="rounded-lg px-2 py-1 text-xs font-bold transition-opacity disabled:opacity-40"
                      style={{ background: "#fee2e2", color: "#dc2626" }}
                    >
                      {resetting === u.id ? "…" : resetDone.has(u.id) ? "✓ Reset" : "Reset diag"}
                    </button>
                  </td>
                </tr>
                {resetAsk?.id === u.id && (
                  <tr style={{ background: "#fef2f2", borderBottom: "1px solid #fecaca" }}>
                    <td colSpan={9} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                        <span>Opravdu resetovat diagnostiku pro <b>{u.email}</b>? Smaže se její výsledek a uživatel ji bude dělat znovu.</span>
                        <button
                          onClick={() => handleResetDiag(u.id)}
                          disabled={resetting === u.id}
                          className="rounded-lg px-3 py-1 text-xs font-bold disabled:opacity-40"
                          style={{ background: "#fee2e2", color: "#dc2626" }}
                        >
                          {resetting === u.id ? "…" : "Resetovat"}
                        </button>
                        <button
                          onClick={() => setResetAsk(null)}
                          className="rounded-lg px-3 py-1 text-xs font-bold"
                          style={{ background: "#f1f5f9", color: "#64748b" }}
                        >
                          Zrušit
                        </button>
                        {resetAsk.error && <span className="text-xs font-semibold text-red-600">{resetAsk.error}</span>}
                      </div>
                    </td>
                  </tr>
                )}
                {premiumAsk?.id === u.id && (
                  <tr style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a" }}>
                    <td colSpan={9} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                        {premiumAsk.revoke ? (
                          <span>Odebrat Premium uživateli <b>{u.email}</b>?</span>
                        ) : (
                          <>
                            <span>Udělit Premium uživateli <b>{u.email}</b> do:</span>
                            <input
                              type="date"
                              value={premiumAsk.until}
                              onChange={(e) => setPremiumAsk((cur) => (cur ? { ...cur, until: e.target.value, error: null } : cur))}
                              className="rounded-lg border px-2 py-1 text-sm"
                              style={{ borderColor: "#cbd5e1" }}
                              aria-label="Premium do data (prázdné = bez omezení)"
                            />
                            <span className="text-xs" style={{ color: "#94a3b8" }}>prázdné = bez omezení</span>
                          </>
                        )}
                        <button
                          onClick={() => submitPremium(u)}
                          disabled={premiumBusy === u.id}
                          className="rounded-lg px-3 py-1 text-xs font-bold disabled:opacity-40"
                          style={premiumAsk.revoke ? { background: "#fef3c7", color: "#92400e" } : { background: "#dcfce7", color: "#166534" }}
                        >
                          {premiumBusy === u.id ? "…" : premiumAsk.revoke ? "Odebrat" : "Udělit"}
                        </button>
                        <button
                          onClick={() => setPremiumAsk(null)}
                          className="rounded-lg px-3 py-1 text-xs font-bold"
                          style={{ background: "#f1f5f9", color: "#64748b" }}
                        >
                          Zrušit
                        </button>
                        {premiumAsk.error && <span className="text-xs font-semibold text-red-600">{premiumAsk.error}</span>}
                      </div>
                    </td>
                  </tr>
                )}
                {openId === u.id && (
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <td colSpan={9} className="px-4 py-4">
                      <UserDetailPanel detail={details[u.id]} />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-sm" style={{ color: "#94a3b8" }}>
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
