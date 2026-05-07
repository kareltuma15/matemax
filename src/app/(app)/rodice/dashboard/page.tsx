"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type TopicRow = {
  tema: string;
  label: string;
  accuracy: number;
  total: number;
};

type DashboardData = {
  linked: boolean;
  childId?: string;
  childName?: string;
  childEmail?: string;
  weekTotal?: number;
  accuracy?: number | null;
  streak?: number;
  totalXp?: number;
  currentLevel?: string;
  topicTable?: TopicRow[];
  weakestTopic?: TopicRow | null;
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<string, string> = {
  zacatecnik: "Začátečník",
  pokrocily: "Pokročilý",
  expert: "Expert",
  mistr: "Mistr",
};

function topicColor(accuracy: number): { bg: string; text: string; dot: string } {
  if (accuracy >= 70) return { bg: "#f0fdf4", text: "#166534", dot: "#22c55e" };
  if (accuracy >= 40) return { bg: "#fffbeb", text: "#92400e", dot: "#f59e0b" };
  return { bg: "#fef2f2", text: "#991b1b", dot: "#ef4444" };
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function RodiceDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) { setError("Supabase není dostupné."); setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/rodice/prihlaseni"); return; }
      tokenRef.current = session.access_token;

      try {
        const res = await fetch("/api/parent-dashboard", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = (await res.json()) as DashboardData & { error?: string };
        if (!res.ok) { setError(json.error ?? "Chyba při načítání dat."); return; }
        setData(json);
      } catch {
        setError("Nepodařilo se načíst data. Zkuste to znovu.");
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.childId || !message.trim() || !tokenRef.current) return;
    setSendingMsg(true);
    setMsgError(null);

    try {
      const res = await fetch("/api/parent-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({ message: message.trim(), childUserId: data.childId }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) { setMsgError(json.error ?? "Zprávu se nepodařilo odeslat."); return; }
      setMsgSent(true);
      setMessage("");
      setTimeout(() => setMsgSent(false), 4000);
    } finally {
      setSendingMsg(false);
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-60 gap-3">
        <div
          className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin"
          style={{ borderColor: "#2E6DA4", borderTopColor: "transparent", borderWidth: 3 }}
        />
        <p className="text-sm text-slate-400">Načítám data dítěte…</p>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="max-w-sm mx-auto flex flex-col gap-4 pt-8 text-center">
        <span className="text-5xl">⚠️</span>
        <h2 className="text-xl font-extrabold" style={{ color: "#0D1B3E" }}>Nastala chyba</h2>
        <p className="text-sm text-slate-500">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl text-white font-bold"
          style={{ background: "#2E6DA4" }}
        >
          Zkusit znovu
        </button>
      </div>
    );
  }

  // ─── Not linked ─────────────────────────────────────────────────────────────

  if (!data?.linked) {
    return (
      <div className="max-w-sm mx-auto flex flex-col gap-6 items-center text-center pt-8">
        <span className="text-6xl">🔗</span>
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: "#0D1B3E" }}>Žádné propojené dítě</h2>
          <p className="mt-2 text-slate-500 text-sm leading-relaxed">
            Dosud nemáte propojený účet s žádným dítětem.
            Propojení trvá méně než minutu.
          </p>
        </div>
        <Link
          href="/rodice/propojeni"
          className="w-full py-4 rounded-2xl text-white font-extrabold text-base text-center shadow-md"
          style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}
        >
          Propojit s dítětem →
        </Link>
      </div>
    );
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  const { childName, weekTotal = 0, accuracy, streak = 0, totalXp = 0, currentLevel = "zacatecnik", topicTable = [], weakestTopic } = data;

  return (
    <div className="min-h-screen pb-10" style={{ background: "#F8FAFF" }}>

      {/* Hero */}
      <div
        className="px-5 pt-10 pb-8"
        style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}
      >
        <div className="max-w-md mx-auto">
          <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-2">Přehled pokroku</p>
          <h1 className="text-3xl font-extrabold text-white">{childName}</h1>
          <div className="flex items-center gap-4 mt-3">
            <span className="text-sm text-blue-200">🔥 Streak: <strong className="text-white">{streak} dní</strong></span>
            <span className="text-sm text-blue-200">⭐ Level: <strong className="text-white">{LEVEL_LABELS[currentLevel] ?? currentLevel}</strong></span>
          </div>
          <p className="text-blue-300 text-xs mt-2">{totalXp} XP celkem</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-5 flex flex-col gap-5">

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
            <p className="text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>{weekTotal}</p>
            <p className="text-xs text-slate-400 mt-1 leading-tight">Příkladů<br />tento týden</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
            {accuracy !== null && accuracy !== undefined ? (
              <>
                <p
                  className="text-3xl font-extrabold"
                  style={{ color: accuracy >= 70 ? "#16a34a" : accuracy >= 40 ? "#d97706" : "#dc2626" }}
                >
                  {accuracy} %
                </p>
                <p className="text-xs text-slate-400 mt-1 leading-tight">Úspěšnost<br />tento týden</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-extrabold text-slate-300">—</p>
                <p className="text-xs text-slate-400 mt-1 leading-tight">Úspěšnost<br />(žádné session)</p>
              </>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
            {weakestTopic ? (
              <>
                <p className="text-sm font-extrabold leading-snug" style={{ color: "#0D1B3E" }}>{weakestTopic.label}</p>
                <p className="text-xs text-red-500 font-bold mt-1">{weakestTopic.accuracy} %</p>
                <p className="text-xs text-slate-400 mt-0.5">Nejslabší téma</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-extrabold text-slate-300">—</p>
                <p className="text-xs text-slate-400 mt-1 leading-tight">Nejslabší<br />téma</p>
              </>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
            <p className="text-3xl font-extrabold text-orange-500">🔥 {streak}</p>
            <p className="text-xs text-slate-400 mt-1 leading-tight">Streak<br />(dní v řadě)</p>
          </div>
        </div>

        {/* Topic table */}
        {topicTable.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Výsledky podle témat</p>
            </div>
            <div className="divide-y divide-slate-50">
              {topicTable.map((row) => {
                const c = topicColor(row.accuracy);
                return (
                  <div key={row.tema} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                      <span className="text-sm text-slate-700">{row.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: c.bg, color: c.text }}
                      >
                        {row.accuracy} %
                      </span>
                      <span className="text-xs text-slate-300">{row.total}×</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-2.5 flex gap-4 text-xs text-slate-400 border-t border-slate-50">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> ≥ 70 % zvládá</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 40–70 %</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> &lt; 40 % slabé</span>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl px-5 py-4"
            style={{ background: "#f8faff", border: "1px solid #e2e8f0" }}
          >
            <p className="text-sm font-bold mb-1" style={{ color: "#0D1B3E" }}>Výsledky podle témat</p>
            <p className="text-sm text-slate-400">
              Data se zobrazí po prvním tréninku dítěte v MateMax.
            </p>
          </div>
        )}

        {/* Recommendation */}
        {weakestTopic && (
          <div
            className="rounded-2xl px-5 py-4 flex items-start gap-3"
            style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
          >
            <span className="text-xl mt-0.5">💡</span>
            <div>
              <p className="text-sm font-bold" style={{ color: "#1d4ed8" }}>Doporučení pro dítě</p>
              <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                Doporučujeme zaměřit se na <strong>{weakestTopic.label}</strong> ({weakestTopic.accuracy}% úspěšnost).
                Toto téma se nejčastěji objevuje v přijímacích testech.
              </p>
            </div>
          </div>
        )}

        {/* Message box */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm font-bold mb-1" style={{ color: "#0D1B3E" }}>Vzkaz pro dítě</p>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Napište motivační zprávu — dítě ji uvidí na svém dashboardu.
          </p>
          <form onSubmit={sendMessage} className="flex flex-col gap-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 200))}
              placeholder="Např: Makej dál, věřím ti! 💪"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400 transition-colors resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{message.length}/200</span>
              <button
                type="submit"
                disabled={sendingMsg || !message.trim()}
                className="px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50 transition-opacity"
                style={{ background: "#2E6DA4" }}
              >
                {sendingMsg ? "Odesílám…" : "Odeslat vzkaz"}
              </button>
            </div>
            {msgSent && (
              <p className="text-sm font-semibold text-green-600">
                ✅ Vzkaz byl odeslán!
              </p>
            )}
            {msgError && (
              <p className="text-sm text-red-600">{msgError}</p>
            )}
          </form>
        </div>

        {/* Settings link */}
        <Link
          href="/rodice/nastaveni"
          className="flex items-center justify-between px-5 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            <span className="text-sm font-semibold" style={{ color: "#0D1B3E" }}>Nastavení reportů</span>
          </div>
          <span className="text-slate-300 text-lg">→</span>
        </Link>

      </div>
    </div>
  );
}
