"use client";

import { useState, useEffect, useCallback } from "react";
import { examples } from "@/data/examples";
import { SM2Card } from "@/types";
import { createCard, reviewCard, isDue } from "@/lib/sm2";
import { loadProgress, saveProgress, recordActivity } from "@/lib/progress";
import { remoteLogSession } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import PracticeCard from "@/components/PracticeCard";
import SessionSummary from "@/components/SessionSummary";

const CARDS_KEY = "matemax-cards";
const DIAG_KEY = "matemax-diag-results";
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

// Vrátí skóre 0–1 pro každé téma podle diagnostiky (nižší = slabší = vyšší priorita v sessioni)
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

  // Prioritizace: slabé téma (nízké diag skóre) → dřív, lehčí obtížnost → dřív
  const scored = due.map((ex) => {
    const diagScore = diagScores[ex.tema] ?? 1; // neznámé téma = neutral (1)
    // topicPriority: slabší téma dostane nižší číslo (vyšší prioritu)
    const topicPriority = diagScore;
    // Kleine Zufallskomponente verhindert, dass die gleichen Beispiele immer zuerst kommen
    const jitter = Math.random() * 0.1;
    return { ex, sort: topicPriority + ex.obtiznost * 0.01 + jitter };
  });

  scored.sort((a, b) => a.sort - b.sort);
  return scored.slice(0, SESSION_SIZE).map((s) => s.ex.id);
}

export default function TreningPage() {
  const [cards, setCards] = useState<SM2Card[]>([]);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [diagScores, setDiagScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const loaded = loadCards();
    setCards(loaded);
    const ids = buildSession(loaded);
    setSessionIds(ids);
    setDiagScores(loadDiagScores());
    setHydrated(true);
  }, []);

  // Log completed session to Supabase when user is signed in
  useEffect(() => {
    if (!done || !supabase) return;
    const xpEarned = correct * 10 + (sessionIds.length - correct) * 5;
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      remoteLogSession({
        user_id: data.session.user.id,
        date: new Date().toISOString().slice(0, 10),
        xp_earned: xpEarned,
        correct,
        total: sessionIds.length,
      });
    });
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResult = useCallback(
    (wasCorrect: boolean) => {
      const exId = sessionIds[currentIdx];
      const existing = cards.find((c) => c.exampleId === exId) ?? createCard(exId);
      const quality: 0 | 1 | 2 | 3 | 4 | 5 = wasCorrect ? 4 : 1;
      const updated = reviewCard(existing, quality);

      const newCards = [...cards.filter((c) => c.exampleId !== exId), updated];
      setCards(newCards);
      saveCards(newCards);

      // Progress
      const p = loadProgress();
      const newP = recordActivity(p, wasCorrect);
      saveProgress(newP);
      window.dispatchEvent(new Event("matemax-progress-update"));

      const newConsec = wasCorrect ? consecutiveCorrect + 1 : 0;
      setConsecutiveCorrect(newConsec);

      if (wasCorrect) setCorrect((n) => n + 1);

      if (currentIdx + 1 >= sessionIds.length) {
        setDone(true);
      } else {
        setCurrentIdx((i) => i + 1);
      }
    },
    [cards, sessionIds, currentIdx, consecutiveCorrect]
  );

  function restart() {
    const ids = buildSession(cards);
    setSessionIds(ids);
    setCurrentIdx(0);
    setCorrect(0);
    setDone(false);
    setConsecutiveCorrect(0);
  }

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
    const xpEarned = correct * 10 + (sessionIds.length - correct) * 5;
    const progress = loadProgress();
    const practiceTopics = [...new Set(
      sessionIds.map((id) => examples.find((ex) => ex.id === id)?.tema ?? "").filter(Boolean)
    )];
    return (
      <SessionSummary
        correct={correct}
        total={sessionIds.length}
        xpEarned={xpEarned}
        streak={progress.streak}
        topics={practiceTopics}
        onRestart={restart}
      />
    );
  }

  const currentExample = examples.find((ex) => ex.id === sessionIds[currentIdx]);
  if (!currentExample) return null;

  const isWeakTopic = (diagScores[currentExample.tema] ?? 1) < 0.67;

  return (
    <>
      {isWeakTopic && (
        <div className="mb-3 flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg w-fit"
          style={{ background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}>
          🎯 Procvičuješ slabé téma z diagnostiky
        </div>
      )}
      <PracticeCard
        example={currentExample}
        cardNumber={currentIdx + 1}
        total={sessionIds.length}
        consecutiveCorrect={consecutiveCorrect}
        onResult={handleResult}
      />
    </>
  );
}
