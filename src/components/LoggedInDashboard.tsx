"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import XPProgressBar from "@/components/XPProgressBar";
import BottomNav from "@/components/BottomNav";
import { TEMA_LABELS } from "@/types";
import type { Session } from "@supabase/supabase-js";
import challengesJson from "@/data/daily-challenges.json";
import { localLoadCards, localLoadSessions } from "@/lib/storage";
import CountdownBanner from "@/components/CountdownBanner";
import GuidanceModal from "@/components/GuidanceModal";
import { usePremium } from "@/lib/premium";
import { PREMIUM_TOPICS } from "@/lib/subscription";
import { getTodayTopic } from "@/lib/studijni-plan";
import WeeklyLeaderboard from "@/components/WeeklyLeaderboard";
import PushSubscribeNudge from "@/components/PushSubscribeNudge";
import TopicPathMap from "@/components/TopicPathMap";

// ─── DATA ────────────────────────────────────────────────────────────────────

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

type DailyChallenge = { title: string; xp_reward: number; difficulty: string; topic: string };
function getTodayChallenge(): DailyChallenge {
  return challengesJson[(getDayOfYear() - 1) % challengesJson.length] as DailyChallenge;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Dobré ráno";
  if (h >= 12 && h < 18) return "Dobré odpoledne";
  if (h >= 18 && h < 22) return "Dobrý večer";
  return "Dobrou noc";
}

const MOTIVATIONAL_QUOTES = [
  "Každý příklad, který vyřešíš, tě přibližuje k vysněné škole.",
  "Pravidelnost poráží talent. Dnes je tvůj den!",
  "Chyby jsou součást učení — důležité je nevzdat to.",
  "Za 10 minut práce dnes ušetříš hodiny paniky před přijímačkami.",
  "Matematika se naučit dá. Ty to zvládneš!",
  "Každý den trochu — a za měsíc budeš jiný žák.",
  "Přijímačky jsou za rohem. Dnes uděláš jeden krok navíc.",
];

function getDailyQuote(): string {
  return MOTIVATIONAL_QUOTES[getDayOfYear() % MOTIVATIONAL_QUOTES.length];
}

const DAILY_GOAL = 10;

interface WeakTopic {
  tema: string;
  score: number;
}

interface WeeklyStats {
  totalExamples: number;
  totalCorrect: number;
  totalXP: number;
  topicsCount: number;
  days: { date: string; count: number; label: string }[];
}

const DAY_LABELS_CS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

function computeWeeklyStats(): WeeklyStats | null {
  if (typeof window === "undefined") return null;
  try {
    const sessions = localLoadSessions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { date: string; count: number; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      days.push({ date: d.toISOString().slice(0, 10), count: 0, label: DAY_LABELS_CS[d.getDay()] });
    }

    let totalCorrect = 0, totalExamples = 0, totalXP = 0;
    const topicsSet = new Set<string>();

    for (const s of sessions) {
      const dayEntry = days.find((x) => x.date === s.date);
      if (!dayEntry) continue;
      dayEntry.count += s.total;
      totalCorrect += s.correct;
      totalExamples += s.total;
      totalXP += s.xp;
      for (const t of s.temas) topicsSet.add(t);
    }

    if (totalExamples === 0) return null;
    return { totalExamples, totalCorrect, totalXP, topicsCount: topicsSet.size, days };
  } catch { return null; }
}

function useTilt(strength = 8) {
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>(".tilt-card");
    const handlers: Array<{ el: HTMLElement; onMove: (e: MouseEvent) => void; onLeave: () => void }> = [];
    cards.forEach((el) => {
      const onMove = (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  - 0.5) * strength;
        const y = ((e.clientY - r.top)  / r.height - 0.5) * strength;
        el.style.transform = `perspective(600px) rotateY(${x}deg) rotateX(${-y}deg) scale(1.02)`;
        el.style.boxShadow = `${-x * 0.8}px ${y * 0.8}px 20px rgba(13,27,62,0.12)`;
      };
      const onLeave = () => {
        el.style.transform = "";
        el.style.boxShadow = "";
      };
      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", onLeave);
      handlers.push({ el, onMove, onLeave });
    });
    return () => handlers.forEach(({ el, onMove, onLeave }) => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    });
  }, [strength]);
}

function useScrollReveal() {
  useEffect(() => {
    let raf1: number, raf2: number;
    let fallbackId: ReturnType<typeof setTimeout>;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>(".scroll-reveal"));
        if (!els.length) return;
        // Immediately reveal elements already in viewport (Safari IO unreliable on initial load)
        const vh = window.innerHeight || document.documentElement.clientHeight;
        els.forEach(el => { if (el.getBoundingClientRect().top < vh) el.classList.add("is-visible"); });
        // IO for below-fold elements
        const io = new IntersectionObserver(
          (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } }),
          { threshold: 0 }
        );
        els.filter(el => !el.classList.contains("is-visible")).forEach(el => io.observe(el));
        // Safari fallback: force-reveal anything still hidden after 800ms
        fallbackId = setTimeout(() => {
          document.querySelectorAll<HTMLElement>(".scroll-reveal:not(.is-visible)").forEach(el => el.classList.add("is-visible"));
        }, 800);
      });
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); clearTimeout(fallbackId); };
  }, []);
}

function CountUp({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const t0 = performance.now();
      const dur = 1000;
      function step(now: number) {
        const p = Math.min((now - t0) / dur, 1);
        setVal(Math.round(p * end));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [end]);
  return <span ref={ref}>{val}{suffix}</span>;
}

const HERO_SYMBOLS = [
  { s: "π", top: "15%", right: "8%",  size: 28, delay: "0s"   },
  { s: "√", top: "60%", right: "4%",  size: 22, delay: "1.2s" },
  { s: "∑", top: "25%", left:  "3%",  size: 24, delay: "0.6s" },
  { s: "∞", top: "70%", left:  "6%",  size: 20, delay: "1.8s" },
] as const;

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function LoggedInDashboard({
  session,
  xp,
  streak,
  diagDone,
}: {
  session: Session;
  xp: number;
  streak: number;
  diagDone: boolean;
}) {
  const email = session.user.email ?? "";
  const meta = session.user.user_metadata as Record<string, string> | undefined;
  const fullName = meta?.full_name ?? meta?.name ?? "";
  const firstName = fullName.split(" ")[0] || email.split("@")[0];
  const todayChallenge = getTodayChallenge();

  const [todayCount, setTodayCount] = useState(0);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [challengeDoneToday, setChallengeDoneToday] = useState(false);
  const [parentMessage, setParentMessage] = useState<string | null>(null);
  const [parentMessageId, setParentMessageId] = useState<string | null>(null);
  const [hasWrongCards, setHasWrongCards] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [guidanceModal, setGuidanceModal] = useState<null | {
    type: "diagnostika" | "comeback" | "daily";
    daysSince?: number;
    todayTopic?: { tema: string; label: string; score: number } | null;
  }>(null);
  const { isPremium } = usePremium();
  useScrollReveal();
  useTilt();

  useEffect(() => {
    let cancelled = false;

    // Sync diagDone ze Supabase před rozhodováním — opravuje bug po odhlášení/přihlášení
    async function decideModal() {
      // Čti localStorage synchronně — opravuje race condition kdy prop diagDone přichází jako false při prvním renderu
      const localDiagDone = localStorage.getItem("matemax-diag-done") === "1";
      let effectiveDiagDone = diagDone || localDiagDone;

      if (supabase && !effectiveDiagDone) {
        try {
          const { data: rows } = await supabase
            .from("diagnostic_results")
            .select("tema, correct, total")
            .eq("user_id", session.user.id);
          if (rows && rows.length > 0) {
            const results: Record<string, { correct: number; total: number }> = {};
            for (const row of rows) results[row.tema] = { correct: row.correct, total: row.total };
            localStorage.setItem("matemax-diag-results", JSON.stringify(results));
            localStorage.setItem("matemax-diag-done", "1");
            effectiveDiagDone = true;
          }
        } catch { /* ignore */ }
      }

      if (cancelled) return;

      const todayStr = new Date().toISOString().slice(0, 10);
      const shownKey = `matemax-modal-shown-${todayStr}`;
      if (localStorage.getItem(shownKey)) return;

      if (!effectiveDiagDone) {
        setGuidanceModal({ type: "diagnostika" });
        localStorage.setItem(shownKey, "1");
        return;
      }

      // Diagnostika hotová — check comeback (3+ dny pauza) nebo daily (aktivní žák)
      try {
        const raw = localStorage.getItem("matemax-progress");
        if (raw) {
          const p = JSON.parse(raw) as { lastActiveDate?: string };
          if (p.lastActiveDate) {
            const last = new Date(p.lastActiveDate);
            const daysSince = Math.floor((Date.now() - last.getTime()) / 86400000);
            if (daysSince >= 3) {
              setGuidanceModal({ type: "comeback", daysSince });
              localStorage.setItem(shownKey, "1");
              return;
            }
          }
        }
      } catch { /* ignore */ }

      // Aktivní žák — zobraz daily uvítání s dnešním tématem
      const topic = getTodayTopic();
      const todayTopic = topic
        ? { tema: topic.tema, label: topic.label, score: topic.score }
        : null;
      setGuidanceModal({ type: "daily", todayTopic });
      localStorage.setItem(shownKey, "1");
    }

    decideModal();
    return () => { cancelled = true; };
  }, [diagDone, session]);

  useEffect(() => {
    const cards = localLoadCards();
    setHasWrongCards(cards.some((c) => c.repetitions > 0 && c.lastQuality <= 2));
    setWeeklyStats(computeWeeklyStats());

    const todayStr = new Date().toISOString().slice(0, 10);
    try {
      const raw = localStorage.getItem("matemax-today");
      if (raw) {
        const daily = JSON.parse(raw) as { date: string; count: number };
        if (daily.date === todayStr) setTodayCount(daily.count);
      }
    } catch { /* ignore */ }

    try {
      const raw = localStorage.getItem("matemax-diag-results");
      if (raw) {
        const results = JSON.parse(raw) as Record<string, { correct: number; total: number }>;
        const scored: WeakTopic[] = Object.entries(results)
          .filter(([, v]) => v.total > 0)
          .map(([tema, v]) => ({ tema, score: v.correct / v.total }))
          .sort((a, b) => a.score - b.score)
          .slice(0, 3);
        setWeakTopics(scored);
      }
    } catch { /* ignore */ }

    const challengeKey = "matemax-challenge-done-" + todayStr;
    setChallengeDoneToday(localStorage.getItem(challengeKey) === "1");

    if (supabase && session) {
      supabase
        .from("parent_messages")
        .select("id, message, read_at")
        .eq("child_user_id", session.user.id)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setParentMessage(data[0].message as string);
            setParentMessageId(data[0].id as string);
          }
        });
    }
  }, [session]);

  async function markMessageRead() {
    if (!supabase || !parentMessageId) return;
    await supabase
      .from("parent_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", parentMessageId);
    setParentMessage(null);
    setParentMessageId(null);
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Guidance modal */}
      {guidanceModal && (
        <GuidanceModal
          type={guidanceModal.type}
          daysSince={guidanceModal.daysSince}
          firstName={firstName}
          streak={streak}
          todayTopic={guidanceModal.todayTopic}
          onClose={() => setGuidanceModal(null)}
        />
      )}

      {/* Nav */}
      <nav
        className="sticky top-0 z-50 border-b border-gray-100 shadow-sm"
        style={{ backgroundColor: "var(--nav-bg)", WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)" }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm" style={{ background: "#0D1B3E" }}>
              M²
            </div>
            <span className="font-bold text-base" style={{ color: "var(--text-primary)" }}>MateMax</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profil"
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors hidden sm:block"
            >
              Profil
            </Link>
            <Link
              href="/trenink"
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-colors"
              style={{ background: "#2E6DA4" }}
            >
              Trénovat →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-animated relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-[0.06] translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ background: "#00B4D8" }} />
        <div className="absolute bottom-0 left-0 w-52 h-52 rounded-full opacity-[0.05] -translate-x-1/2 translate-y-1/2 pointer-events-none" style={{ background: "#2E6DA4" }} />
        {HERO_SYMBOLS.map(({ s, size, delay, ...pos }) => (
          <span key={s} className="float absolute font-bold select-none pointer-events-none"
            style={{ ...pos, fontSize: size, color: "#fff", opacity: 0.07, animationDelay: delay }}>
            {s}
          </span>
        ))}

        <div className="max-w-2xl mx-auto px-6 py-10 md:py-14 relative z-10">
          <p className="text-blue-300 text-sm font-semibold mb-1">{getGreeting()},</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
            {firstName} 👋
          </h1>

          {/* Stats pills */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white glass-card">
              <span className={streak >= 3 ? "streak-bounce" : ""}>🔥</span>
              {streak} {streak === 1 ? "den" : "dní"}
            </span>
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white glass-card">
              📝 {todayCount}/{DAILY_GOAL} dnes
            </span>
            {xp > 0 && (
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-amber-300 glass-card">
                ⚡ <CountUp end={xp} /> XP
              </span>
            )}
          </div>

          <p className="mt-3 text-blue-200 text-sm italic leading-snug opacity-90">
            &ldquo;{getDailyQuote()}&rdquo;
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-4">

        {/* Push subscribe nudge */}
        <PushSubscribeNudge streak={streak} userId={session.user.id} />

        {/* Parent message banner */}
        {parentMessage && (
          <div
            className="rounded-2xl px-5 py-4 flex items-start gap-3"
            style={{ background: "#fffbeb", border: "2px solid #fde68a" }}
          >
            <span className="text-2xl mt-0.5">💌</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1">Vzkaz od rodiče</p>
              <p className="text-sm text-amber-900 leading-relaxed">{parentMessage}</p>
              <button
                type="button"
                onClick={markMessageRead}
                className="mt-2 text-xs font-semibold text-amber-700 underline"
              >
                Označit jako přečteno
              </button>
            </div>
          </div>
        )}

        {/* Countdown + XP bar */}
        <CountdownBanner variant="compact" />
        <XPProgressBar xp={xp} />

        {/* Mini bento stat tiles — 3 barevné dlaždice */}
        {(streak > 0 || xp > 0 || todayCount > 0) && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl p-3 flex flex-col gap-0.5" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" }}>
              <span className="text-xl">{streak >= 3 ? "🔥" : "⚡"}</span>
              <p className="text-xl font-black text-white leading-tight">{streak}</p>
              <p className="text-[10px] text-purple-200 leading-tight">{streak === 1 ? "den" : "dní"} streak</p>
            </div>
            <div className="rounded-2xl p-3 flex flex-col gap-0.5" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}>
              <span className="text-xl">📝</span>
              <p className="text-xl font-black text-white leading-tight">{todayCount}<span className="text-sm text-blue-300">/{DAILY_GOAL}</span></p>
              <p className="text-[10px] text-blue-300 leading-tight">příkladů dnes</p>
            </div>
            <div className="rounded-2xl p-3 flex flex-col gap-0.5" style={{ background: "linear-gradient(135deg, #064E3B 0%, #059669 100%)" }}>
              <span className="text-xl">⚡</span>
              <p className="text-xl font-black text-white leading-tight">{xp}</p>
              <p className="text-[10px] text-emerald-300 leading-tight">celkem XP</p>
            </div>
          </div>
        )}

        {/* Day-0 welcome — brand new user */}
        {xp === 0 && streak === 0 && todayCount === 0 && (
          <div
            className="rounded-2xl p-5 flex items-start gap-4 fade-in-up"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-color)" }}
          >
            <span className="text-3xl shrink-0 mt-0.5">🚀</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black" style={{ color: "var(--text-primary)" }}>
                Vítej v MateMax! Začni svůj první trénink
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                {!diagDone
                  ? "Spusť diagnostiku — zjistíme kde máš mezery a sestavíme ti plán na míru."
                  : "Všechno je připraveno. Stačí kliknout na trénink a jdeme na to!"}
              </p>
              <Link
                href={!diagDone ? "/vitej" : "/trenink"}
                className="inline-block mt-2.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white"
                style={{ background: "#2E6DA4" }}
              >
                {!diagDone ? "Spustit diagnostiku →" : "Zahájit trénink →"}
              </Link>
            </div>
          </div>
        )}

        {/* Dnešní úkol — studijní plán + denní progress */}
        {(() => {
          const todayTopic = getTodayTopic();
          const topicToShow = todayTopic ?? (weakTopics.length > 0 ? {
            tema: weakTopics[0].tema,
            label: TEMA_LABELS[weakTopics[0].tema] ?? weakTopics[0].tema,
            score: Math.round(weakTopics[0].score * 100),
          } : null);
          if (!topicToShow) return null;
          const locked = !isPremium && PREMIUM_TOPICS.has(topicToShow.tema);
          const practiceHref = locked ? "/cenik" : `/trenink?tema=${topicToShow.tema}`;
          const SMALL_RING_C = 2 * Math.PI * 22;
          const goalMet2 = todayCount >= DAILY_GOAL;
          return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center gap-4">
                <svg width="52" height="52" viewBox="0 0 56 56" fill="none" className="shrink-0">
                  <circle cx="28" cy="28" r="22" stroke="#e2e8f0" strokeWidth="6" />
                  <circle
                    cx="28" cy="28" r="22"
                    stroke={goalMet2 ? "#22c55e" : "#2E6DA4"}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={SMALL_RING_C}
                    strokeDashoffset={SMALL_RING_C * (1 - Math.min(1, todayCount / DAILY_GOAL))}
                    transform="rotate(-90 28 28)"
                  />
                  <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="800" fill={goalMet2 ? "#16a34a" : "#0D1B3E"}>
                    {todayCount}/{DAILY_GOAL}
                  </text>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    {todayTopic ? "Studijní plán — dnes" : "Doporučujeme procvičit"}
                  </p>
                  <p className="text-base font-black mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {topicToShow.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {goalMet2 ? "Cíl splněn 🎉" : `${DAILY_GOAL - todayCount} příkladů do splnění cíle`}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 border-t border-slate-100">
                <Link
                  href={practiceHref}
                  className="py-3 text-center text-sm font-bold border-r border-slate-100 hover:bg-slate-50 transition-colors"
                  style={{ color: locked ? "#94a3b8" : "#2E6DA4" }}
                >
                  {locked ? "🔒 Premium →" : "Procvičit →"}
                </Link>
                <Link
                  href="/studijni-plan"
                  className="py-3 text-center text-sm font-semibold text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  Studijní plán →
                </Link>
              </div>
            </div>
          );
        })()}

        {/* Main CTA — hned po Dnešním úkolu */}
        <Link
          href="/trenink"
          className="block w-full py-4 text-white font-black rounded-2xl text-center text-lg shadow-lg glow-pulse press-scale"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          💪 Pokračovat v tréninku →
        </Link>

        {/* Procvičit chyby */}
        {hasWrongCards && (
          <Link
            href="/trenink?rezim=chyby"
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors card-hover"
            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}
          >
            <span className="text-lg">🔄</span>
            <div>
              <p className="text-sm font-bold">Zopakovat chyby</p>
              <p className="text-xs" style={{ color: "#ef4444" }}>Příklady kde sis nebyl jistý</p>
            </div>
            <span className="ml-auto text-sm font-semibold">→</span>
          </Link>
        )}

        {/* Mapa učení */}
        <TopicPathMap isPremium={isPremium} />

        {/* Bento 2-col: Kde máš mezery compact + Rychlý mód tile */}
        <div className="grid gap-3" style={{ gridTemplateColumns: weakTopics.length > 0 ? "1fr 1fr" : "1fr" }}>
          {weakTopics.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col card-hover">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-2">📉 Slabá místa</p>
              <div className="flex flex-col gap-0.5 flex-1">
                {weakTopics.slice(0, 3).map(({ tema, score }) => {
                  const locked = !isPremium && PREMIUM_TOPICS.has(tema);
                  return (
                    <Link
                      key={tema}
                      href={locked ? "/cenik" : `/trenink?tema=${tema}`}
                      className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0"
                    >
                      <span className="text-xs font-semibold text-slate-700 truncate mr-1">
                        {locked ? "🔒 " : ""}{TEMA_LABELS[tema] ?? tema}
                      </span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                          background: score < 0.4 ? "#fef2f2" : "#fff7ed",
                          color: score < 0.4 ? "#991b1b" : "#92400e",
                        }}
                      >
                        {Math.round(score * 100)} %
                      </span>
                    </Link>
                  );
                })}
              </div>
              <Link href="/diagnostika" className="text-[10px] font-semibold mt-2 block" style={{ color: "#2E6DA4" }}>
                Celý přehled →
              </Link>
            </div>
          )}

          <Link
            href="/rychly-mod"
            className="rounded-2xl border border-slate-200 p-3 flex flex-col justify-between press-scale"
            style={{ background: "linear-gradient(145deg, #f8faff 0%, #eff6ff 100%)" }}
          >
            <div>
              <span className="text-2xl">⚡</span>
              <p className="text-sm font-black mt-1" style={{ color: "#0D1B3E" }}>Rychlý mód</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">10 příkladů · 60 s · rekord</p>
            </div>
            <span
              className="mt-3 text-xs font-black px-2.5 py-1.5 rounded-xl w-fit text-white"
              style={{ background: "#2E6DA4" }}
            >
              Spustit →
            </span>
          </Link>
        </div>

        {/* Statistika tohoto týdne */}
        {weeklyStats && (() => {
          const acc = weeklyStats.totalExamples > 0
            ? Math.round((weeklyStats.totalCorrect / weeklyStats.totalExamples) * 100)
            : 0;
          const maxCount = Math.max(...weeklyStats.days.map((d) => d.count), 1);
          const todayStr = new Date().toISOString().slice(0, 10);
          return (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 card-hover">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black" style={{ color: "var(--text-primary)" }}>Tento týden</p>
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: "var(--surface-3)", color: "#2E6DA4" }}
                >
                  +{weeklyStats.totalXP} XP
                </span>
              </div>
              <div className="flex items-end gap-1 mb-3" style={{ height: 58 }}>
                {weeklyStats.days.map(({ date, count, label }) => {
                  const barH = count > 0 ? Math.max(6, Math.round((count / maxCount) * 36)) : 4;
                  const isToday = date === todayStr;
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center" style={{ gap: 2 }}>
                      <span className="text-[8px] font-bold leading-none" style={{ color: isToday ? "#0D1B3E" : "#2E6DA4", opacity: count > 0 ? 1 : 0 }}>
                        {count}
                      </span>
                      <div className="w-full flex items-end" style={{ height: 36 }}>
                        <div
                          className="w-full rounded-sm"
                          style={{
                            height: barH,
                            background: isToday ? "var(--navy)" : count > 0 ? "#2E6DA4" : "var(--border-color)",
                            transition: "height 0.5s ease",
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-medium" style={{ color: isToday ? "#0D1B3E" : "#94a3b8" }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-base font-black" style={{ color: "var(--text-primary)" }}>{weeklyStats.totalExamples}</p>
                  <p className="text-[10px] text-slate-400">příkladů</p>
                </div>
                <div className="text-center" style={{ borderLeft: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)" }}>
                  <p className="text-base font-black" style={{ color: acc >= 70 ? "#15803d" : "#f59e0b" }}>{acc}&nbsp;%</p>
                  <p className="text-[10px] text-slate-400">správně</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-black" style={{ color: "var(--text-primary)" }}>{weeklyStats.topicsCount}</p>
                  <p className="text-[10px] text-slate-400">
                    {weeklyStats.topicsCount === 1 ? "téma" : weeklyStats.topicsCount < 5 ? "témata" : "témat"}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Týdenní žebříček */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>🏆 Týdenní žebříček</span>
            <Link href="/vyzva" className="text-xs font-semibold" style={{ color: "#2E6DA4" }}>
              Splnit výzvu →
            </Link>
          </div>
          <WeeklyLeaderboard compact />
        </div>

        {/* Denní výzva */}
        <Link
          href="/vyzva"
          className="block rounded-2xl overflow-hidden shadow-sm transition-all active:scale-[0.98] hover:shadow-md tilt-card"
          style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}
        >
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-300 mb-1">Denní výzva</p>
              <p className="text-base font-extrabold text-white leading-snug">
                {challengeDoneToday ? "✅ Výzva splněna!" : `🏆 ${todayChallenge.title}`}
              </p>
              <p className="text-xs text-blue-200 mt-0.5">
                {challengeDoneToday
                  ? "Skvělá práce. Pokračuj v tréninku!"
                  : `+${todayChallenge.xp_reward} XP za splnění`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
              <span className="text-3xl">{challengeDoneToday ? "🏆" : "→"}</span>
              {!challengeDoneToday && (
                <span className="text-xs font-bold text-amber-300">Spustit →</span>
              )}
            </div>
          </div>
        </Link>

        {/* Premium upsell — až na konci, neruší flow */}
        {!isPremium && (
          <Link
            href="/cenik"
            className="flex items-center gap-3 px-4 py-3 rounded-xl card-hover"
            style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 100%)", border: "1px solid #2E6DA4" }}
          >
            <span className="text-xl shrink-0">🔒</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white leading-tight">6 témat za Premium — odemkni vše</p>
              <p className="text-xs text-blue-300 mt-0.5">Výrazy, Geometrie, Grafy, Konstrukce a další · od 99 Kč</p>
            </div>
            <span
              className="shrink-0 text-xs font-black px-3 py-1.5 rounded-lg whitespace-nowrap btn-shimmer"
              style={{ background: "#2E6DA4", color: "#fff" }}
            >
              Odemknout →
            </span>
          </Link>
        )}

        {/* Spodní akce */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/profil"
            className="block py-3 text-center rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            👤 Zobrazit profil
          </Link>
          {!diagDone ? (
            <Link
              href="/diagnostika"
              className="block py-3 text-center rounded-xl font-semibold text-sm"
              style={{ background: "#fff7ed", color: "#92400e", border: "2px solid #fed7aa" }}
            >
              🎯 Spustit diagnostiku
            </Link>
          ) : (
            <Link
              href="/cermat-test"
              className="block py-3 text-center rounded-xl font-semibold text-sm"
              style={{ background: "#f0fdf4", color: "#166534", border: "2px solid #bbf7d0" }}
            >
              🎯 CERMAT test
            </Link>
          )}
        </div>
      </section>

      <div className="border-t border-gray-100 text-center py-5 text-xs text-gray-400 pb-24">
        MateMax © 2026 · by Karel Tůma · Matematika Snadno
      </div>
      <BottomNav />
    </div>
  );
}
