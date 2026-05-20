"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { loadProgress } from "@/lib/progress";
import XPProgressBar from "@/components/XPProgressBar";
import BottomNav from "@/components/BottomNav";
import { TEMA_LABELS } from "@/types";
import type { Session } from "@supabase/supabase-js";
import challengesJson from "@/data/daily-challenges.json";
import { getReadiness, CERMAT_TOPICS } from "@/lib/readiness";
import { localLoadCards, localLoadSessions } from "@/lib/storage";
import { isDue } from "@/lib/sm2";
import CountdownBanner from "@/components/CountdownBanner";
import GuidanceModal from "@/components/GuidanceModal";
import { usePremium } from "@/lib/premium";
import { PREMIUM_TOPICS } from "@/lib/subscription";
import { getSmartRedirect } from "@/lib/smart-redirect";
import { getTodayTopic } from "@/lib/studijni-plan";

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

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: "🎯",
    title: "Diagnostika",
    subtitle: "Zjistíme, kde stojíš",
    desc: "MateMax začne krátkým adaptivním testem (5 minut). Automaticky pozná, která témata ovládáš a kde máš mezery — a sestaví tréninkový plán přímo na míru.",
    color: "bg-blue-50 border-blue-200",
    accent: "text-blue-600",
  },
  {
    step: "02",
    icon: "🏋️",
    title: "Denní trénink",
    subtitle: "10 minut každý den stačí",
    desc: "Každý den dostaneš sadu příkladů seřazených od lehčích k těžším. Algoritmus sleduje tvé chyby a automaticky tě vrátí k tématům, kde se zasekáváš — dokud je neovládneš.",
    color: "bg-orange-50 border-orange-200",
    accent: "text-orange-600",
  },
  {
    step: "03",
    icon: "📊",
    title: "Týdenní report",
    subtitle: "Rodiče vědí, jak to jde",
    desc: "Každé pondělí ráno dostanou rodiče email s přehledem: kolik příkladů dítě zvládlo, jaký má streak, kde má mezery a co procvičovat příští týden. Bez zkoušení u večeře.",
    color: "bg-green-50 border-green-200",
    accent: "text-green-600",
  },
];

const PRICING = [
  {
    name: "Zdarma",
    price: "0 Kč",
    period: "",
    desc: "Pro vyzkoušení, bez závazku",
    highlight: false,
    features: [
      "✓ Diagnostický test",
      "✓ 3 témata (zlomky, rovnice, geometrie)",
      "✓ 10 příkladů denně",
      "✓ Základní statistiky",
      "✗ Týdenní report pro rodiče",
      "✗ Plná databáze 700+ příkladů (všechna témata)",
      "✗ CERMAT cvičné testy",
    ],
    cta: "Začít zdarma",
    ctaHref: "/vitej",
    ctaStyle: "border-2 border-[#2E6DA4] text-[#2E6DA4] hover:bg-blue-50",
  },
  {
    name: "Premium",
    price: "99 Kč",
    period: "/ měsíc",
    desc: "Plná příprava na přijímačky",
    highlight: true,
    badge: "Nejoblíbenější",
    features: [
      "✓ Všechna témata CERMAT (9 oblastí)",
      "✓ Neomezený počet příkladů",
      "✓ Adaptivní algoritmus",
      "✓ Týdenní report pro rodiče",
      "✓ 2 kompletní CERMAT cvičné testy",
      "✓ Streak systém + motivační odměny",
      "✓ Přístup na mobilu i počítači",
    ],
    cta: "Vyzkoušet Premium",
    ctaHref: "/registrace",
    ctaStyle: "bg-[#2E6DA4] text-white hover:bg-[#1e5a8a]",
  },
];

const FAQS = [
  {
    q: "Pro jaký věk je MateMax určen?",
    a: "Pro žáky 8. a 9. třídy, ideálně rok před přijímačkami. Obsah přesně odpovídá formátu CERMAT, který používá většina gymnázií a středních škol.",
  },
  {
    q: "Jak dlouho denně se má dítě učit?",
    a: "Stačí 10 minut. Algoritmus sám vybere 7 příkladů — seřazených podle toho, kde žák nejvíc potřebuje procvičit. Pravidelnost je důležitější než délka.",
  },
  {
    q: "Co když dítě udělá chybu? Jak algoritmus reaguje?",
    a: "Příklad se vrátí za 1–2 dny znovu. Přesně tak funguje SM-2 (spaced repetition) — opakování ve chvíli, kdy hrozí zapomenutí. Čím víc chyb, tím dřív se příklad vrátí.",
  },
  {
    q: "Mohu MateMax použít i bez přijímaček?",
    a: "Ano, pro kohokoliv kdo chce procvičovat matematiku. Databáze 700+ příkladů pokrývá celý 2. stupeň ZŠ — zlomky, rovnice, geometrie, procenta, mocniny i slovní úlohy.",
  },
  {
    q: "Jak se liší MateMax od pracovního sešitu Matematika Snadno?",
    a: "Sešit je fyzická pomůcka — cheat sheety a příklady na papíře. MateMax je digitální trenér s adaptivním algoritmem, který sleduje pokrok a posílá rodičům týdenní report. Oba produkty se skvěle doplňují.",
  },
  {
    q: "Je přihlášení povinné?",
    a: "Ne, aplikace funguje i bez účtu — veškerý pokrok se uloží do prohlížeče. Registrace se vyplatí, pokud chceš trénovat na více zařízeních nebo nechceš přijít o statistiky při smazání dat prohlížeče.",
  },
  {
    q: "Funguje MateMax offline?",
    a: "Příklady a váš pokrok se ukládají lokálně, takže základní trénink funguje i bez připojení k internetu. Synchronizace s cloudem a týdenní report vyžadují internet.",
  },
  {
    q: "Jak rychle vidím výsledky?",
    a: "Po prvním tréninku algoritmus ihned ví, která témata procvičuješ nejhůř a příště je zařadí jako první. Viditelný pokrok v testech bývá znát po 2–3 týdnech pravidelného tréninku.",
  },
];

// ─── KOMPONENTY ──────────────────────────────────────────────────────────────

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
      {children}
    </span>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border rounded-xl overflow-hidden"
      style={{ borderColor: open ? "#2E6DA4" : "#e5e7eb" }}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors"
        style={{ background: open ? "#f0f7ff" : "#fff" }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="font-semibold pr-4 text-[15px]" style={{ color: "#0D1B3E" }}>
          {q}
        </span>
        <span
          className="text-2xl flex-shrink-0 font-light transition-transform duration-200 select-none"
          style={{
            color: "#2E6DA4",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
            display: "inline-block",
          }}
        >
          +
        </span>
      </button>
      {open && (
        <div
          className="px-6 pb-5 pt-1 text-sm leading-relaxed border-t"
          style={{ color: "#4b5563", borderColor: "#e0ecf8", background: "#f8fbff" }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

// ─── PŘIHLÁŠENÝ DASHBOARD ────────────────────────────────────────────────────

const DAILY_GOAL = 10;
const RING_R = 40;
const RING_C = 2 * Math.PI * RING_R; // ≈ 251.3

interface WeakTopic {
  tema: string;
  score: number;
}

function LoggedInDashboard({
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
  const firstName = email.split("@")[0];
  const todayChallenge = getTodayChallenge();

  const [todayCount, setTodayCount] = useState(0);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [challengeDoneToday, setChallengeDoneToday] = useState(false);
  const [parentMessage, setParentMessage] = useState<string | null>(null);
  const [parentMessageId, setParentMessageId] = useState<string | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [readinessScore, setReadinessScore] = useState<{ score: number; label: string; color: string } | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<Array<{ tema: string; label: string }>>([]);
  const [hasWrongCards, setHasWrongCards] = useState(false);
  const [guidanceModal, setGuidanceModal] = useState<null | {
    type: "diagnostika" | "comeback" | "daily";
    daysSince?: number;
    todayTopic?: { tema: string; label: string; score: number } | null;
  }>(null);
  const { isPremium } = usePremium();

  useEffect(() => {
    let cancelled = false;

    // Sync diagDone ze Supabase před rozhodováním — opravuje bug po odhlášení/přihlášení
    async function decideModal() {
      let effectiveDiagDone = diagDone;

      if (supabase && !diagDone) {
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
    setDueCount(cards.filter(isDue).length);
    setHasWrongCards(cards.some((c) => c.repetitions > 0 && c.lastQuality <= 2));

    const r = getReadiness();
    if (r.hasData) setReadinessScore({ score: r.score, label: r.label, color: r.color });

    // Suggested topics: weakest that have been at least touched
    const sessions = localLoadSessions();
    const lastPracticed: Record<string, string> = {};
    for (const s of sessions) {
      for (const t of s.temas) {
        if (!lastPracticed[t]) lastPracticed[t] = s.date;
      }
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    const suggested = r.topics
      .filter((t) => t.score > 0 || t.practiced > 0)
      .map((t) => {
        const last = lastPracticed[t.tema];
        const daysSince = last
          ? Math.floor((new Date(todayStr).getTime() - new Date(last).getTime()) / 86400000)
          : 99;
        const urgency = (1 - t.score / 100) * 0.6 + Math.min(daysSince, 7) / 7 * 0.4;
        return { ...t, urgency };
      })
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 3)
      .map(({ tema, label }) => ({ tema, label }));
    setSuggestedTopics(suggested);
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

  const goalMet = todayCount >= DAILY_GOAL;

  let heroSubtext: string;
  if (goalMet) {
    heroSubtext = "✅ Dnešní cíl splněn! Výborná práce.";
  } else if (streak > 1) {
    heroSubtext = `🔥 ${streak} dní v řadě! Nepřeruš sérii.`;
  } else if (todayCount > 0) {
    heroSubtext = `Dnes ${todayCount} příkladů. Cíl: ${DAILY_GOAL}. Pokračuj!`;
  } else {
    heroSubtext = `Dnešní cíl: ${DAILY_GOAL} příkladů. Zatím: 0/${DAILY_GOAL}`;
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
        style={{ backgroundColor: "rgba(255,255,255,0.95)", WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)" }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm" style={{ background: "#0D1B3E" }}>
              M²
            </div>
            <span className="font-bold text-base" style={{ color: "#0D1B3E" }}>MateMax</span>
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
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 50%, #0D1B3E 100%)" }}
      >
        <div className="max-w-2xl mx-auto px-6 py-10 md:py-14 relative z-10">
          <p className="text-blue-300 text-sm font-semibold mb-2">Vítej zpět!</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
            {firstName} 👋
          </h1>
          <p className="mt-2 text-blue-200 text-base">{heroSubtext}</p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-4">

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

        {/* Countdown */}
        <CountdownBanner variant="compact" />

        {/* XP bar */}
        <XPProgressBar xp={xp} />

        {/* Premium upsell banner — only for free users */}
        {!isPremium && (
          <Link
            href="/cenik"
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 100%)", border: "1px solid #2E6DA4" }}
          >
            <span className="text-xl shrink-0">🔒</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white leading-tight">9 prémiových témat čeká</p>
              <p className="text-xs text-blue-300 mt-0.5">Geometrie, Mocniny, Výrazy a další · od 99 Kč/měsíc</p>
            </div>
            <span
              className="shrink-0 text-xs font-black px-3 py-1.5 rounded-lg whitespace-nowrap"
              style={{ background: "#2E6DA4", color: "#fff" }}
            >
              Odemknout →
            </span>
          </Link>
        )}

        {/* Due cards + readiness pill row */}
        {(dueCount > 0 || readinessScore) && (
          <div className="flex gap-2">
            {dueCount > 0 && (
              <Link
                href="/trenink?rezim=sm2"
                className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "#eff6ff", color: "#2E6DA4", border: "1px solid #bfdbfe" }}
              >
                <span>🃏</span>
                <span>{dueCount} karet ke zkoušení</span>
              </Link>
            )}
            {readinessScore && (
              <Link
                href="/profil"
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors whitespace-nowrap"
                style={{ background: "#f8faff", color: readinessScore.color, border: `1px solid ${readinessScore.color}30` }}
              >
                <span>📊</span>
                <span>{readinessScore.score}%</span>
              </Link>
            )}
          </div>
        )}

        {/* Dnešní výzva — nejslabší téma z diagnostiky */}
        {diagDone && weakTopics.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
          >
            <div className="px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-300 mb-1">Dnešní výzva</p>
              <p className="text-xl font-black text-white">
                {TEMA_LABELS[weakTopics[0].tema] ?? weakTopics[0].tema}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-xs font-bold text-white">
                  Připravenost: {Math.round(weakTopics[0].score * 100)} %
                </span>
                <span className="text-xs text-blue-200">Nejslabší téma — procvič ho dnes</span>
              </div>
            </div>
            <Link
              href={`/trenink?tema=${weakTopics[0].tema}`}
              className="block px-5 py-3 text-center font-black text-sm text-white"
              style={{ background: "rgba(255,255,255,0.12)", borderTop: "1px solid rgba(255,255,255,0.15)" }}
            >
              Začít trénink →
            </Link>
          </div>
        )}

        {/* Suggested topics */}
        {suggestedTopics.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
              💡 Dnes doporučujeme
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedTopics.map(({ tema, label }) => {
                const locked = !isPremium && PREMIUM_TOPICS.has(tema);
                return (
                  <Link
                    key={tema}
                    href={locked ? "/cenik" : `/trenink?tema=${tema}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                    style={locked
                      ? { background: "#f1f5f9", color: "#94a3b8", border: "1px solid #e2e8f0" }
                      : { background: "#eff6ff", color: "#2E6DA4", border: "1px solid #bfdbfe" }}
                  >
                    {locked ? "🔒 " : ""}{label} {locked ? "" : "→"}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Opakovat chyby CTA */}
        {hasWrongCards && (
          <Link
            href="/trenink?rezim=chyby"
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}
          >
            <span className="text-lg">🔄</span>
            <div>
              <p className="text-sm font-bold">Procvičit chyby</p>
              <p className="text-xs" style={{ color: "#ef4444" }}>Příklady kde sis nebyl jistý</p>
            </div>
            <span className="ml-auto text-sm font-semibold">→</span>
          </Link>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center stagger-1 card-hover">
            <p className="text-xs text-slate-400 font-medium mb-1">Streak</p>
            <p className="text-2xl font-black text-orange-500"><span className="streak-bounce">🔥</span> {streak}</p>
            <p className="text-xs text-slate-400">dní v řadě</p>
          </div>
          <div
            className="rounded-2xl border p-4 text-center stagger-2 card-hover"
            style={{ background: diagDone ? "#f0fdf4" : "#fff7ed", borderColor: diagDone ? "#bbf7d0" : "#fed7aa" }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: diagDone ? "#166534" : "#92400e" }}>
              Diagnostika
            </p>
            <p className="text-xl mb-0.5">{diagDone ? "✅" : "🎯"}</p>
            <p className="text-xs font-semibold" style={{ color: diagDone ? "#166534" : "#92400e" }}>
              {diagDone ? "Hotovo" : "Ještě ne"}
            </p>
          </div>
        </div>

        {/* Daily goal – SVG ring */}
        <div
          className="rounded-2xl p-5 flex items-center gap-5 stagger-3 card-hover"
          style={goalMet
            ? { background: "#f0fdf4", border: "2px solid #bbf7d0" }
            : { background: "#fff", border: "1px solid #e2e8f0" }
          }
        >
          {/* Ring */}
          <div className="shrink-0">
            <svg width="88" height="88" viewBox="0 0 96 96" fill="none">
              <defs>
                <linearGradient id="goal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={goalMet ? "#22c55e" : "#0D1B3E"} />
                  <stop offset="100%" stopColor={goalMet ? "#16a34a" : "#2E6DA4"} />
                </linearGradient>
              </defs>
              {/* Track */}
              <circle cx="48" cy="48" r={RING_R} stroke="#e2e8f0" strokeWidth="9" />
              {/* Progress */}
              <circle
                cx="48" cy="48" r={RING_R}
                stroke="url(#goal-grad)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - Math.min(1, todayCount / DAILY_GOAL))}
                transform="rotate(-90 48 48)"
                style={{ transition: "stroke-dashoffset 0.7s ease" }}
              />
              {/* Center text */}
              <text x="48" y="43" textAnchor="middle" fontSize="20" fontWeight="800" fill={goalMet ? "#15803d" : "#0D1B3E"}>
                {todayCount}
              </text>
              <text x="48" y="58" textAnchor="middle" fontSize="11" fill="#94a3b8">
                z {DAILY_GOAL}
              </text>
            </svg>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: goalMet ? "#166534" : "#64748b" }}>
              Dnešní cíl
            </p>
            {goalMet ? (
              <>
                <p className="text-base font-black" style={{ color: "#15803d" }}>Splněno! +15 XP bonus 🎉</p>
                <p className="text-xs mt-1" style={{ color: "#16a34a" }}>{todayCount} příkladů dnes</p>
                <Link
                  href="/trenink"
                  className="inline-block mt-2 text-xs font-bold px-3 py-1.5 rounded-lg"
                  style={{ background: "#22c55e", color: "#fff" }}
                >
                  Procvičovat dál →
                </Link>
              </>
            ) : (
              <>
                <p className="text-base font-black" style={{ color: "#0D1B3E" }}>
                  {todayCount === 0 ? "Zatím žádné příklady" : `${todayCount} příkladů hotovo`}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ještě {DAILY_GOAL - todayCount} do splnění cíle
                </p>
                <Link
                  href="/trenink"
                  className="inline-block mt-2 text-xs font-bold px-3 py-1.5 rounded-lg"
                  style={{ background: "#0D1B3E", color: "#fff" }}
                >
                  Jít trénovat →
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Dnešní výzva */}
        <Link
          href="/vyzva"
          className="block rounded-2xl overflow-hidden shadow-sm transition-all active:scale-[0.98] hover:shadow-md stagger-4"
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

        {/* CERMAT test */}
        <Link
          href="/cermat-test"
          className="block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all active:scale-[0.98] hover:shadow-md stagger-5"
        >
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#2E6DA4" }}>CERMAT test</p>
              <p className="text-base font-extrabold" style={{ color: "#0D1B3E" }}>Otestuj se na čisto</p>
              <p className="text-xs text-slate-400 mt-0.5">Simulace přijímaček · 15 příkladů · 25 min</p>
            </div>
            <span className="text-3xl">🎯</span>
          </div>
        </Link>

        {/* Slabá témata */}
        {weakTopics.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-bold mb-3" style={{ color: "#0D1B3E" }}>🎯 Kde máš mezery</p>
            <div className="flex flex-col gap-2">
              {weakTopics.map(({ tema, score }) => {
                const locked = !isPremium && PREMIUM_TOPICS.has(tema);
                return (
                <Link
                  key={tema}
                  href={locked ? "/cenik" : `/trenink?tema=${tema}`}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border transition-colors hover:bg-slate-50"
                  style={{ borderColor: "#e2e8f0" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{locked ? "🔒" : "📉"}</span>
                    <span className="text-sm font-semibold text-slate-700">
                      {TEMA_LABELS[tema] ?? tema}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: score < 0.4 ? "#fef2f2" : "#fff7ed",
                        color: score < 0.4 ? "#991b1b" : "#92400e",
                      }}
                    >
                      {Math.round(score * 100)} %
                    </span>
                    <span className="text-xs text-slate-400">{locked ? "Premium →" : "procvičit →"}</span>
                  </div>
                </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Main CTA */}
        <Link
          href="/trenink"
          className="block w-full py-4 text-white font-black rounded-2xl text-center text-lg shadow-lg"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          💪 Pokračovat v tréninku →
        </Link>

        {/* Secondary CTAs */}
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
              style={{ background: "#eff6ff", color: "#2E6DA4", border: "2px solid #bfdbfe" }}
            >
              🎯 Spustit diagnostiku
            </Link>
          ) : (
            <Link
              href="/studijni-plan"
              className="block py-3 text-center rounded-xl font-semibold text-sm"
              style={{ background: "#eff6ff", color: "#2E6DA4", border: "2px solid #bfdbfe" }}
            >
              📅 Studijní plán
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

// ─── LANDING PAGE (HOSTÉ) ─────────────────────────────────────────────────────

export default function LandingPage() {
  const [diagDone, setDiagDone] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const diag = localStorage.getItem("matemax-diag-done") === "1";
    setDiagDone(diag);

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        if (data.session) {
          const p = loadProgress();
          setXp(p.xp);
          setStreak(p.streak);

          // Smart post-login redirect triggered by OAuth callback (?login=1)
          const params = new URLSearchParams(window.location.search);
          if (params.get("login") === "1") {
            window.history.replaceState({}, "", "/");
            const dest = getSmartRedirect("/");
            if (dest !== "/" && dest !== "/?comeback=1") {
              window.location.href = dest;
              return;
            }
          }
        }
        setSessionChecked(true);
      });
    } else {
      setSessionChecked(true);
    }
  }, []);

  if (sessionChecked && session) {
    return (
      <LoggedInDashboard session={session} xp={xp} streak={streak} diagDone={diagDone} />
    );
  }

  return (
    <div className="bg-white">

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 border-b border-gray-100 shadow-sm"
        style={{ backgroundColor: "rgba(255,255,255,0.95)", WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)" }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm" style={{ background: "#0D1B3E" }}>
              M²
            </div>
            <span className="font-bold text-base" style={{ color: "#0D1B3E" }}>MateMax</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="#jak-to-funguje" className="text-sm text-gray-500 hover:text-gray-800 hidden md:block transition-colors">
              Jak to funguje
            </a>
            <a href="#pro-rodice" className="text-sm text-gray-500 hover:text-gray-800 hidden md:block transition-colors">
              Pro rodiče
            </a>
            <a href="#cena" className="text-sm text-gray-500 hover:text-gray-800 hidden md:block transition-colors">
              Ceník
            </a>
            <Link
              href="/prihlaseni"
              className="text-sm font-bold px-4 py-[6px] rounded-lg border-2 transition-colors hover:bg-blue-50"
              style={{ borderColor: "#2E6DA4", color: "#2E6DA4" }}
            >
              Přihlásit se
            </Link>
            <Link
              href={diagDone ? "/trenink" : "/vitej"}
              className="text-sm font-bold text-white px-4 py-2 rounded-lg transition-colors shadow-sm hover:shadow-md"
              style={{ background: "#2E6DA4" }}
            >
              {diagDone ? "Trénovat →" : "Začít zdarma"}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 50%, #0D1B3E 100%)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5 translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ background: "#2E6DA4" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-5 -translate-x-1/2 translate-y-1/2 pointer-events-none" style={{ background: "#00B4D8" }} />

        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28 text-center relative z-10">
          <Badge>Nový produkt od Matematika Snadno</Badge>

          <h1 className="mt-6 text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Matematika, která{" "}
            <span style={{ color: "#00B4D8" }}>baví.</span>
            <br />
            Každý den trochu.
          </h1>

          <p className="mt-6 text-lg md:text-xl text-blue-200 max-w-2xl mx-auto leading-relaxed">
            MateMax je adaptivní matematický trenér pro žáky 8. a 9. třídy.
            10 minut denně, chytrý algoritmus a týdenní report pro rodiče —
            příprava na přijímačky bez stresu a bez doučování.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["Pro žáky 8. a 9. třídy", "Příklady ve stylu CERMAT", "Funguje na mobilu i PC", "Rodiče mají přehled"].map((tag) => (
              <span key={tag} className="text-sm bg-white/10 text-blue-100 px-4 py-2 rounded-full border border-white/20">
                ✓ {tag}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/vitej"
              className="inline-block text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors shadow-lg"
              style={{ background: "#00B4D8" }}
            >
              Začít zdarma →
            </Link>
            <Link
              href="/cermat-test"
              className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/20 transition-colors"
            >
              Vyzkoušet CERMAT test →
            </Link>
          </div>

          <p className="mt-4 text-sm text-blue-300">
            Zdarma navždy pro 3 témata · Premium od 99 Kč/měsíc · Bez kreditní karty
          </p>
        </div>
      </section>

      {/* ── CO TĚ ČEKÁ ───────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>Co tě čeká</h2>
          <p className="text-gray-500 mt-2 text-sm">Tři nástroje, které tě naučí připravit se bez stresu.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: "🎯", title: "Diagnostický test", desc: "Zjisti kde máš mezery za 10 minut" },
            { icon: "💪", title: "Denní výzvy", desc: "Každý den nová výzva, každý den o krok blíž" },
            { icon: "📊", title: "Sledování pokroku", desc: "Vidíš přesně co umíš a co ne" },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center gap-3"
            >
              <span className="text-4xl">{icon}</span>
              <p className="text-base font-extrabold" style={{ color: "#0D1B3E" }}>{title}</p>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ČÍSLA ────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "700+", label: "příkladů v databázi" },
            { value: "9", label: "témat CERMAT" },
            { value: "10 min", label: "denně stačí" },
            { value: "1×/týden", label: "report pro rodiče" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── JAK TO FUNGUJE ───────────────────────────────────────────── */}
      <section id="jak-to-funguje" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <Badge>Jak to funguje</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>
            Tři kroky k lepším výsledkům
          </h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            MateMax se přizpůsobí každému žákovi individuálně. Žádné zbytečné opakování toho, co už umí.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className={`relative border-2 rounded-2xl p-7 ${item.color}`}>
              <div className={`text-5xl font-black opacity-10 absolute top-4 right-6 ${item.accent}`}>
                {item.step}
              </div>
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold" style={{ color: "#0D1B3E" }}>{item.title}</h3>
              <p className={`text-sm font-semibold mt-1 mb-3 ${item.accent}`}>{item.subtitle}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── APP MOCKUP ───────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge>Ukázka aplikace</Badge>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>
                Přehledné a jednoduché rozhraní
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Dítě vidí svůj denní cíl, aktuální streak a seznam příkladů k vyřešení.
                Žádné zbytečné tlačítka, žádný chaos — jen čisté procvičování.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                {[
                  "Příklady seřazeny od lehčích k těžším",
                  "Okamžitá zpětná vazba po každé odpovědi",
                  "Vysvětlení správného postupu po chybě",
                  "Vizuální pokrok a streak motivace",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="font-bold mt-0.5" style={{ color: "#00B4D8" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/vitej"
                className="inline-block mt-8 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                style={{ background: "#0D1B3E" }}
              >
                Vyzkoušet zdarma →
              </Link>
            </div>

            <div className="rounded-2xl p-6 shadow-2xl" style={{ background: "#0D1B3E" }}>
              <div className="rounded-xl p-4 mb-3" style={{ background: "#1e3a6e" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-bold text-sm">🧮 MateMax</span>
                  <span className="text-yellow-400 text-sm font-bold">🔥 7 dní</span>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: "#0D1B3E" }}>
                  <div className="text-xs text-blue-300 mb-1">Dnešní úloha — Zlomky</div>
                  <div className="text-white text-lg font-bold">Vypočítej: ³⁄₄ + ⅙ = ?</div>
                </div>
              </div>
              {["11/12", "5/6", "7/12", "1/2"].map((ans, i) => (
                <div
                  key={ans}
                  className="mb-2 px-4 py-3 rounded-lg text-sm font-semibold"
                  style={{
                    background: i === 0 ? "#22c55e" : "rgba(255,255,255,0.1)",
                    color: i === 0 ? "#fff" : "rgba(255,255,255,0.8)",
                  }}
                >
                  {String.fromCharCode(65 + i)}) {ans}
                </div>
              ))}
              <div className="mt-4 rounded-lg p-3" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
                <div className="text-green-400 text-xs font-semibold">✓ Správně! +10 XP</div>
                <div className="text-xs mt-1" style={{ color: "#93c5fd" }}>³⁄₄ = ⁹⁄₁₂, ⅙ = ²⁄₁₂ → ⁹⁄₁₂ + ²⁄₁₂ = ¹¹⁄₁₂</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRO RODIČE ───────────────────────────────────────────────── */}
      <section id="pro-rodice" className="py-20" style={{ background: "linear-gradient(180deg, #f0f7ff 0%, #fff 100%)" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge>Pro rodiče</Badge>
            <h2 className="mt-4 text-3xl md:text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>
              Vidíte přesně, jak se dítě připravuje
            </h2>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Bez zkoušení u večeře. Bez doučování. Každé pondělí ráno dostanete email s přehledem —
              víte kolik dítě cvičí, kde je silné a kde má mezery.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {[
              {
                icon: "📊",
                title: "Týdenní report emailem",
                desc: "Každé pondělí 8:00. Streak, úspěšnost, slabá místa, doporučení na další týden — vše na jedné stránce.",
                color: "#2E6DA4",
              },
              {
                icon: "🎯",
                title: "Přesná slabá místa",
                desc: "Místo \"jde to\" víte konkrétně: zlomky 78 %, slovní úlohy 42 %. Pomáháte tam, kde to opravdu potřebuje.",
                color: "#00B4D8",
              },
              {
                icon: "🔥",
                title: "Streak motivace",
                desc: "Dítě nechce přerušit sérii. Vy vidíte, kolik dní v řadě cvičí — bez napomínání, bez tlaku.",
                color: "#f97316",
              },
            ].map(({ icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: `${color}15` }}
                >
                  {icon}
                </div>
                <p className="text-lg font-extrabold" style={{ color: "#0D1B3E" }}>{title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-blue-100 p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <p className="text-xl font-extrabold mb-2" style={{ color: "#0D1B3E" }}>
                Propojte se s účtem svého dítěte
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Stačí 1 minuta — dítě potvrdí propojení v aplikaci a vy začnete dostávat reporty.
                Žádná složitá registrace, žádný účet navíc.
              </p>
            </div>
            <Link
              href="/rodice/prihlaseni"
              className="inline-block text-white font-bold text-base px-8 py-4 rounded-xl transition-colors shadow-lg whitespace-nowrap"
              style={{ background: "#0D1B3E" }}
            >
              Otevřít rodičovský přehled →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CENÍK ────────────────────────────────────────────────────── */}
      <section id="cena" className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <Badge>Ceník</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>
            Začni zdarma, upgraduj kdykoliv
          </h2>
          <p className="mt-3 text-gray-500">Premium lze kdykoli zrušit. Žádné skryté poplatky.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 border-2 ${plan.highlight ? "shadow-xl" : "border-gray-200"}`}
              style={plan.highlight ? { borderColor: "#00B4D8", boxShadow: "0 20px 40px rgba(0,180,216,0.12)" } : {}}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-white text-xs font-bold px-4 py-1 rounded-full" style={{ background: "#00B4D8" }}>
                    {plan.badge}
                  </span>
                </div>
              )}
              <div className="text-lg font-bold" style={{ color: "#0D1B3E" }}>{plan.name}</div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>{plan.price}</span>
                {plan.period && <span className="text-gray-400 mb-1">{plan.period}</span>}
              </div>
              <p className="text-sm text-gray-500 mt-1">{plan.desc}</p>
              <ul className="mt-6 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className={`text-sm ${f.startsWith("✗") ? "text-gray-400" : "text-gray-700"}`}>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className={`mt-8 w-full block text-center font-bold py-3 rounded-xl transition-colors ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          💳 Platba kartou nebo bankovním převodem · Faktura na firmu k dispozici
        </p>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge>FAQ</Badge>
            <h2 className="mt-4 text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>
              Nejčastější otázky
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="py-20 text-center" style={{ background: "#0D1B3E" }}>
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Přijímačky jsou za rohem.
            <br />
            <span style={{ color: "#00B4D8" }}>Začni dnes.</span>
          </h2>
          <p className="mt-4 text-blue-200 text-lg">
            10 minut denně. Adaptivní algoritmus. Rodiče s přehledem.{" "}
            <br className="hidden sm:block" />
            Příprava, která skutečně funguje.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/vitej"
              className="inline-block text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors"
              style={{ background: "#00B4D8" }}
            >
              Začít zdarma →
            </Link>
            <Link
              href="/cermat-test"
              className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/20 transition-colors"
            >
              🎯 CERMAT test →
            </Link>
          </div>
          <p className="mt-4 text-sm text-blue-400">
            Bez kreditní karty · Zrušení kdykoliv · Sešit a aplikace se skvěle doplňují
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <div className="bg-white border-t border-gray-100 text-center py-5 text-xs text-gray-400">
        MateMax © 2026 · by Karel Tůma · Matematika Snadno
      </div>

    </div>
  );
}
