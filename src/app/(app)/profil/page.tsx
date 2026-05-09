"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { loadProgress } from "@/lib/progress";
import { loadGamification, getAllBadges, getLevelFromXP, xpToNextLevel, BadgeConfig } from "@/lib/gamification";
import { getReadiness } from "@/lib/readiness";
import { localLoadSessions, SessionHistoryEntry } from "@/lib/storage";
import { TEMA_LABELS } from "@/types";
import BadgeGrid from "@/components/BadgeGrid";
import ReadinessCard from "@/components/ReadinessCard";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import CountdownBanner from "@/components/CountdownBanner";

interface CermatEntry { date: string; score: number; total: number; pct: number; }

type NotifState = "unsupported" | "granted" | "denied" | "default" | "loading";

const ALL_TOPICS = Object.keys(TEMA_LABELS);

interface TopicScore {
  tema: string;
  score: number;
  correct: number;
  total: number;
}

type Tab = "prehled" | "historie" | "odznaky";

function getBadgeProgress(
  badge: BadgeConfig,
  stats: { totalSolved: number; streak: number }
): { current: number; target: number } | null {
  const id = badge.id;
  const exampleMatch = id.match(/badge_(\d+)_examples/);
  if (exampleMatch) {
    return { current: Math.min(stats.totalSolved, Number(exampleMatch[1])), target: Number(exampleMatch[1]) };
  }
  if (id === "badge_first_example") {
    return { current: Math.min(stats.totalSolved, 1), target: 1 };
  }
  const streakMatch = id.match(/badge_streak_(\d+)/);
  if (streakMatch) {
    return { current: Math.min(stats.streak, Number(streakMatch[1])), target: Number(streakMatch[1]) };
  }
  return null;
}

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
  const [freezeCount, setFreezeCount]    = useState(0);
  const [loading, setLoading]            = useState(true);
  const [cermatLast, setCermatLast]      = useState<CermatEntry | null>(null);
  const [notifState, setNotifState]      = useState<NotifState>("default");
  const [readinessScore, setReadinessScore] = useState(0);
  const [certState, setCertState]        = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setEmail(data.session?.user.email ?? null);
      });
    }

    const p = loadProgress();
    setXp(p.xp);
    setStreak(p.streak);
    setFreezeCount(p.freezeCount ?? 0);

    const g = loadGamification();
    setEarnedBadges(g.earnedBadges);
    setTotalSolved(g.totalSolved);

    setSessions(localLoadSessions());

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
          .sort((a, b) => a.score - b.score); // weakest first
        setTopicScores(scores);
      }
    } catch { /* ignore */ }

    // Fetch diag results from Supabase for cross-device sync
    if (supabase) {
      supabase.auth.getSession().then(async ({ data }) => {
        if (!data.session) return;
        const { data: rows } = await supabase!
          .from("diagnostic_results")
          .select("tema, correct, total")
          .eq("user_id", data.session.user.id);
        if (rows && rows.length > 0) {
          const results: Record<string, { correct: number; total: number }> = {};
          for (const row of rows) results[row.tema] = { correct: row.correct, total: row.total };
          localStorage.setItem("matemax-diag-results", JSON.stringify(results));
          localStorage.setItem("matemax-diag-done", "1");
          const scores: TopicScore[] = Object.entries(results)
            .filter(([, v]) => v.total > 0)
            .map(([tema, v]) => ({ tema, score: v.correct / v.total, correct: v.correct, total: v.total }))
            .sort((a, b) => a.score - b.score);
          setTopicScores(scores);
        }
      });
    }

    try {
      const raw = localStorage.getItem("cermat-test-history");
      if (raw) {
        const history = JSON.parse(raw) as CermatEntry[];
        if (history.length > 0) setCermatLast(history[0]);
      }
    } catch { /* ignore */ }

    if (!("Notification" in window)) {
      setNotifState("unsupported");
    } else {
      setNotifState(Notification.permission as NotifState);
    }

    setReadinessScore(getReadiness().score);
    setLoading(false);
  }, []);

  async function handleEnableNotifs() {
    if (!("Notification" in window)) return;
    setNotifState("loading");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setNotifState(perm === "denied" ? "denied" : "default");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (vapidKey) {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });
        const userId = (await supabase?.auth.getSession())?.data.session?.user.id;
        await fetch("/api/push-subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON(), userId }),
        });
      } else {
        await reg.showNotification("MateMax", {
          body: "Připomenutí jsou aktivní! Každý den ti připomeneme trénink.",
          icon: "/icons/icon-192.png",
        });
      }
      setNotifState("granted");
    } catch (err) {
      console.error("Push subscribe error:", err);
      setNotifState("default");
    }
  }

  async function handleGenerateCertificate() {
    setCertState("loading");
    try {
      const W = 1200, H = 800;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#0D1B3E");
      bg.addColorStop(1, "#1e3a6e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Decorative circles
      ctx.beginPath();
      ctx.arc(W - 80, 80, 300, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(80, H - 80, 200, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fill();

      // Gold border
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 6;
      ctx.strokeRect(30, 30, W - 60, H - 60);
      ctx.strokeStyle = "rgba(251,191,36,0.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, W - 80, H - 80);

      ctx.textAlign = "center";

      // Logo
      ctx.font = `900 72px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.fillStyle = "#fff";
      ctx.fillText("M²", W / 2, 140);

      // Title
      ctx.font = `700 28px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.fillStyle = "#fbbf24";
      ctx.fillText("CERTIFIKÁT PŘIPRAVENOSTI", W / 2, 210);

      // Divider
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(W / 2 - 300, 235, 600, 1);

      // Main text
      ctx.font = `400 24px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText("Tento certifikát potvrzuje, že", W / 2, 295);

      const name = email ? email.split("@")[0] : "Student";
      ctx.font = `900 56px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.fillStyle = "#fff";
      ctx.fillText(name, W / 2, 385);

      ctx.font = `400 24px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText("je připraven/a na přijímací zkoušky ze středoškolské matematiky", W / 2, 445);

      // Score
      ctx.font = `900 96px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.fillStyle = "#fbbf24";
      ctx.fillText(`${readinessScore} %`, W / 2, 570);

      ctx.font = `600 20px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillText("připravenost · MateMax · matemax.cz", W / 2, 615);

      const today = new Date().toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
      ctx.font = `400 18px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText(today, W / 2, 720);

      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => b ? res(b) : rej(new Error("toBlob failed")), "image/png")
      );
      const file = new File([blob], "matemax-certifikat.png", { type: "image/png" });
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Certifikát MateMax", files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "matemax-certifikat.png";
        a.click();
        URL.revokeObjectURL(url);
      }
      setCertState("done");
      setTimeout(() => setCertState("idle"), 3000);
    } catch {
      setCertState("error");
      setTimeout(() => setCertState("idle"), 2500);
    }
  }

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

  const allBadges = getAllBadges();
  const earnedSet = new Set(earnedBadges);
  const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  const nextBadge = allBadges
    .filter((b) => !earnedSet.has(b.id))
    .sort((a, b) => (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0))[0] ?? null;

  const nextBadgeProgress = nextBadge
    ? getBadgeProgress(nextBadge, { totalSolved, streak })
    : null;

  const TAB_LIST: { id: Tab; label: string }[] = [
    { id: "prehled", label: "Přehled" },
    { id: "historie", label: "Historie" },
    { id: "odznaky", label: "Odznaky" },
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* ── HERO SECTION ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 60%, #0D1B3E 100%)" }}
      >
        <div className="px-6 pt-7 pb-6 flex flex-col items-center text-center">
          {/* Large avatar */}
          <div
            className="w-18 h-18 rounded-full flex items-center justify-center text-white text-3xl font-black mb-3"
            style={{
              width: "72px", height: "72px",
              background: "rgba(255,255,255,0.12)",
              border: "3px solid rgba(255,255,255,0.25)",
            }}
          >
            {initials}
          </div>
          <p className="text-white font-bold text-base leading-tight">{email ?? "Nepřihlášen"}</p>

          {/* Level badge */}
          <div
            className="mt-2 mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ background: "rgba(253,224,71,0.15)", border: "1px solid rgba(253,224,71,0.35)" }}
          >
            <span className="text-base">{level.icon_emoji}</span>
            <span className="text-xs font-bold" style={{ color: "#fde047" }}>{level.rank_title}</span>
          </div>

          {/* XP number */}
          <p className="text-4xl font-black text-white">⚡ {xp}</p>
          <p className="text-xs text-blue-300 mt-0.5 mb-3">
            {toNext !== null ? `${toNext} XP do dalšího levelu` : "Max level! 🏆"}
          </p>

          {/* XP progress bar */}
          <div className="w-full bg-white/15 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: "rgba(255,255,255,0.85)" }}
            />
          </div>
          <p className="text-xs text-white/40 mt-1">{pct} % do dalšího levelu</p>
        </div>
      </div>

      {/* Day 2 banner */}
      {showDay2Banner && (
        <div
          className="rounded-2xl p-4 flex items-start gap-3 relative"
          style={{ background: "#fff7ed", border: "2px solid #fed7aa" }}
        >
          <span className="text-2xl shrink-0">🔥</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black" style={{ color: "#c2410c" }}>Dnes je den 2 — pokračuj!</p>
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
          {/* Countdown to přijímačky */}
          <CountdownBanner variant="full" />

          {/* 2×2 Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-400 font-medium mb-1">🔥 Streak</p>
              <p className="text-3xl font-black text-orange-500">{streak}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">dní v řadě</p>
              {freezeCount > 0 && (
                <p className="text-[10px] font-semibold mt-1" style={{ color: "#0369a1" }}>
                  🧊 ×{freezeCount} zmraz.
                </p>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-400 font-medium mb-1">⚡ Celkem XP</p>
              <p className="text-3xl font-black" style={{ color: "#2E6DA4" }}>{xp}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">bodů</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-400 font-medium mb-1">📚 Příkladů</p>
              <p className="text-3xl font-black" style={{ color: "#0D1B3E" }}>{totalSolved}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">celkem</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-400 font-medium mb-1">🎯 Úspěšnost</p>
              {overallAccuracy !== null ? (
                <>
                  <p
                    className="text-3xl font-black"
                    style={{ color: overallAccuracy >= 70 ? "#16a34a" : overallAccuracy >= 50 ? "#d97706" : "#dc2626" }}
                  >
                    {overallAccuracy}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">průměr</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-black text-slate-300">—</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">po diagnostice</p>
                </>
              )}
            </div>
          </div>

          {/* Readiness score */}
          <ReadinessCard />

          {/* CERMAT test card */}
          {cermatLast ? (
            <Link
              href="/cermat-test"
              className="block bg-white rounded-2xl border border-slate-200 p-4 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">
                    🎯 Poslední CERMAT test
                  </p>
                  <p className="text-2xl font-black" style={{ color: "#0D1B3E" }}>{cermatLast.pct} %</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cermatLast.score}/{cermatLast.total} · {cermatLast.date}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-3xl">
                    {cermatLast.pct >= 90 ? "🏆" : cermatLast.pct >= 70 ? "💪" : "📚"}
                  </span>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: "#eff6ff", color: "#2E6DA4" }}
                  >
                    Zkusit znovu →
                  </span>
                </div>
              </div>
            </Link>
          ) : (
            <Link
              href="/cermat-test"
              className="block rounded-2xl p-4 text-center hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
            >
              <p className="text-sm font-black text-white">🎯 Simulace CERMAT testu</p>
              <p className="text-xs text-blue-200 mt-0.5">
                Otestuj se za podmínek reálných přijímaček →
              </p>
            </Link>
          )}

          {/* Další cíl card — enhanced */}
          {nextBadge && earnedBadges.length < allBadges.length && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-3">🎯 Další cíl</p>
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border-2"
                  style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}
                >
                  {nextBadge.icon_emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-slate-800 leading-tight">{nextBadge.label}</p>
                    <p className="text-xs font-black shrink-0" style={{ color: "#2E6DA4" }}>+{nextBadge.xp_reward} XP</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{nextBadge.description}</p>
                  {nextBadgeProgress && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Pokrok</span>
                        <span>{nextBadgeProgress.current} / {nextBadgeProgress.target}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, Math.round((nextBadgeProgress.current / nextBadgeProgress.target) * 100))}%`,
                            background: "linear-gradient(90deg, #2E6DA4, #00B4D8)",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
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

          {/* Tvá silná a slabá místa — weakest first */}
          {topicScores.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Tvá silná a slabá místa</h2>
                <span className="text-xs text-slate-400">{topicScores.length} témat</span>
              </div>

              {/* Weakest first (already sorted that way) */}
              {topicScores.map(({ tema, score, correct, total }) => {
                const pctVal = Math.round(score * 100);
                const barColor = score >= 0.67 ? "#22c55e" : score >= 0.4 ? "#f59e0b" : "#ef4444";
                const textColor = score >= 0.67 ? "#166534" : score >= 0.4 ? "#92400e" : "#991b1b";
                return (
                  <Link key={tema} href={`/trenink?tema=${tema}`} className="block group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                        {TEMA_LABELS[tema] ?? tema}
                      </span>
                      <span className="text-xs font-bold" style={{ color: textColor }}>
                        {correct}/{total} · {pctVal} %
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bar-animate"
                        style={{ width: `${pctVal}%`, background: barColor }}
                      />
                    </div>
                  </Link>
                );
              })}

              {/* Topics not yet tested */}
              {ALL_TOPICS.filter((t) => !topicScores.find((s) => s.tema === t)).map((tema) => (
                <div key={tema} className="opacity-35">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-600">{TEMA_LABELS[tema] ?? tema}</span>
                    <span className="text-xs text-slate-400">neprocvičeno</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2" />
                </div>
              ))}
            </div>
          )}

          {topicScores.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center text-slate-400 text-sm">
              Nejdřív projdi diagnostický test — uvidíš svá silná a slabá témata.
            </div>
          )}

          {/* Activity heatmap */}
          <ActivityHeatmap />

          {/* Certificate — visible when readiness ≥ 80% */}
          {readinessScore >= 80 && (
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 100%)", border: "2px solid #fbbf24" }}
            >
              <p className="text-2xl mb-1">🏆</p>
              <p className="text-base font-black text-white mb-0.5">Výborná příprava!</p>
              <p className="text-xs text-blue-200 mb-4">
                Dosáhl/a jsi {readinessScore} % připravenosti — vygeneruj si certifikát!
              </p>
              <button
                onClick={handleGenerateCertificate}
                disabled={certState === "loading"}
                className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                style={{ background: "#fbbf24", color: "#0D1B3E" }}
              >
                {certState === "loading"
                  ? "Generuji…"
                  : certState === "done"
                  ? "✓ Certifikát stažen!"
                  : certState === "error"
                  ? "⚠ Nepodařilo se"
                  : "🎓 Vygenerovat certifikát"}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── TAB: HISTORIE ── */}
      {activeTab === "historie" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {sessions.length === 0 ? (
            <div className="p-10 flex flex-col items-center gap-3 text-center">
              <span className="text-5xl">📭</span>
              <p className="text-base font-bold text-slate-700">Zatím žádný trénink</p>
              <p className="text-sm text-slate-400 max-w-xs">
                Po dokončení prvního tréninku se zde zobrazí tvoje výsledky a pokrok.
              </p>
              <Link
                href="/trenink"
                className="mt-1 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
                style={{ background: "#0D1B3E" }}
              >
                💪 Začít trénovat →
              </Link>
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
                  {sessions.slice(0, 20).map((s, i) => {
                    const pctVal = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                    const color = pctVal >= 80 ? "#16a34a" : pctVal >= 50 ? "#d97706" : "#dc2626";
                    const temaLabel = s.temas.map((t) => TEMA_LABELS[t] ?? t).join(", ");
                    return (
                      <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{s.date}</td>
                        <td className="px-4 py-3 text-slate-700 max-w-[120px]">
                          <span className="truncate block text-xs">{temaLabel || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-xs" style={{ color }}>
                            {s.correct}/{s.total}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">({pctVal}%)</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-xs" style={{ color: "#2E6DA4" }}>
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
                  {nextBadge.icon_emoji}
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

      {/* Push notifications */}
      {notifState !== "unsupported" && (
        <button
          onClick={notifState === "granted" || notifState === "denied" || notifState === "loading" ? undefined : handleEnableNotifs}
          disabled={notifState === "granted" || notifState === "denied" || notifState === "loading"}
          className="w-full py-3 rounded-xl border-2 font-semibold text-sm transition-colors"
          style={{
            borderColor: notifState === "granted" ? "#bbf7d0" : notifState === "denied" ? "#e2e8f0" : "#e2e8f0",
            color: notifState === "granted" ? "#15803d" : notifState === "denied" ? "#94a3b8" : "#0D1B3E",
            background: notifState === "granted" ? "#f0fdf4" : "white",
          }}
        >
          {notifState === "granted"
            ? "🔔 Připomenutí aktivní"
            : notifState === "denied"
            ? "🔕 Notifikace zakázány v prohlížeči"
            : notifState === "loading"
            ? "Aktivuji…"
            : "🔔 Zapnout připomenutí"}
        </button>
      )}

      {/* Rodičovský portál */}
      <Link
        href="/rodice/dashboard"
        className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">👨‍👩‍👧</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#0D1B3E" }}>Rodičovský portál</p>
            <p className="text-xs text-slate-400">Přehled pokroku pro rodiče</p>
          </div>
        </div>
        <span className="text-slate-300 text-lg">→</span>
      </Link>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
      >
        Odhlásit se
      </button>
    </div>
  );
}
