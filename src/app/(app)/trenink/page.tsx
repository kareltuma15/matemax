"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { examples } from "@/data/examples";
import { SM2Card } from "@/types";
import { createCard, reviewCard, isDue } from "@/lib/sm2";
import { loadProgress, saveProgress, recordActivity } from "@/lib/progress";
import { remoteLogSession, remoteSyncXP, remoteSyncBadges } from "@/lib/storage";
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
import PracticeCard from "@/components/PracticeCard";
import SessionSummary from "@/components/SessionSummary";
import XPProgressBar from "@/components/XPProgressBar";
import BadgeToast from "@/components/BadgeToast";

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

function buildSession(cards: SM2Card[]): string[] {
  const cardMap = new Map(cards.map((c) => [c.exampleId, c]));
  const diagScores = loadDiagScores();

  const due = examples.filter((ex) => {
    const card = cardMap.get(ex.id);
    return !card || isDue(card);
  });

  if (due.length === 0) {
    return [...cards]
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

export default function TreningPage() {
  const [cards, setCards]           = useState<SM2Card[]>([]);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correct, setCorrect]       = useState(0);
  const [done, setDone]             = useState(false);
  const [hydrated, setHydrated]     = useState(false);
  const [diagScores, setDiagScores] = useState<Record<string, number>>({});

  // Gamification
  const [xp, setXp]                   = useState(0);
  const [gamState, setGamState]       = useState<GamificationState | null>(null);
  const [badgeQueue, setBadgeQueue]   = useState<string[]>([]);
  const sessionStartRef               = useRef(new Date());
  const consecutiveCorrectRef         = useRef(0);

  useEffect(() => {
    const loaded = loadCards();
    setCards(loaded);
    setSessionIds(buildSession(loaded));
    setDiagScores(loadDiagScores());

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

    setHydrated(true);
  }, []);

  // Supabase sync when session ends
  useEffect(() => {
    if (!done || !supabase || !gamState) return;
    const xpEarned = correct * 10 + (sessionIds.length - correct) * 1;
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      const uid = data.session.user.id;
      const p = loadProgress();
      remoteLogSession({ user_id: uid, date: new Date().toISOString().slice(0, 10), xp_earned: xpEarned, correct, total: sessionIds.length });
      const level = getLevelFromXP(p.xp);
      remoteSyncXP(uid, p.xp, level.key);
      remoteSyncBadges(uid, gamState.earnedBadges);
    });
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResult = useCallback(
    (wasCorrect: boolean) => {
      if (!gamState) return;

      const exId = sessionIds[currentIdx];
      const example = examples.find((ex) => ex.id === exId);
      const existing = cards.find((c) => c.exampleId === exId) ?? createCard(exId);
      const quality: 0 | 1 | 2 | 3 | 4 | 5 = wasCorrect ? 4 : 1;
      const updated = reviewCard(existing, quality);
      const newCards = [...cards.filter((c) => c.exampleId !== exId), updated];
      setCards(newCards);
      saveCards(newCards);

      // XP
      const p = loadProgress();
      const xpAction = wasCorrect ? "example_correct_first_try" : "example_incorrect";
      const xpDelta = calculateXP(xpAction, p.streak);
      const newP = recordActivity(p, wasCorrect, xpDelta);
      saveProgress(newP);
      setXp(newP.xp);
      window.dispatchEvent(new Event("matemax-progress-update"));

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
    [cards, sessionIds, currentIdx, correct, gamState]
  );

  function restart() {
    setSessionIds(buildSession(cards));
    setCurrentIdx(0);
    setCorrect(0);
    setDone(false);
    consecutiveCorrectRef.current = 0;
    sessionStartRef.current = new Date();
  }

  // Badge toast queue: show one at a time
  const currentToast = badgeQueue[0] ?? null;
  const dismissToast = useCallback(() => {
    setBadgeQueue((q) => q.slice(1));
  }, []);

  if (!hydrated) {
    return <div className="flex items-center justify-center h-48 text-slate-400">Načítám…</div>;
  }

  if (sessionIds.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <p className="text-slate-500">Žádné příklady k procvičení. Zkus znovu zítra!</p>
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
        <SessionSummary
          correct={correct}
          total={sessionIds.length}
          xpEarned={correct * 10 + (sessionIds.length - correct) * 1}
          streak={progress.streak}
          topics={practiceTopics}
          onRestart={restart}
        />
      </>
    );
  }

  const currentExample = examples.find((ex) => ex.id === sessionIds[currentIdx]);
  if (!currentExample) return null;
  const isWeakTopic = (diagScores[currentExample.tema] ?? 1) < 0.67;

  return (
    <>
      {currentToast && <BadgeToast key={currentToast} badgeId={currentToast} onDismiss={dismissToast} />}

      <XPProgressBar xp={xp} className="mb-3" />

      {isWeakTopic && (
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
