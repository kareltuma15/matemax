"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { loadProgress } from "@/lib/progress";
import { loadGamification, getAllBadges, getLevelFromXP, xpToNextLevel, BadgeConfig } from "@/lib/gamification";
import { getReadiness } from "@/lib/readiness";
import { localLoadSessions, SessionHistoryEntry } from "@/lib/storage";
import { TEMA_LABELS, SM2Card } from "@/types";
import { examplesIndex } from "@/data/examples-index";
import BadgeGrid from "@/components/BadgeGrid";
import ReadinessCard from "@/components/ReadinessCard";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import CountdownBanner from "@/components/CountdownBanner";
import { usePremium } from "@/lib/premium";
import { PREMIUM_TOPICS } from "@/lib/subscription";
import { getReferralLink } from "@/lib/referral";
import { SkeletonLine, SkeletonAvatar } from "@/components/Skeleton";

interface CermatEntry { date: string; score: number; total: number; pct: number; }

type NotifState = "unsupported" | "granted" | "denied" | "default" | "loading";

const AVATAR_EMOJIS = [
  "🐼", "🦊", "🐶", "🐱", "🦁", "🐯",
  "🐨", "🐻", "🦋", "🚀", "⚡", "🎯",
  "🧠", "🏆", "🌟", "🦄", "🎮", "🎸",
];

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
  stats: { totalSolved: number; streak: number; perfectSessions: number; dailyGoalsCompleted: number; topicStats: Record<string, { correct: number; total: number }> }
): { current: number; target: number } | null {
  const id = badge.id;

  if (id === "badge_first_example") return { current: Math.min(stats.totalSolved, 1), target: 1 };

  const exampleMatch = id.match(/badge_(\d+)_examples/);
  if (exampleMatch) {
    return { current: Math.min(stats.totalSolved, Number(exampleMatch[1])), target: Number(exampleMatch[1]) };
  }

  const streakMatch = id.match(/badge_streak_(\d+)/);
  if (streakMatch) {
    return { current: Math.min(stats.streak, Number(streakMatch[1])), target: Number(streakMatch[1]) };
  }

  if (id === "badge_perfect_session_3x") return { current: Math.min(stats.perfectSessions, 3), target: 3 };
  if (id === "badge_daily_goal_7x") return { current: Math.min(stats.dailyGoalsCompleted, 7), target: 7 };

  const topicMatch = id.match(/^badge_([a-z_]+)_master$/);
  if (topicMatch) {
    const tema = topicMatch[1];
    const ts = stats.topicStats[tema] ?? { correct: 0, total: 0 };
    return { current: Math.min(ts.total, 30), target: 30 };
  }

  return null;
}

export default function ProfilPage() {
  const router = useRouter();
  const [activeTab, setActiveTab]        = useState<Tab>("prehled");
  const [email, setEmail]                = useState<string | null>(null);
  const [userId, setUserId]              = useState<string | null>(null);
  const [xp, setXp]                      = useState(0);
  const [streak, setStreak]              = useState(0);
  const [totalSolved, setTotalSolved]    = useState(0);
  const [topicScores, setTopicScores]    = useState<TopicScore[]>([]);
  const [earnedBadges, setEarnedBadges]  = useState<string[]>([]);
  const [perfectSessions, setPerfectSessions] = useState(0);
  const [dailyGoalsCompleted, setDailyGoalsCompleted] = useState(0);
  const [topicStats, setTopicStats]      = useState<Record<string, { correct: number; total: number }>>({});
  const [sm2Cards, setSm2Cards]          = useState<SM2Card[]>([]);
  const [sessions, setSessions]          = useState<SessionHistoryEntry[]>([]);
  const [showDay2Banner, setShowDay2Banner] = useState(false);
  const [freezeCount, setFreezeCount]    = useState(0);
  const [loading, setLoading]            = useState(true);
  const [cermatLast, setCermatLast]      = useState<CermatEntry | null>(null);
  const [notifState, setNotifState]      = useState<NotifState>("default");
  const [readinessScore, setReadinessScore] = useState(0);
  const [certState, setCertState]        = useState<"idle" | "loading" | "done" | "error">("idle");
  const [topicsExpanded, setTopicsExpanded] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [displayName, setDisplayName]       = useState("");
  const [avatarEmoji, setAvatarEmoji]       = useState("");
  const [showPersonaForm, setShowPersonaForm] = useState(false);
  const [firstNameInput, setFirstNameInput] = useState("");
  const [lastNameInput, setLastNameInput]   = useState("");
  const [selectedEmoji, setSelectedEmoji]   = useState("");
  const [personaSaving, setPersonaSaving]   = useState(false);
  const [personaMsg, setPersonaMsg]         = useState<{ ok: boolean; text: string } | null>(null);
  const { isPremium, trialDaysLeft } = usePremium();

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setEmail(data.session?.user.email ?? null);
        setUserId(data.session?.user.id ?? null);
        const meta = data.session?.user.user_metadata as Record<string, string> | undefined;
        const fn = meta?.first_name ?? "";
        const ln = meta?.last_name ?? "";
        const fullName = meta?.full_name ?? meta?.name ?? `${fn} ${ln}`.trim();
        setDisplayName(fullName);
        setAvatarEmoji(meta?.avatar_emoji ?? "");
        setFirstNameInput(fn || fullName.split(" ")[0]);
        setLastNameInput(ln || fullName.split(" ").slice(1).join(" "));
        setSelectedEmoji(meta?.avatar_emoji ?? "");
      });
    }

    const p = loadProgress();
    setXp(p.xp);
    setStreak(p.streak);
    setFreezeCount(p.freezeCount ?? 0);

    const g = loadGamification();
    setEarnedBadges(g.earnedBadges);
    setTotalSolved(g.totalSolved);
    setPerfectSessions(g.perfectSessions);
    setDailyGoalsCompleted(g.dailyGoalsCompleted);
    setTopicStats(g.topicStats ?? {});

    try {
      const raw = localStorage.getItem("matemax-cards");
      if (raw) setSm2Cards(JSON.parse(raw) as SM2Card[]);
    } catch { /* ignore */ }

    setSessions(localLoadSessions());

    const diagDone = localStorage.getItem("matemax-diag-done") === "1";
    if (diagDone && p.streak === 1 && p.lastActiveDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || newPassword.length < 6) {
      setPasswordMsg({ ok: false, text: "Heslo musí mít alespoň 6 znaků." });
      return;
    }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) {
      setPasswordMsg({ ok: false, text: "Nepodařilo se změnit heslo. Zkus se znovu přihlásit." });
    } else {
      setPasswordMsg({ ok: true, text: "Heslo bylo úspěšně změněno." });
      setNewPassword("");
      setTimeout(() => { setShowPasswordForm(false); setPasswordMsg(null); }, 2000);
    }
  }

  async function handleSavePersona(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setPersonaSaving(true);
    const fullName = `${firstNameInput.trim()} ${lastNameInput.trim()}`.trim();
    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: firstNameInput.trim() || null,
        last_name: lastNameInput.trim() || null,
        full_name: fullName || null,
        avatar_emoji: selectedEmoji || null,
      },
    });
    setPersonaSaving(false);
    if (error) {
      setPersonaMsg({ ok: false, text: "Nepodařilo se uložit. Zkus to znovu." });
    } else {
      setDisplayName(fullName);
      setAvatarEmoji(selectedEmoji);
      setPersonaMsg({ ok: true, text: "Uloženo! ✓" });
      setTimeout(() => { setShowPersonaForm(false); setPersonaMsg(null); }, 1500);
    }
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    const keysToRemove = [
      "matemax-progress", "matemax-cards", "matemax-gamification",
      "matemax-diag-done", "matemax-diag-results", "matemax-today",
      "matemax-streak-milestones", "matemax-freeze-used", "matemax-first-session-done",
      "matemax-sessions", "matemax-session-draft", "matemax-progress-milestones",
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    const challengeKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("matemax-challenge-done-")) challengeKeys.push(k);
    }
    challengeKeys.forEach((k) => localStorage.removeItem(k));
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 fade-in-up">
        {/* Hero skeleton */}
        <div className="rounded-2xl p-6 flex flex-col items-center gap-3" style={{ background: "#0D1B3E" }}>
          <SkeletonAvatar size={72} />
          <SkeletonLine width="140px" height="1rem" />
          <SkeletonLine width="80px" height="1.4rem" />
        </div>
        {/* Tabs skeleton */}
        <div className="flex gap-2">
          {[90, 80, 80].map((w, i) => (
            <div key={i} className="skeleton rounded-full" style={{ width: w, height: 36 }} />
          ))}
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-2">
              <SkeletonLine width="60%" height="0.75rem" />
              <SkeletonLine width="40%" height="1.5rem" />
            </div>
          ))}
        </div>
        {/* Card skeletons */}
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-3">
            <SkeletonLine width="45%" height="0.875rem" />
            <SkeletonLine width="100%" height="3rem" />
            <SkeletonLine width="70%" height="0.75rem" />
          </div>
        ))}
      </div>
    );
  }

  const level = getLevelFromXP(xp);
  const toNext = xpToNextLevel(xp);
  const levelXP = xp - level.xp_min;
  const levelTotal = level.xp_max !== null ? level.xp_max + 1 - level.xp_min : null;
  const pct = levelTotal !== null ? Math.min(100, Math.round((levelXP / levelTotal) * 100)) : 100;

  const initials = email ? email[0].toUpperCase() : "?";

  // SM-2 progress per topic
  const sm2CardMap = new Map(sm2Cards.map((c) => [c.exampleId, c]));
  const sm2TopicStats = Object.keys(TEMA_LABELS).reduce<Record<string, { practiced: number; mastered: number; total: number }>>((acc, tema) => {
    const topicExamples = examplesIndex.filter((ex) => ex.tema === tema);
    const practiced = topicExamples.filter((ex) => (sm2CardMap.get(ex.id)?.repetitions ?? 0) > 0).length;
    const mastered  = topicExamples.filter((ex) => (sm2CardMap.get(ex.id)?.interval ?? 0) >= 7).length;
    acc[tema] = { practiced, mastered, total: topicExamples.length };
    return acc;
  }, {});

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
    ? getBadgeProgress(nextBadge, { totalSolved, streak, perfectSessions, dailyGoalsCompleted, topicStats })
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
            className="rounded-full flex items-center justify-center mb-3"
            style={{
              width: "72px", height: "72px",
              background: "rgba(255,255,255,0.12)",
              border: "3px solid rgba(255,255,255,0.25)",
            }}
          >
            {avatarEmoji
              ? <span className="text-3xl leading-none">{avatarEmoji}</span>
              : <span className="text-white text-3xl font-black">{initials}</span>
            }
          </div>
          <p className="text-white font-bold text-base leading-tight">
            {displayName || email || "Nepřihlášen"}
          </p>
          {displayName && email && (
            <p className="text-blue-300 text-xs mt-0.5">{email}</p>
          )}

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
        <div className="tab-enter flex flex-col gap-4">

          {/* ── SEKCE: TVŮJ PLÁN ── */}
          {isPremium ? (
            <div
              className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background: "linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%)", border: "1.5px solid #fde68a" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: "rgba(161,98,7,0.12)" }}
              >
                ⭐
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black" style={{ color: "#a16207" }}>Premium plán</p>
                <p className="text-xs mt-0.5" style={{ color: "#92400e" }}>
                  {trialDaysLeft !== null
                    ? `🎁 Trial · zbývá ${trialDaysLeft} ${trialDaysLeft === 1 ? "den" : trialDaysLeft <= 4 ? "dny" : "dní"}`
                    : "Všechna témata odemčena · Plný přístup"}
                </p>
              </div>
              {trialDaysLeft !== null && (
                <Link
                  href="/cenik"
                  className="shrink-0 text-xs font-black px-3 py-2 rounded-xl text-white"
                  style={{ background: "#a16207" }}
                >
                  Aktivovat →
                </Link>
              )}
            </div>
          ) : (
            <div
              className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background: "#f8faff", border: "1.5px solid #bfdbfe" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: "#eff6ff" }}
              >
                🔓
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black" style={{ color: "#0D1B3E" }}>Zdarma plán</p>
                <p className="text-xs mt-0.5 text-slate-500">
                  5 z 14 témat · 9 prémiových témat uzamčeno
                </p>
              </div>
              <Link
                href="/cenik"
                className="shrink-0 text-xs font-black px-3 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
              >
                Upgradovat →
              </Link>
            </div>
          )}

          {/* Countdown to přijímačky */}
          <CountdownBanner variant="full" />

          {/* ── SEKCE: STATISTIKY ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Statistiky</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
                <p className="text-2xl font-black text-orange-500">{streak}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">🔥 Streak<br />dní</p>
                {freezeCount > 0 && (
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: "#0369a1" }}>🧊 ×{freezeCount}</p>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
                <p className="text-2xl font-black" style={{ color: "#0D1B3E" }}>{totalSolved}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">📚 Příkladů<br />celkem</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
                {overallAccuracy !== null ? (
                  <>
                    <p className="text-2xl font-black"
                      style={{ color: overallAccuracy >= 70 ? "#16a34a" : overallAccuracy >= 50 ? "#d97706" : "#dc2626" }}>
                      {overallAccuracy}%
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">🎯 Úspěšnost<br />průměr</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-black text-slate-300">—</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">🎯 Úspěšnost<br />po diagnostice</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── SEKCE: PŘIPRAVENOST ── */}
          <div>
            <div className="flex items-baseline justify-between mb-2 px-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Připravenost na přijímačky</p>
              <p className="text-[10px] text-slate-300">z tréninku + SM-2</p>
            </div>
            <ReadinessCard />

            {/* Odhadovaný výsledek přijímaček */}
            {readinessScore > 0 && (() => {
              const pts = Math.round(readinessScore / 100 * 50);
              const clr = pts >= 38 ? "#16a34a" : pts >= 28 ? "#d97706" : "#dc2626";
              const bg  = pts >= 38 ? "#f0fdf4" : pts >= 28 ? "#fffbeb" : "#fef2f2";
              const bdr = pts >= 38 ? "#bbf7d0" : pts >= 28 ? "#fde68a" : "#fecaca";
              const lbl = pts >= 38 ? "Výborný výsledek" : pts >= 28 ? "Dobrý výsledek" : "Je co zlepšit";
              const desc = pts >= 43
                ? "Na top gymnázia (GJK, SSPŠ) zpravidla stačí 40–50 bodů."
                : pts >= 35
                ? "Většina gymnázií přijímá od 30–40 bodů."
                : pts >= 22
                ? "Na odborné školy s maturitou zpravidla stačí 20–30 bodů."
                : "Pravidelným tréninkem lze výsledek výrazně zlepšit.";
              return (
                <div className="mt-2 rounded-2xl p-4" style={{ background: bg, border: `1.5px solid ${bdr}` }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: clr }}>
                    🎯 Odhadovaný výsledek přijímaček
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 text-center">
                      <p className="text-4xl font-black leading-none" style={{ color: clr }}>~{pts}</p>
                      <p className="text-xs font-semibold mt-0.5" style={{ color: clr }}>/ 50 bodů</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black leading-tight" style={{ color: clr }}>{lbl}</p>
                      <p className="text-xs leading-snug mt-1" style={{ color: clr, opacity: 0.8 }}>{desc}</p>
                      {/* Mini progress bar */}
                      <div className="mt-2 bg-white/60 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{ width: `${(pts / 50) * 100}%`, background: clr }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] mt-3 leading-snug" style={{ color: clr, opacity: 0.6 }}>
                    * Odhad vychází z výsledků tréninku. Pro přesnější výsledek zkus cvičný test níže.
                  </p>
                </div>
              );
            })()}

            {cermatLast ? (
              <Link
                href="/cermat-test"
                className="mt-2 flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 hover:border-blue-200 transition-colors"
              >
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-0.5">Poslední CERMAT test</p>
                  <p className="text-xl font-black" style={{ color: "#0D1B3E" }}>{cermatLast.pct} %</p>
                  <p className="text-xs text-slate-500">{cermatLast.score}/{cermatLast.total} · {cermatLast.date}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-2xl">{cermatLast.pct >= 90 ? "🏆" : cermatLast.pct >= 70 ? "💪" : "📚"}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#2E6DA4" }}>
                    Zkusit znovu →
                  </span>
                </div>
              </Link>
            ) : (
              <Link
                href="/cermat-test"
                className="mt-2 flex items-center justify-between rounded-2xl p-4 hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
              >
                <div>
                  <p className="text-xs font-black text-white">🎯 Simulace CERMAT testu</p>
                  <p className="text-[10px] text-blue-200 mt-0.5">Otestuj se za podmínek reálných přijímaček</p>
                </div>
                <span className="text-white text-lg">→</span>
              </Link>
            )}
            {readinessScore >= 80 && (
              <div
                className="mt-2 rounded-2xl p-4 flex items-center justify-between"
                style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 100%)", border: "2px solid #fbbf24" }}
              >
                <div>
                  <p className="text-xs font-black text-white">🏆 Výborná příprava! {readinessScore} %</p>
                  <p className="text-[10px] text-blue-200 mt-0.5">Vygeneruj si certifikát připravenosti</p>
                </div>
                <button
                  onClick={handleGenerateCertificate}
                  disabled={certState === "loading"}
                  className="px-3 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-60 shrink-0"
                  style={{ background: "#fbbf24", color: "#0D1B3E" }}
                >
                  {certState === "loading" ? "…" : certState === "done" ? "✓ Stažen" : "🎓 Stáhnout"}
                </button>
              </div>
            )}
          </div>

          {/* ── SEKCE: CÍLE & ODZNAKY ── */}
          {nextBadge && earnedBadges.length < allBadges.length && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Nejbližší cíl</p>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: "#f8fafc", border: "2px solid #e2e8f0" }}
                >
                  {nextBadge.icon_emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-slate-800 leading-tight">{nextBadge.label}</p>
                    <p className="text-xs font-black shrink-0" style={{ color: "#2E6DA4" }}>+{nextBadge.xp_reward} XP</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{nextBadge.description}</p>
                  {nextBadgeProgress && (
                    <>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 mb-0.5">
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
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── SEKCE: POZVI KAMARÁDA ── */}
          {userId && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Referral program</p>
              <div
                className="rounded-2xl p-4 flex flex-col gap-3"
                style={{ background: "#f0fdf4", border: "1.5px solid #86efac" }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎁</span>
                  <div>
                    <p className="text-sm font-black" style={{ color: "#166534" }}>Pozvi kamaráda</p>
                    <p className="text-xs mt-0.5" style={{ color: "#15803d" }}>
                      Oba dostanete <strong>7 dní Premium zdarma</strong> — bez karty, hned.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div
                    className="flex-1 rounded-xl px-3 py-2 text-xs font-mono truncate"
                    style={{ background: "#dcfce7", color: "#166534" }}
                  >
                    {getReferralLink(userId)}
                  </div>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(getReferralLink(userId));
                      setReferralCopied(true);
                      setTimeout(() => setReferralCopied(false), 2000);
                    }}
                    className="shrink-0 px-3 py-2 rounded-xl text-xs font-bold text-white transition-colors"
                    style={{ background: referralCopied ? "#15803d" : "#166534" }}
                  >
                    {referralCopied ? "✓ Zkopírováno!" : "Kopírovat"}
                  </button>
                </div>
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <button
                    onClick={() => navigator.share({
                      title: "MateMax — přijímačky z matematiky",
                      text: "Připravuješ se na přijímačky? MateMax je nejlepší appka na matematiku — pozvi se mnou a oba dostaneme 7 dní Premium!",
                      url: getReferralLink(userId),
                    }).catch(() => {})}
                    className="w-full py-2 rounded-xl text-sm font-bold border-2 transition-colors"
                    style={{ borderColor: "#86efac", color: "#166534", background: "transparent" }}
                  >
                    📤 Sdílet odkaz
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── SEKCE: TÉMATA ── */}
          <div>
            <div className="flex items-baseline justify-between mb-2 px-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Silná a slabá místa</p>
              <p className="text-[10px] text-slate-300">z diagnostického testu</p>
            </div>
            {topicScores.length > 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {(topicsExpanded ? topicScores : topicScores.slice(0, 5)).map(({ tema, score, correct, total }) => {
                  const pctVal = Math.round(score * 100);
                  const barColor = score >= 0.67 ? "#22c55e" : score >= 0.4 ? "#f59e0b" : "#ef4444";
                  const textColor = score >= 0.67 ? "#166534" : score >= 0.4 ? "#92400e" : "#991b1b";
                  const locked = !isPremium && PREMIUM_TOPICS.has(tema);
                  const sm2 = sm2TopicStats[tema];
                  return (
                    <Link key={tema} href={locked ? "/cenik" : `/trenink?tema=${tema}`}
                      className="flex flex-col gap-1 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-700 w-28 shrink-0 truncate">
                          {locked ? "🔒 " : ""}{TEMA_LABELS[tema] ?? tema}
                        </span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="h-2 rounded-full bar-animate" style={{ width: `${pctVal}%`, background: locked ? "#cbd5e1" : barColor }} />
                        </div>
                        <span className="text-xs font-bold shrink-0 w-10 text-right" style={{ color: locked ? "#94a3b8" : textColor }}>
                          {locked ? "Premium" : `${pctVal}%`}
                        </span>
                      </div>
                      {sm2 && sm2.practiced > 0 && !locked && (
                        <div className="flex items-center gap-3 pl-0">
                          <span className="w-28 shrink-0" />
                          <div className="flex items-center gap-2 text-[11px]" style={{ color: "#64748b" }}>
                            <span>🃏</span>
                            <span>{sm2.practiced} procvičeno</span>
                            {sm2.mastered > 0 && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span style={{ color: "#2E6DA4" }}>{sm2.mastered} zvládnuto</span>
                              </>
                            )}
                            <span className="text-slate-300">·</span>
                            <span>{sm2.total} celkem</span>
                          </div>
                        </div>
                      )}
                    </Link>
                  );
                })}
                {topicScores.length > 5 && (
                  <button
                    onClick={() => setTopicsExpanded((v) => !v)}
                    className="w-full py-2.5 text-xs font-semibold border-t border-slate-100 transition-colors hover:bg-slate-50"
                    style={{ color: "#2E6DA4" }}
                  >
                    {topicsExpanded ? "▲ Skrýt" : `▼ Zobrazit všechna témata (${topicScores.length})`}
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center text-slate-400 text-sm">
                Nejdřív projdi diagnostický test — uvidíš svá silná a slabá témata.
              </div>
            )}
          </div>

          {/* ── SEKCE: AKTIVITA ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Aktivita</p>
            <ActivityHeatmap />
          </div>
        </div>
      )}

      {/* ── TAB: HISTORIE ── */}
      {activeTab === "historie" && (
        <div className="tab-enter bg-white rounded-2xl border border-slate-200 overflow-hidden">
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
        <div className="tab-enter flex flex-col gap-4">
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
        </div>
      )}

      {/* ── SPODNÍ AKCE (vždy viditelné, mimo tabu) ── */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Nastavení & účet</p>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">

          {/* Přezdívka a avatar */}
          <div>
            <button
              type="button"
              onClick={() => { setShowPersonaForm((v) => !v); setPersonaMsg(null); }}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{avatarEmoji || "🎨"}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Jméno a avatar</p>
                  <p className="text-xs text-slate-400">{displayName || "Nastav si jméno a emoji"}</p>
                </div>
              </div>
              <span className="text-slate-300 text-lg">{showPersonaForm ? "▲" : "→"}</span>
            </button>

            {showPersonaForm && (
              <form onSubmit={handleSavePersona} className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-50">
                {/* Emoji grid */}
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Vyber emoji avatar:</p>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedEmoji(selectedEmoji === emoji ? "" : emoji)}
                        className="h-10 rounded-xl flex items-center justify-center text-xl transition-all press-scale"
                        style={selectedEmoji === emoji
                          ? { background: "#eff6ff", border: "2px solid #2E6DA4", transform: "scale(1.12)" }
                          : { background: "#f8fafc", border: "2px solid transparent" }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Jméno + Příjmení */}
                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Jméno</label>
                    <input
                      type="text"
                      value={firstNameInput}
                      onChange={(e) => setFirstNameInput(e.target.value)}
                      placeholder="Tomáš"
                      maxLength={30}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 transition-colors"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Příjmení</label>
                    <input
                      type="text"
                      value={lastNameInput}
                      onChange={(e) => setLastNameInput(e.target.value)}
                      placeholder="Novák"
                      maxLength={30}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 transition-colors"
                    />
                  </div>
                </div>

                {personaMsg && (
                  <p className={`text-xs px-3 py-2 rounded-lg font-medium ${personaMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                    {personaMsg.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={personaSaving}
                  className="w-full py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-60 transition-opacity"
                  style={{ background: "#0D1B3E" }}
                >
                  {personaSaving ? "Ukládám…" : "Uložit"}
                </button>
              </form>
            )}
          </div>

          {/* Notifikace */}
          {notifState !== "unsupported" && (
            <button
              type="button"
              onClick={notifState === "granted" || notifState === "denied" || notifState === "loading" ? undefined : handleEnableNotifs}
              disabled={notifState === "granted" || notifState === "denied" || notifState === "loading"}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{notifState === "granted" ? "🔔" : "🔕"}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {notifState === "granted" ? "Připomenutí aktivní" : "Zapnout připomenutí"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {notifState === "denied" ? "Zakázáno v nastavení prohlížeče" : "Denní připomínka tréninku"}
                  </p>
                </div>
              </div>
              {notifState === "granted" && <span className="text-xs font-bold text-green-600">Aktivní ✓</span>}
              {notifState === "default" && <span className="text-slate-300 text-lg">→</span>}
            </button>
          )}

          {/* Změna hesla */}
          <div>
            <button
              type="button"
              onClick={() => { setShowPasswordForm((v) => !v); setPasswordMsg(null); }}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🔑</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Změna hesla</p>
                  <p className="text-xs text-slate-400">Aktualizuj přihlašovací heslo</p>
                </div>
              </div>
              <span className="text-slate-300 text-lg">{showPasswordForm ? "▲" : "→"}</span>
            </button>
            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-50">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nové heslo (min. 6 znaků)"
                  required
                  className="w-full mt-3 px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 transition-colors"
                />
                {passwordMsg && (
                  <p className={`text-xs px-3 py-2 rounded-lg font-medium ${passwordMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                    {passwordMsg.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-60 transition-opacity"
                  style={{ background: "#0D1B3E" }}
                >
                  {passwordLoading ? "Ukládám…" : "Uložit nové heslo"}
                </button>
              </form>
            )}
          </div>

          {/* Rodičovský portál */}
          <Link
            href="/rodice/dashboard"
            className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">👨‍👩‍👧</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Rodičovský portál</p>
                <p className="text-xs text-slate-400">Přehled pokroku pro rodiče</p>
              </div>
            </div>
            <span className="text-slate-300 text-lg">→</span>
          </Link>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 transition-colors text-left"
          >
            <span className="text-xl">🚪</span>
            <p className="text-sm font-semibold text-red-600">Odhlásit se</p>
          </button>
        </div>
      </div>

    </div>
  );
}
