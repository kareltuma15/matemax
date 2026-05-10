"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { examples } from "@/data/examples";
import { SM2Card } from "@/types";
import { createCard, reviewCard, isDue } from "@/lib/sm2";
import { loadProgress, saveProgress, recordActivity } from "@/lib/progress";
import { remoteLogSession, remoteSyncXP, remoteSyncBadges, localSaveSession } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import {
  loadGamification,
  saveGamification,
  calculateXP,
  getLevelFromXP,
  checkBadgesOnExampleSolved,
  checkBadgesOnSession,
  checkBadgesOnStreak,
  checkBadgesOnTopics,
  checkBadgesOnLevelUp,
  checkBadgesOnSessionStart,
  checkBadgesOnDailyGoal,
  getBadgeConfig,
  GamificationState,
} from "@/lib/gamification";
import Link from "next/link";
import PracticeCard from "@/components/PracticeCard";
import SessionSummary, { WrongAnswer } from "@/components/SessionSummary";
import XPProgressBar from "@/components/XPProgressBar";
import BadgeToast from "@/components/BadgeToast";
import FirstSessionModal from "@/components/FirstSessionModal";
import LevelUpModal from "@/components/LevelUpModal";
import UpgradeCard from "@/components/UpgradeCard";
import GuestTopicMap from "@/components/GuestTopicMap";
import StreakMilestoneModal from "@/components/StreakMilestoneModal";
import { isTopicLocked, GUEST_FREE_TOPICS } from "@/lib/subscription";
import { TEMA_LABELS } from "@/types";

const STREAK_MILESTONES: Record<number, number> = { 7: 50, 14: 100, 30: 200, 60: 350, 100: 500 };

const CARDS_KEY = "matemax-cards";
const DIAG_KEY  = "matemax-diag-results";
const SESSION_SIZE = 7;

function loadCards(): SM2Card[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    if (raw) return JSON.parse(raw) as SM2Card[];
  } catch { /* ignore */ }
  return [];
}

function saveCards(cards: SM2Card[]) {
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
}

function loadDiagScores(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DIAG_KEY);
    if (!raw) return {};
    const results = JSON.parse(raw) as Record<string, { correct: number; total: number }>;
    const scores: Record<string, number> = {};
    for (const [tema, { correct, total }] of Object.entries(results)) {
      scores[tema] = total > 0 ? correct / total : 1;
    }
    return scores;
  } catch { return {}; }
}

function buildSession(
  cards: SM2Card[],
  temaFilter?: string | null,
  rezim?: "chyby" | "sm2" | null,
  guestOnly = false
): string[] {
  let pool = temaFilter ? examples.filter((ex) => ex.tema === temaFilter) : examples;
  if (guestOnly) pool = pool.filter((ex) => GUEST_FREE_TOPICS.has(ex.tema));

  // SM-2 review mode: only due cards, sorted most-overdue first
  if (rezim === "sm2") {
    const poolIds = new Set(pool.map((ex) => ex.id));
    const dueCards = cards
      .filter((c) => isDue(c) && poolIds.has(c.exampleId))
      .sort((a, b) => a.nextReview - b.nextReview)
      .slice(0, SESSION_SIZE);
    return dueCards.map((c) => c.exampleId);
  }

  // "Opakovat chyby" mode: only examples with poor last quality
  if (rezim === "chyby") {
    const badIds = new Set(
      cards
        .filter((c) => c.repetitions > 0 && c.lastQuality <= 2)
        .map((c) => c.exampleId)
    );
    const mistakePool = pool.filter((ex) => badIds.has(ex.id));
    if (mistakePool.length === 0) return [];
    return mistakePool
      .sort(() => Math.random() - 0.5)
      .slice(0, SESSION_SIZE)
      .map((ex) => ex.id);
  }

  const cardMap = new Map(cards.map((c) => [c.exampleId, c]));
  const diagScores = loadDiagScores();

  const due = pool.filter((ex) => {
    const card = cardMap.get(ex.id);
    return !card || isDue(card);
  });

  if (due.length === 0) {
    const fallback = temaFilter
      ? cards.filter((c) => pool.some((ex) => ex.id === c.exampleId))
      : [...cards];
    return fallback
      .sort((a, b) => a.nextReview - b.nextReview)
      .slice(0, SESSION_SIZE)
      .map((c) => c.exampleId);
  }

  const scored = due.map((ex) => {
    const diagScore = diagScores[ex.tema] ?? 1;
    const jitter = Math.random() * 0.1;
    return { ex, sort: diagScore + ex.obtiznost * 0.01 + jitter };
  });
  scored.sort((a, b) => a.sort - b.sort);
  return scored.slice(0, SESSION_SIZE).map((s) => s.ex.id);
}

function enqueueBadges(
  newBadgeIds: string[],
  setQueue: React.Dispatch<React.SetStateAction<string[]>>
) {
  if (newBadgeIds.length > 0) {
    setQueue((q) => [...q, ...newBadgeIds]);
  }
}

function TreningPageInner() {
  const searchParams = useSearchParams();
  const urlTema  = searchParams.get("tema");
  const urlRezim = searchParams.get("rezim") as "chyby" | "sm2" | null;

  const [cards, setCards]           = useState<SM2Card[]>([]);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correct, setCorrect]       = useState(0);
  const [skipped, setSkipped]       = useState(0);
  const [done, setDone]             = useState(false);
  const [hydrated, setHydrated]     = useState(false);
  const [diagScores, setDiagScores] = useState<Record<string, number>>({});
  const [temaFilter, setTemaFilter] = useState<string | null>(urlTema);
  const [rezimFilter, setRezimFilter] = useState<"chyby" | "sm2" | null>(urlRezim);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [streakMilestone, setStreakMilestone] = useState<{ streak: number; xpBonus: number } | null>(null);
  const [isGuest, setIsGuest]       = useState<boolean | null>(null);
  const [freezeUsedToday, setFreezeUsedToday] = useState(false);

  // Gamification
  const [xp, setXp]                     = useState(0);
  const [gamState, setGamState]         = useState<GamificationState | null>(null);
  const [badgeQueue, setBadgeQueue]     = useState<string[]>([]);
  const [showFirstSession, setShowFirstSession] = useState(false);
  const [levelUpData, setLevelUpData]   = useState<ReturnType<typeof getLevelFromXP> | null>(null);
  const sessionStartRef                 = useRef(new Date());
  const consecutiveCorrectRef           = useRef(0);

  useEffect(() => {
    setTemaFilter(urlTema);
    setRezimFilter(urlRezim);
    const loaded = loadCards();
    setCards(loaded);
    setDiagScores(loadDiagScores());

    const todayStr = new Date().toISOString().slice(0, 10);
    setFreezeUsedToday(localStorage.getItem("matemax-freeze-used") === todayStr);

    const p = loadProgress();
    setXp(p.xp);

    const g = loadGamification();
    setGamState(g);

    // Session-start badge checks
    const startBadges = checkBadgesOnSessionStart(g, sessionStartRef.current);
    if (startBadges.length > 0) {
      const updated: GamificationState = {
        ...g,
        earnedBadges: [...g.earnedBadges, ...startBadges],
        weekendDaysSeen: [
          ...new Set([...g.weekendDaysSeen, sessionStartRef.current.getDay()]),
        ],
        lastSessionDate: new Date().toISOString().slice(0, 10),
      };
      let extraXP = 0;
      for (const id of startBadges) extraXP += getBadgeConfig(id)?.xp_reward ?? 0;
      saveGamification(updated);
      setGamState(updated);
      if (extraXP > 0) {
        const progress = loadProgress();
        const newP = recordActivity(progress, false, extraXP);
        saveProgress(newP);
        setXp(newP.xp);
      }
      enqueueBadges(startBadges, setBadgeQueue);
    }

    // Auth check gates session building (guest vs. logged-in pool)
    const finish = (guest: boolean) => {
      setIsGuest(guest);
      if (!guest || urlTema) {
        setSessionIds(buildSession(loaded, urlTema, urlRezim, guest));
      }
      setHydrated(true);
    };

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => finish(!data.session));
    } else {
      finish(true);
    }
  }, []);

  // Supabase sync when session ends + first session detection
  useEffect(() => {
    if (!done || !gamState) return;
    // Skipped examples get no XP, only answered (wrong) examples get 1 XP
    const answered = sessionIds.length - skipped;
    const xpEarned = correct * 10 + (answered - correct) * 1;

    // Save session to localStorage history
    const practiceTopics = [...new Set(
      sessionIds.map((id) => examples.find((ex) => ex.id === id)?.tema ?? "").filter(Boolean)
    )];
    localSaveSession({
      date: new Date().toISOString().slice(0, 10),
      temas: practiceTopics,
      correct,
      total: answered,
      xp: xpEarned,
    });

    if (!supabase) return;

    // First session check (localStorage flag)
    const isFirstSession = !localStorage.getItem("matemax-first-session-done");
    if (isFirstSession) {
      localStorage.setItem("matemax-first-session-done", "1");
      setShowFirstSession(true);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      const uid = data.session.user.id;
      const p = loadProgress();
      remoteLogSession({ user_id: uid, date: new Date().toISOString().slice(0, 10), xp_earned: xpEarned, correct, total: answered });
      const level = getLevelFromXP(p.xp);
      remoteSyncXP(uid, p.xp, level.key, p.freezeCount ?? 0);
      remoteSyncBadges(uid, gamState.earnedBadges);

      // Onboarding: první session dokončena
      if (isFirstSession && supabase) {
        supabase
          .from("user_onboarding")
          .upsert(
            {
              user_id: uid,
              current_state: "first_session_completed",
              first_session_completed_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          )
          .then(() => {});
      }
    });
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResult = useCallback(
    (wasCorrect: boolean, userAnswer = "") => {
      if (!gamState) return;

      const exId = sessionIds[currentIdx];
      const example = examples.find((ex) => ex.id === exId);
      const existing = cards.find((c) => c.exampleId === exId) ?? createCard(exId);
      const quality: 0 | 1 | 2 | 3 | 4 | 5 = wasCorrect ? 4 : 1;
      const updated = reviewCard(existing, quality);
      const newCards = [...cards.filter((c) => c.exampleId !== exId), updated];
      setCards(newCards);
      saveCards(newCards);

      if (!wasCorrect) {
        setWrongAnswers((prev) => [...prev, { exampleId: exId, userAnswer }]);
      }

      // XP
      const p = loadProgress();
      const xpAction = wasCorrect ? "example_correct_first_try" : "example_incorrect";
      const xpDelta = calculateXP(xpAction, p.streak);
      const newP = recordActivity(p, wasCorrect, xpDelta);
      saveProgress(newP);
      setXp(newP.xp);
      window.dispatchEvent(new Event("matemax-progress-update"));

      // Streak milestone check
      if (newP.streak > p.streak && STREAK_MILESTONES[newP.streak] !== undefined) {
        try {
          const celebrated = JSON.parse(localStorage.getItem("matemax-streak-milestones") ?? "[]") as number[];
          if (!celebrated.includes(newP.streak)) {
            celebrated.push(newP.streak);
            localStorage.setItem("matemax-streak-milestones", JSON.stringify(celebrated));
            const bonusXp = STREAK_MILESTONES[newP.streak];
            const withBonus = recordActivity(newP, false, bonusXp);
            saveProgress(withBonus);
            setXp(withBonus.xp);
            setStreakMilestone({ streak: newP.streak, xpBonus: bonusXp });
          }
        } catch { /* ignore */ }
      }

      // Daily count tracking
      const todayStr = new Date().toISOString().slice(0, 10);
      try {
        const rawD = localStorage.getItem("matemax-today");
        const daily = rawD ? JSON.parse(rawD) as { date: string; count: number } : { date: "", count: 0 };
        const newCount = daily.date === todayStr ? daily.count + 1 : 1;
        localStorage.setItem("matemax-today", JSON.stringify({ date: todayStr, count: newCount }));
      } catch { /* ignore */ }

      // Gamification state update
      const newConsec = wasCorrect ? consecutiveCorrectRef.current + 1 : 0;
      consecutiveCorrectRef.current = newConsec;

      const topic = example?.tema;
      const prevTopicStats = gamState.topicStats ?? {};
      const prevTopic = prevTopicStats[topic ?? ""] ?? { correct: 0, total: 0 };
      const newTopicStats = topic
        ? {
            ...prevTopicStats,
            [topic]: {
              correct: prevTopic.correct + (wasCorrect ? 1 : 0),
              total: prevTopic.total + 1,
            },
          }
        : prevTopicStats;

      const newGam: GamificationState = {
        ...gamState,
        totalSolved: gamState.totalSolved + 1,
        consecutiveCorrect: newConsec,
        topicStats: newTopicStats,
        lastSessionDate: new Date().toISOString().slice(0, 10),
      };

      // Badge checks per answer
      const newBadges: string[] = [
        ...checkBadgesOnExampleSolved(newGam),
        ...checkBadgesOnTopics(newGam),
      ];

      // Level-up check
      const oldLevel = getLevelFromXP(p.xp);
      const newLevel = getLevelFromXP(newP.xp);
      if (oldLevel.key !== newLevel.key) {
        newBadges.push(...checkBadgesOnLevelUp(newGam, newLevel.key));
        setLevelUpData(newLevel);
      }

      const uniqueNew = [...new Set(newBadges.filter((id) => !newGam.earnedBadges.includes(id)))];
      let bonusXP = 0;
      for (const id of uniqueNew) bonusXP += getBadgeConfig(id)?.xp_reward ?? 0;

      const finalGam: GamificationState = {
        ...newGam,
        earnedBadges: [...newGam.earnedBadges, ...uniqueNew],
      };

      if (bonusXP > 0) {
        const afterBonus = recordActivity(newP, false, bonusXP);
        saveProgress(afterBonus);
        setXp(afterBonus.xp);
      }

      saveGamification(finalGam);
      setGamState(finalGam);
      enqueueBadges(uniqueNew, setBadgeQueue);

      if (wasCorrect) setCorrect((n) => n + 1);

      const isLastAnswer = currentIdx + 1 >= sessionIds.length;
      if (isLastAnswer) {
        // Session-end badge checks
        const sessionCorrect = wasCorrect ? correct + 1 : correct;
        const sessionTotal = sessionIds.length;
        const durationMin = Math.round(
          (Date.now() - sessionStartRef.current.getTime()) / 60000
        );

        const newPerfect = sessionCorrect === sessionTotal ? finalGam.perfectSessions + 1 : finalGam.perfectSessions;
        const todayStr = new Date().toISOString().slice(0, 10);
        const newDailyGoals =
          finalGam.lastDailyGoalDate !== todayStr
            ? finalGam.dailyGoalsCompleted + 1
            : finalGam.dailyGoalsCompleted;

        const endGam: GamificationState = {
          ...finalGam,
          perfectSessions: newPerfect,
          dailyGoalsCompleted: newDailyGoals,
          lastDailyGoalDate: todayStr,
        };

        const endBadges = [
          ...checkBadgesOnSession(endGam, { correct: sessionCorrect, total: sessionTotal, sessionDurationMinutes: durationMin }),
          ...checkBadgesOnStreak(endGam, newP.streak),
          ...checkBadgesOnDailyGoal(endGam),
        ].filter((id) => !endGam.earnedBadges.includes(id));

        const uniqueEnd = [...new Set(endBadges)];
        let endBonusXP = 0;
        for (const id of uniqueEnd) endBonusXP += getBadgeConfig(id)?.xp_reward ?? 0;

        const finalEndGam: GamificationState = {
          ...endGam,
          earnedBadges: [...endGam.earnedBadges, ...uniqueEnd],
        };

        if (endBonusXP > 0) {
          const latest = loadProgress();
          saveProgress(recordActivity(latest, false, endBonusXP));
        }

        saveGamification(finalEndGam);
        setGamState(finalEndGam);
        enqueueBadges(uniqueEnd, setBadgeQueue);
        setDone(true);
      } else {
        setCurrentIdx((i) => i + 1);
      }
    },
    [cards, sessionIds, currentIdx, correct, gamState, wrongAnswers]
  );

  function restart(rezim?: "chyby" | "sm2" | null) {
    setRezimFilter(rezim ?? null);
    setSessionIds(buildSession(cards, temaFilter, rezim ?? null, isGuest ?? false));
    setCurrentIdx(0);
    setCorrect(0);
    setSkipped(0);
    setDone(false);
    setWrongAnswers([]);
    consecutiveCorrectRef.current = 0;
    sessionStartRef.current = new Date();
  }

  // Badge toast queue: show one at a time
  const currentToast = badgeQueue[0] ?? null;
  const dismissToast = useCallback(() => {
    setBadgeQueue((q) => q.slice(1));
  }, []);

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4 fade-in-up">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-4">
          <div className="flex justify-between">
            <div className="skeleton rounded-full" style={{ width: 60, height: 20 }} />
            <div className="skeleton rounded-full" style={{ width: 80, height: 20 }} />
          </div>
          <div className="skeleton rounded-full" style={{ width: "100%", height: 12 }} />
          <div className="skeleton rounded-xl" style={{ width: "100%", height: 80 }} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-3">
          <div className="skeleton rounded-full" style={{ width: 120, height: 14 }} />
          <div className="skeleton rounded-xl" style={{ width: "100%", height: 56 }} />
        </div>
      </div>
    );
  }

  // Guest: show topic map if no topic selected yet
  if (isGuest && !temaFilter && !done) {
    return (
      <GuestTopicMap
        onSelectTopic={(tema) => {
          setTemaFilter(tema);
          setSessionIds(buildSession(cards, tema, null, true));
        }}
      />
    );
  }

  // Guest: locked topic via URL param
  if (isGuest && temaFilter && !GUEST_FREE_TOPICS.has(temaFilter)) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-7 flex flex-col items-center gap-4 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ background: "#f1f5f9" }}
          >
            🔒
          </div>
          <div>
            <h2 className="text-xl font-black" style={{ color: "#0D1B3E" }}>Téma zamčeno</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              <strong>{TEMA_LABELS[temaFilter] ?? temaFilter}</strong> je dostupné jen po registraci.
              Registrace je zdarma a trvá 2 minuty.
            </p>
          </div>
          <Link
            href="/registrace"
            className="w-full py-3.5 text-white font-black rounded-xl text-center text-base"
            style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
          >
            Registrovat se zdarma →
          </Link>
          <Link href="/trenink" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            ← Zpět na výběr témat
          </Link>
        </div>
      </div>
    );
  }

  if (sessionIds.length === 0) {
    if (rezimFilter === "sm2") {
      return (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 flex flex-col items-center gap-3">
          <span className="text-5xl">✅</span>
          <p className="text-base font-bold text-slate-700">Všechno zopakováno!</p>
          <p className="text-sm text-slate-400 max-w-xs">
            Na dnes nemáš žádné karty ke zkoušení. SM-2 pošle příklady zpět ve správný moment.
          </p>
          <button
            onClick={() => restart()}
            className="mt-1 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
            style={{ background: "#0D1B3E" }}
          >
            💪 Procvičovat nové příklady →
          </button>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <p className="text-slate-500">
          {temaFilter
            ? `Žádné příklady pro téma "${temaFilter}". Zkus znovu zítra!`
            : "Žádné příklady k procvičení. Zkus znovu zítra!"}
        </p>
      </div>
    );
  }

  if (done) {
    const progress = loadProgress();
    const practiceTopics = [...new Set(
      sessionIds.map((id) => examples.find((ex) => ex.id === id)?.tema ?? "").filter(Boolean)
    )];
    return (
      <>
        {currentToast && <BadgeToast key={currentToast} badgeId={currentToast} onDismiss={dismissToast} />}
        {levelUpData && <LevelUpModal level={levelUpData} onClose={() => setLevelUpData(null)} />}
        {streakMilestone && (
          <StreakMilestoneModal
            streak={streakMilestone.streak}
            xpBonus={streakMilestone.xpBonus}
            onClose={() => setStreakMilestone(null)}
          />
        )}
        {showFirstSession && (
          <FirstSessionModal
            correct={correct}
            total={sessionIds.length}
            onClose={() => setShowFirstSession(false)}
          />
        )}
        <SessionSummary
          correct={correct}
          total={sessionIds.length - skipped}
          skipped={skipped}
          xpEarned={correct * 10 + (sessionIds.length - skipped - correct) * 1}
          streak={progress.streak}
          topics={practiceTopics}
          rezim={rezimFilter ?? undefined}
          wrongAnswers={wrongAnswers}
          onRestart={() => restart()}
          onRestartChyby={
            cards.some((c) => c.repetitions > 0 && c.lastQuality <= 2)
              ? () => restart("chyby")
              : undefined
          }
        />
      </>
    );
  }

  const currentExample = examples.find((ex) => ex.id === sessionIds[currentIdx]);
  if (!currentExample) return null;
  const isWeakTopic = (diagScores[currentExample.tema] ?? 1) < 0.67;

  function handleSkip() {
    setSkipped((n) => n + 1);
    const isLast = currentIdx + 1 >= sessionIds.length;
    if (isLast) setDone(true);
    else setCurrentIdx((i) => i + 1);
  }

  if (isTopicLocked(currentExample.tema)) {
    return (
      <>
        {currentToast && <BadgeToast key={currentToast} badgeId={currentToast} onDismiss={dismissToast} />}
        {levelUpData && <LevelUpModal level={levelUpData} onClose={() => setLevelUpData(null)} />}
        <XPProgressBar xp={xp} className="mb-3" />
        <UpgradeCard
          tema={currentExample.tema}
          cardNumber={currentIdx + 1}
          total={sessionIds.length}
          onSkip={handleSkip}
        />
      </>
    );
  }

  return (
    <>
      {currentToast && <BadgeToast key={currentToast} badgeId={currentToast} onDismiss={dismissToast} />}
      {levelUpData && <LevelUpModal level={levelUpData} onClose={() => setLevelUpData(null)} />}
      {streakMilestone && (
        <StreakMilestoneModal
          streak={streakMilestone.streak}
          xpBonus={streakMilestone.xpBonus}
          onClose={() => setStreakMilestone(null)}
        />
      )}

      <XPProgressBar xp={xp} className="mb-3" />

      {freezeUsedToday && (
        <div
          className="mb-3 flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg w-fit"
          style={{ background: "#eff8ff", color: "#0369a1", border: "1px solid #bae6fd" }}
        >
          🧊 Streak zmrazen — použit freeze štít
        </div>
      )}

      {rezimFilter === "chyby" && (
        <div
          className="mb-3 flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg w-fit"
          style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
        >
          🔄 Režim opakování chyb
        </div>
      )}

      {rezimFilter === "sm2" && (
        <div
          className="mb-3 flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg w-fit"
          style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}
        >
          📅 SM-2 opakování — karty splatné dnes
        </div>
      )}

      {temaFilter && (
        <div
          className="mb-3 flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg w-fit"
          style={{ background: "#eff6ff", color: "#2E6DA4", border: "1px solid #bfdbfe" }}
        >
          🎯 Cílený trénink: <strong className="ml-1">{TEMA_LABELS[temaFilter] ?? temaFilter}</strong>
        </div>
      )}

      {isWeakTopic && !temaFilter && (
        <div
          className="mb-3 flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg w-fit"
          style={{ background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}
        >
          🎯 Procvičuješ slabé téma z diagnostiky
        </div>
      )}

      <PracticeCard
        example={currentExample}
        cardNumber={currentIdx + 1}
        total={sessionIds.length}
        consecutiveCorrect={consecutiveCorrectRef.current}
        onResult={handleResult}
      />
    </>
  );
}

export default function TreningPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-4 fade-in-up">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-4">
          <div className="flex justify-between">
            <div className="skeleton rounded-full" style={{ width: 60, height: 20 }} />
            <div className="skeleton rounded-full" style={{ width: 80, height: 20 }} />
          </div>
          <div className="skeleton rounded-full" style={{ width: "100%", height: 12 }} />
          <div className="skeleton rounded-xl" style={{ width: "100%", height: 80 }} />
        </div>
      </div>
    }>
      <TreningPageInner />
    </Suspense>
  );
}
