"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { loadProgress } from "@/lib/progress";
import { loadGamification, getAllBadges, getLevelFromXP, xpToNextLevel } from "@/lib/gamification";
import { localLoadSessions, SessionHistoryEntry } from "@/lib/storage";
import { TEMA_LABELS } from "@/types";
import BadgeGrid from "@/components/BadgeGrid";

const ALL_TOPICS = Object.keys(TEMA_LABELS);

interface TopicScore {
  tema: string;
  score: number;
  correct: number;
  total: number;
}

type Tab = "prehled" | "historie" | "odznaky";

export default function ProfilPage() {
  const router = useRouter();
  const [activeTab, setActiveTab]        = useState<Tab>("prehled");
  const [email, setEmail]                = useState<string | null>(null);
  const [xp, setXp]                      = useState(0);
  const [streak, setStreak]              = useState(0);
  const [totalSolved, setTotalSolved]    = useState(0);
  const [topicScores, setTopicScores]    = useState<TopicScore[]>([]);
  const [earnedBadges, setEarnedBadges]  = useState<string[]>([]);
  const [sessions, setSessions]          = useState<SessionHistoryEntry[]>([]);
  const [showDay2Banner, setShowDay2Banner] = useState(false);
  const [loading, setLoading]            = useState(true);

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setEmail(data.session?.user.email ?? null);
      });
    }

    const p = loadProgress();
    setXp(p.xp);
    setStreak(p.streak);

    const g = loadGamification();
    setEarnedBadges(g.earnedBadges);
    setTotalSolved(g.totalSolved);

    setSessions(localLoadSessions());

    // Day 2 banner: only if diag done, streak=1, last active yesterday
    const diagDone = localStorage.getItem("matemax-diag-done") === "1";
    if (diagDone && p.streak === 1 && p.lastActiveDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      const firstSessionDone = !!localStorage.getItem("matemax-first-session-done");
      if (p.lastActiveDate === yStr && firstSessionDone) {
        setShowDay2Banner(true);
      }
    }

    try {
      const raw = localStorage.getItem("matemax-diag-results");
      if (raw) {
        const results = JSON.parse(raw) as Record<string, { correct: number; total: number }>;
        const scores: TopicScore[] = Object.entries(results)
          .filter(([, v]) => v.total > 0)
          .map(([tema, v]) => ({ tema, score: v.correct / v.total, correct: v.correct, total: v.total }))
          .sort((a, b) => b.score - a.score);
        setTopicScores(scores);
      }
    } catch { /* ignore */ }

    setLoading(false);
  }, []);

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return <div className="h-48 flex items-center justify-center text-slate-400">Načítám…</div>;
  }

  const level = getLevelFromXP(xp);
  const toNext = xpToNextLevel(xp);
  const levelXP = xp - level.xp_min;
  const levelTotal = level.xp_max !== null ? level.xp_max + 1 - level.xp_min : null;
  const pct = levelTotal !== null ? Math.min(100, Math.round((levelXP / levelTotal) * 100)) : 100;

  const initials = email ? email[0].toUpperCase() : "?";

  const totalCorrect = topicScores.reduce((s, t) => s + t.correct, 0);
  const totalAnswered = topicScores.reduce((s, t) => s + t.total, 0);
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  const strongest = topicScores[0] ?? null;
  const weakest   = topicScores[topicScores.length - 1] ?? null;

  const allBadges = getAllBadges();
  const earnedSet = new Set(earnedBadges);
  const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  const nextBadge = allBadges
    .filter((b) => !earnedSet.has(b.id))
    .sort((a, b) => (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0))[0] ?? null;

  const TAB_LIST: { id: Tab; label: string }[] = [
    { id: "prehled", label: "Přehled" },
    { id: "historie", label: "Historie" },
    { id: "odznaky", label: "Odznaky" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Avatar + email */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-black shrink-0"
          style={{ background: "#0D1B3E" }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: "#0D1B3E" }}>
            {email ?? "Nepřihlášen"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Tvůj MateMax účet</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {TAB_LIST.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={
              activeTab === t.id
                ? { background: "#fff", color: "#0D1B3E", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                : { color: "#94a3b8" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: PŘEHLED ── */}
      {activeTab === "prehled" && (
        <>
          {/* Day 2 banner */}
          {showDay2Banner && (
            <div
              className="rounded-2xl p-4 flex items-start gap-3 relative"
              style={{ background: "#fff7ed", border: "2px solid #fed7aa" }}
            >
              <span className="text-2xl shrink-0">🔥</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black" style={{ color: "#c2410c" }}>
                  Dnes je den 2 — pokračuj!
                </p>
                <p className="text-xs text-orange-600 mt-0.5 leading-relaxed">
                  Včera jsi trénoval poprvé. Stačí 10 minut a streak začne hořet.
                </p>
              </div>
              <button
                onClick={() => setShowDay2Banner(false)}
                className="text-orange-300 hover:text-orange-500 text-lg leading-none shrink-0"
                aria-label="Zavřít"
              >
                ×
              </button>
            </div>
          )}

          {/* Level card */}
          <div
            className="rounded-2xl p-5 text-white"
            style={{ background: level.progress_bar_color }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{level.icon_emoji}</span>
                <div>
                  <p className="text-xs text-white/70 uppercase tracking-widest font-bold">Úroveň</p>
                  <p className="text-xl font-black">{level.rank_title}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black">⚡ {xp} XP</p>
                {toNext !== null ? (
                  <p className="text-xs text-white/70">{toNext} XP do dalšího</p>
                ) : (
                  <p className="text-xs text-white/70">Max level!</p>
                )}
              </div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: "rgba(255,255,255,0.85)" }}
              />
            </div>
          </div>

          {/* Stats overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-400 font-medium mb-1">Streak</p>
              <p className="text-2xl font-black text-orange-500">🔥 {streak}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">dní v řadě</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-400 font-medium mb-1">Celkem</p>
              <p className="text-2xl font-black" style={{ color: "#0D1B3E" }}>{totalSolved}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">příkladů</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-400 font-medium mb-1">Úspěšnost</p>
              {overallAccuracy !== null ? (
                <>
                  <p
                    className="text-2xl font-black"
                    style={{ color: overallAccuracy >= 70 ? "#16a34a" : overallAccuracy >= 50 ? "#d97706" : "#dc2626" }}
                  >
                    {overallAccuracy}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">průměr</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-black text-slate-300">—</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">po diagnostice</p>
                </>
              )}
            </div>
          </div>

          {/* Next badge goal */}
          {nextBadge && earnedBadges.length < allBadges.length && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border-2"
                style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}
              >
                🎯
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-0.5">Další cíl</p>
                <p className="text-sm font-black text-slate-800 leading-tight">
                  {nextBadge.icon_emoji} {nextBadge.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{nextBadge.description}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-black" style={{ color: "#2E6DA4" }}>+{nextBadge.xp_reward} XP</p>
              </div>
            </div>
          )}

          {earnedBadges.length === allBadges.length && allBadges.length > 0 && (
            <div
              className="rounded-2xl p-4 text-center"
              style={{ background: "#fefce8", border: "2px solid #fde047" }}
            >
              <p className="text-2xl mb-1">🏆</p>
              <p className="text-sm font-black" style={{ color: "#713f12" }}>Všechny odznaky získány!</p>
            </div>
          )}

          {/* Topic results */}
          {topicScores.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Výsledky diagnostiky</h2>
                {strongest && weakest && strongest !== weakest && (
                  <span className="text-xs text-slate-400">{topicScores.length} témat</span>
                )}
              </div>

              {topicScores.map(({ tema, score, correct, total }) => (
                <div key={tema}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-600">
                      {TEMA_LABELS[tema] ?? tema}
                    </span>
                    <span className="text-xs font-bold" style={{ color: score >= 0.67 ? "#166534" : "#9a3412" }}>
                      {correct}/{total} ({Math.round(score * 100)} %)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bar-animate"
                      style={{
                        width: `${Math.round(score * 100)}%`,
                        background: score >= 0.67 ? "#22c55e" : score >= 0.4 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                </div>
              ))}

              {ALL_TOPICS.filter((t) => !topicScores.find((s) => s.tema === t)).map((tema) => (
                <div key={tema} className="opacity-40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-600">
                      {TEMA_LABELS[tema] ?? tema}
                    </span>
                    <span className="text-xs text-slate-400">neprocvičeno</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2" />
                </div>
              ))}

              <div className="flex gap-2 flex-wrap pt-1">
                {strongest && strongest !== weakest && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "#dcfce7", color: "#166534" }}>
                    💪 Nejsilnější: {TEMA_LABELS[strongest.tema] ?? strongest.tema}
                  </span>
                )}
                {weakest && strongest !== weakest && (
                  <Link
                    href={`/trenink?tema=${weakest.tema}`}
                    className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: "#fef2f2", color: "#991b1b" }}
                  >
                    🎯 Procvičit: {TEMA_LABELS[weakest.tema] ?? weakest.tema} →
                  </Link>
                )}
              </div>
            </div>
          )}

          {topicScores.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center text-slate-400 text-sm">
              Nejdřív projdi diagnostický test — uvidíš svá silná a slabá témata.
            </div>
          )}
        </>
      )}

      {/* ── TAB: HISTORIE ── */}
      {activeTab === "historie" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Žádná historie. Dokončené tréninky se zobrazí zde.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Datum</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Téma</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">Výsledek</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">XP</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 10).map((s, i) => {
                    const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                    const color = pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
                    const temaLabel = s.temas
                      .map((t) => TEMA_LABELS[t] ?? t)
                      .join(", ");
                    return (
                      <tr
                        key={i}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {s.date}
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-[120px]">
                          <span className="truncate block text-xs">{temaLabel || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold" style={{ color }}>
                            {s.correct}/{s.total}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">({pct}%)</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold" style={{ color: "#2E6DA4" }}>
                          +{s.xp}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ODZNAKY ── */}
      {activeTab === "odznaky" && (
        <>
          {earnedBadges.length === allBadges.length && allBadges.length > 0 ? (
            <div
              className="rounded-2xl p-4 text-center"
              style={{ background: "#fefce8", border: "2px solid #fde047" }}
            >
              <p className="text-2xl mb-1">🏆</p>
              <p className="text-sm font-black" style={{ color: "#713f12" }}>Všechny odznaky získány!</p>
            </div>
          ) : (
            nextBadge && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border-2"
                  style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}
                >
                  🎯
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-0.5">Další cíl</p>
                  <p className="text-sm font-black text-slate-800 leading-tight">
                    {nextBadge.icon_emoji} {nextBadge.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{nextBadge.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-black" style={{ color: "#2E6DA4" }}>+{nextBadge.xp_reward} XP</p>
                </div>
              </div>
            )
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <BadgeGrid earnedBadgeIds={earnedBadges} />
          </div>
        </>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors mt-1"
      >
        Odhlásit se
      </button>
    </div>
  );
}
