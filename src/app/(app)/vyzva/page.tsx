"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { examples } from "@/data/examples";
import { checkAnswer } from "@/lib/normalize";
import MathText from "@/components/MathText";
import challengesJson from "@/data/daily-challenges.json";
import type { DBExample } from "@/types";
import { TEMA_LABELS } from "@/types";
import { remoteLogSession, remoteSyncXP, localLoadProgress, localSaveProgress } from "@/lib/storage";
import { getLevelFromXP } from "@/lib/gamification";
import { supabase } from "@/lib/supabase";
import WeeklyLeaderboard from "@/components/WeeklyLeaderboard";
import ShareButton from "@/components/ShareButton";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type DailyChallenge = {
  id: number;
  day: number;
  title: string;
  description: string;
  topic: string;
  type: "speed" | "accuracy";
  count: number;
  time_limit_seconds: number | null;
  xp_reward: number;
  badge_reward: string | null;
  difficulty: "easy" | "medium" | "hard";
};

type Phase = "intro" | "running" | "success" | "failure";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DONE_KEY_PREFIX = "matemax-challenge-done-";

const SUCCESS_QUOTES = [
  "Každý příklad navíc je krok blíž přijímačkám. Jen tak dál!",
  "Dnes jsi dokázal, že výzvy tě nezastaví. 🔥",
  "Trénink se vyplácí — a ty to právě dokázal.",
  "Skvělý výkon! Matematika tě teď zná jménem.",
  "Výzva splněna! Tohle si pamatuj i ve zkušební místnosti.",
];

const FAILURE_QUOTES = [
  "Nevzdávej to — každá chyba tě učí něco nového.",
  "Jsi blíž, než si myslíš. Zkus to ještě jednou!",
  "Matematika se nevzdává. Ty taky ne. 💪",
  "I šampioni se učí z chyb. Zkus to znovu.",
  "Tohle byl jen nácvik. Příště to vyjde!",
];

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Lehká",
  medium: "Střední",
  hard: "Těžká",
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "#16a34a",
  medium: "#d97706",
  hard: "#dc2626",
};

const DIFFICULTY_BG: Record<string, string> = {
  easy: "#f0fdf4",
  medium: "#fffbeb",
  hard: "#fef2f2",
};

const TIPS: Record<string, string> = {
  speed: "Piš odpověď rovnou — nemusíš psát jednotku ani 'x='.",
  accuracy: "Soustřeď se. Každá chyba se počítá. Ber si čas.",
  default: "Piš číslo nebo zlomek ve tvaru 3/4.",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

function getTodayChallenge(): DailyChallenge {
  const idx = (getDayOfYear() - 1) % challengesJson.length;
  return challengesJson[idx] as DailyChallenge;
}

function getTodayKey(): string {
  return DONE_KEY_PREFIX + new Date().toISOString().slice(0, 10);
}

function pickExamples(challenge: DailyChallenge): DBExample[] {
  const pool =
    challenge.topic === "mix"
      ? examples
      : examples.filter((e) => e.tema === challenge.topic);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(challenge.count, pool.length));
}

function difficultyStars(d: string): string {
  return d === "easy" ? "⭐" : d === "medium" ? "⭐⭐" : "⭐⭐⭐";
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function VyzvaPage() {
  const challenge = getTodayChallenge();
  const todayKey = getTodayKey();

  const [phase, setPhase] = useState<Phase>("intro");
  const [examplesList, setExamplesList] = useState<DBExample[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [timeTaken, setTimeTaken] = useState(0);
  const [successQuote] = useState(() => SUCCESS_QUOTES[Math.floor(Math.random() * SUCCESS_QUOTES.length)]);
  const [failureQuote] = useState(() => FAILURE_QUOTES[Math.floor(Math.random() * FAILURE_QUOTES.length)]);
  const [lbRefresh, setLbRefresh] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  const correctRef = useRef(0);
  const examplesRef = useRef<DBExample[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<"correct" | "wrong" | null>(null);

  useEffect(() => {
    if (localStorage.getItem(todayKey) === "1") setAlreadyDone(true);
  }, [todayKey]);

  // Focus input when a new question appears
  useEffect(() => {
    if (phase === "running" && !feedback) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [phase, currentIdx, feedback]);

  // ─── END CHALLENGE ────────────────────────────────────────────────────────

  const endChallenge = useCallback(
    (correct: number, timedOut = false) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      setTimeTaken(elapsed);
      setCorrectCount(correct);

      const total = examplesRef.current.length;
      let success = false;
      if (challenge.type === "accuracy") {
        success = correct === total;
      } else {
        success = !timedOut && correct >= Math.ceil(total * 0.7);
      }

      if (success) {
        localStorage.setItem(todayKey, "1");
        // Award XP
        try {
          const progress = localLoadProgress();
          const newXP = progress.xp + challenge.xp_reward;
          const levelKey = getLevelFromXP(newXP).key;
          localSaveProgress({ ...progress, xp: newXP });
          if (supabase) {
            supabase.auth.getSession().then(({ data }) => {
              if (data.session) {
                const uid = data.session.user.id;
                const today = new Date().toISOString().slice(0, 10);
                remoteLogSession({ user_id: uid, date: today, xp_earned: challenge.xp_reward, correct, total });
                remoteSyncXP(uid, newXP, levelKey);
              }
            });
          }
        } catch { /* ignore */ }
        // Submit score to weekly leaderboard
        fetch("/api/weekly-challenge/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: correct, total, time_seconds: elapsed, xp_earned: challenge.xp_reward }),
        }).then(() => setLbRefresh((n) => n + 1)).catch(() => {});

        // Big confetti burst
        import("canvas-confetti").then(({ default: c }) => {
          setTimeout(() => c({ particleCount: 120, spread: 80, origin: { y: 0.55 } }), 100);
          setTimeout(() => c({ particleCount: 60, spread: 60, angle: 60, origin: { y: 0.55 } }), 400);
          setTimeout(() => c({ particleCount: 60, spread: 60, angle: 120, origin: { y: 0.55 } }), 650);
        });
        setPhase("success");
      } else {
        setPhase("failure");
      }
    },
    [challenge, todayKey]
  );

  // ─── TIMER ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "running" || timeLeft === null) return;
    if (timeLeft <= 0) {
      endChallenge(correctRef.current, true);
      return;
    }
    timerRef.current = setTimeout(
      () => setTimeLeft((t) => (t !== null ? t - 1 : null)),
      1000
    );
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, timeLeft, endChallenge]);

  // ─── START ────────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    const exList = pickExamples(challenge);
    setExamplesList(exList);
    examplesRef.current = exList;
    setCurrentIdx(0);
    setAnswer("");
    setFeedback(null);
    feedbackRef.current = null;
    setCorrectCount(0);
    correctRef.current = 0;
    setShake(false);
    setExitConfirm(false);
    setTimeLeft(challenge.time_limit_seconds ?? null);
    startTimeRef.current = Date.now();
    setPhase("running");
  }, [challenge]);

  // ─── SUBMIT ───────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    if (feedbackRef.current || !answer.trim()) return;
    const ex = examplesRef.current[currentIdx];
    if (!ex) return;

    const ok = checkAnswer(answer, ex.odpoved);
    if (ok) {
      correctRef.current += 1;
      setFeedback("correct");
      feedbackRef.current = "correct";
      import("canvas-confetti").then(({ default: c }) => c({ particleCount: 25, spread: 45, origin: { y: 0.75 }, startVelocity: 18, gravity: 1.2 }));
    } else {
      setFeedback("wrong");
      feedbackRef.current = "wrong";
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }

    setTimeout(() => {
      setFeedback(null);
      feedbackRef.current = null;
      setAnswer("");
      const next = currentIdx + 1;
      if (next >= examplesRef.current.length) {
        endChallenge(correctRef.current);
      } else {
        setCurrentIdx(next);
      }
    }, 1500);
  }, [answer, currentIdx, endChallenge]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleExit = () => {
    if (exitConfirm) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase("failure");
      setCorrectCount(correctRef.current);
    } else {
      setExitConfirm(true);
    }
  };

  const ex = examplesRef.current[currentIdx];
  const isRed = timeLeft !== null && timeLeft < 30;
  const timePct =
    challenge.time_limit_seconds && timeLeft !== null
      ? (timeLeft / challenge.time_limit_seconds) * 100
      : 0;

  // ─── INTRO ────────────────────────────────────────────────────────────────

  if (phase === "intro") {
    return (
      <div className="min-h-screen pb-24" style={{ background: "#F8FAFF" }}>
        {/* Header */}
        <div
          className="px-5 pt-10 pb-8 text-center"
          style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}
        >
          <span className="text-4xl">🏆</span>
          <h1 className="mt-3 text-2xl font-extrabold text-white">Denní výzva</h1>
          <p className="text-blue-200 text-sm mt-1">
            {new Date().toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        <div className="max-w-md mx-auto px-5 mt-5 flex flex-col gap-4">
          {/* Challenge card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div
              className="px-5 py-4"
              style={{ background: DIFFICULTY_BG[challenge.difficulty] ?? "#F8FAFF" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: DIFFICULTY_COLOR[challenge.difficulty] }}>
                    {DIFFICULTY_LABEL[challenge.difficulty]} {difficultyStars(challenge.difficulty)}
                  </p>
                  <h2 className="text-xl font-extrabold" style={{ color: "#0D1B3E" }}>
                    {challenge.title}
                  </h2>
                </div>
                <span className="text-3xl mt-1">
                  {challenge.topic === "mix" ? "🎲" : "📐"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{challenge.description}</p>
            </div>

            {/* Pills row */}
            <div className="px-5 py-3 flex flex-wrap gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600">
                📝 {challenge.count} příkladů
              </span>
              {challenge.time_limit_seconds ? (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700">
                  ⏱ {Math.round(challenge.time_limit_seconds / 60)} min
                </span>
              ) : (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-50 text-green-700">
                  ♾ Bez časovače
                </span>
              )}
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600">
                🗂 {TEMA_LABELS[challenge.topic] ?? challenge.topic}
              </span>
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: challenge.type === "speed" ? "#eff6ff" : "#f0fdf4", color: challenge.type === "speed" ? "#1d4ed8" : "#166534" }}
              >
                {challenge.type === "speed" ? "⚡ Rychlost" : "🎯 Přesnost"}
              </span>
            </div>

            {/* XP + badge */}
            <div className="px-5 pb-4 flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl" style={{ background: "#fef9c3" }}>
                <span className="text-lg">⭐</span>
                <span className="font-extrabold text-amber-700 text-base">+{challenge.xp_reward} XP</span>
              </div>
              {challenge.badge_reward && (
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl" style={{ background: "#faf0ff" }}>
                  <span className="text-lg">🏅</span>
                  <span className="font-bold text-purple-700 text-sm">Odznak!</span>
                </div>
              )}
            </div>
          </div>

          {/* Tip box */}
          <div
            className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
          >
            <span className="text-lg mt-0.5">💡</span>
            <p className="text-sm text-blue-800 leading-relaxed">
              {TIPS[challenge.type] ?? TIPS.default}
              {challenge.type === "accuracy" && (
                <> Podmínka úspěchu: <strong>100 % správně.</strong></>
              )}
              {challenge.type === "speed" && (
                <> Podmínka úspěchu: <strong>≥ 70 % správně</strong> ve stanoveném čase.</>
              )}
            </p>
          </div>

          {/* Already done banner */}
          {alreadyDone && (
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
            >
              <span className="text-xl">✅</span>
              <p className="text-sm font-semibold text-green-700">
                Dnešní výzvu jsi už splnil! Můžeš ji zkusit znovu pro zábavu.
              </p>
            </div>
          )}

          {/* CTA */}
          <button
            type="button"
            onClick={handleStart}
            className="w-full py-4 rounded-2xl text-white font-extrabold text-lg shadow-lg transition-transform active:scale-95"
            style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}
          >
            Spustit výzvu →
          </button>

          <Link
            href="/"
            className="block text-center text-sm text-slate-400 hover:text-slate-600 py-1"
          >
            Přeskočit na zítřek
          </Link>

          {/* Weekly leaderboard */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <WeeklyLeaderboard refreshTrigger={lbRefresh} />
          </div>
        </div>
      </div>
    );
  }

  // ─── RUNNING ──────────────────────────────────────────────────────────────

  if (phase === "running") {
    return (
      <div className="min-h-screen pb-24 flex flex-col" style={{ background: "#F8FAFF" }}>
        {/* Sticky header */}
        <div
          className="sticky top-0 z-30 px-5 py-3"
          style={{ background: "#0D1B3E" }}
        >
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold text-sm">
                Příklad {currentIdx + 1} / {examplesList.length}
              </span>
              {timeLeft !== null && (
                <span
                  className="font-extrabold text-lg tabular-nums transition-colors"
                  style={{ color: isRed ? "#f87171" : "#93c5fd" }}
                >
                  ⏱ {formatTime(timeLeft)}
                </span>
              )}
              <button
                type="button"
                onClick={handleExit}
                className="text-sm font-semibold transition-colors"
                style={{ color: exitConfirm ? "#f87171" : "#94a3b8" }}
              >
                {exitConfirm ? "Opravdu ukončit?" : "✕ Ukončit"}
              </button>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentIdx) / examplesList.length) * 100}%`,
                  background: "#00B4D8",
                }}
              />
            </div>
            {timeLeft !== null && (
              <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden mt-1">
                <div
                  className="h-1 rounded-full transition-all duration-1000"
                  style={{
                    width: `${timePct}%`,
                    background: isRed ? "#ef4444" : "#4ade80",
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Question card */}
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-5 pt-8 gap-5">
          <div
            className="rounded-2xl bg-white border border-slate-100 shadow-sm px-6 py-7"
            style={shake ? { animation: "shake 0.55s ease" } : {}}
          >
            <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#2E6DA4" }}>
              {TEMA_LABELS[ex?.tema ?? ""] ?? ex?.tema}
            </p>
            <div className="text-xl font-bold leading-snug" style={{ color: "#0D1B3E" }}>
              <MathText text={ex?.zadani ?? ""} large />
            </div>

            {/* Feedback overlay */}
            {feedback && (
              <div
                className="mt-4 rounded-xl px-4 py-3 text-center font-extrabold text-base transition-all"
                style={{
                  background: feedback === "correct" ? "#f0fdf4" : "#fef2f2",
                  color: feedback === "correct" ? "#15803d" : "#dc2626",
                  border: `2px solid ${feedback === "correct" ? "#bbf7d0" : "#fecaca"}`,
                }}
              >
                {feedback === "correct" ? "✓ Správně! 🎉" : `✗ Špatně. Správně: ${ex?.odpoved}`}
              </div>
            )}
          </div>

          {/* Answer input */}
          {!feedback && (
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tvá odpověď…"
                className="flex-1 rounded-xl border-2 px-4 py-3.5 text-lg font-bold outline-none transition-colors"
                style={{ borderColor: "#2E6DA4", color: "#0D1B3E" }}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!answer.trim()}
                className="px-5 py-3.5 rounded-xl text-white font-extrabold text-base transition-all active:scale-95 disabled:opacity-40"
                style={{ background: "#2E6DA4" }}
              >
                →
              </button>
            </div>
          )}

          {feedback && (
            <div className="h-14 flex items-center justify-center">
              <span className="text-sm text-slate-400">Načítám další příklad…</span>
            </div>
          )}
        </div>

        <style>{`
          @keyframes shake {
            0%,100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-5px); }
            80% { transform: translateX(5px); }
          }
        `}</style>
      </div>
    );
  }

  // ─── SUCCESS ──────────────────────────────────────────────────────────────

  if (phase === "success") {
    return (
      <div className="min-h-screen pb-24 flex flex-col items-center justify-start" style={{ background: "#F8FAFF" }}>
        <div className="max-w-md mx-auto w-full px-5 pt-14 flex flex-col items-center gap-5">
          <div className="text-7xl animate-bounce">🏆</div>
          <h1 className="text-3xl font-extrabold text-center" style={{ color: "#0D1B3E" }}>
            Výzva splněna!
          </h1>
          <p className="text-slate-500 text-center text-base leading-relaxed">{successQuote}</p>

          {/* Stats */}
          <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-extrabold" style={{ color: "#0D1B3E" }}>
                  {correctCount}/{examplesList.length}
                </p>
                <p className="text-xs text-slate-400 mt-1">správně</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-amber-500">+{challenge.xp_reward}</p>
                <p className="text-xs text-slate-400 mt-1">XP</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold" style={{ color: "#2E6DA4" }}>
                  {formatTime(timeTaken)}
                </p>
                <p className="text-xs text-slate-400 mt-1">čas</p>
              </div>
            </div>
            {challenge.badge_reward && (
              <div
                className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: "#faf0ff", border: "1px solid #e9d5ff" }}
              >
                <span className="text-2xl">🏅</span>
                <div>
                  <p className="text-sm font-bold text-purple-700">Odznak odemčen!</p>
                  <p className="text-xs text-purple-500">{challenge.badge_reward.replace(/_/g, " ")}</p>
                </div>
              </div>
            )}
          </div>

          {/* Share */}
          <ShareButton
            score={`${correctCount}/${examplesList.length}`}
            xp={challenge.xp_reward}
            mode="session"
            label="Sdílet výsledek"
          />

          <Link
            href="/"
            className="w-full py-4 rounded-2xl text-white font-extrabold text-lg text-center shadow-lg transition-transform active:scale-95"
            style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}
          >
            Zpět na dashboard →
          </Link>
          <Link href="/trenink" className="text-sm text-slate-400 hover:text-slate-600">
            Pokračovat v tréninku →
          </Link>

          {/* Weekly leaderboard after success */}
          <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <WeeklyLeaderboard refreshTrigger={lbRefresh} />
          </div>
        </div>
      </div>
    );
  }

  // ─── FAILURE ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-24 flex flex-col items-center justify-start" style={{ background: "#F8FAFF" }}>
      <div className="max-w-md mx-auto w-full px-5 pt-14 flex flex-col items-center gap-5">
        <div className="text-7xl">💪</div>
        <h1 className="text-3xl font-extrabold text-center" style={{ color: "#0D1B3E" }}>
          Tentokrát ne...
        </h1>
        <p className="text-slate-500 text-center text-base leading-relaxed">{failureQuote}</p>

        {/* Stats */}
        <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-extrabold" style={{ color: "#0D1B3E" }}>
                {correctCount}/{examplesList.length}
              </p>
              <p className="text-xs text-slate-400 mt-1">správně</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-red-400">
                {examplesList.length - correctCount}
              </p>
              <p className="text-xs text-slate-400 mt-1">chyb</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold" style={{ color: "#2E6DA4" }}>
                {formatTime(timeTaken)}
              </p>
              <p className="text-xs text-slate-400 mt-1">čas</p>
            </div>
          </div>
          {challenge.type === "speed" && (
            <p className="text-xs text-slate-400 mt-3 text-center">
              Potřebuješ ≥ {Math.ceil(examplesList.length * 0.7)} správně z {examplesList.length} ve stanoveném čase.
            </p>
          )}
          {challenge.type === "accuracy" && (
            <p className="text-xs text-slate-400 mt-3 text-center">
              Potřebuješ 100 % správně. Měl jsi {correctCount} z {examplesList.length}.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="w-full py-4 rounded-2xl text-white font-extrabold text-lg shadow-lg transition-transform active:scale-95"
          style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}
        >
          Zkusit znovu →
        </button>

        <Link
          href={`/trenink?tema=${challenge.topic === "mix" ? "" : challenge.topic}`}
          className="w-full py-3.5 rounded-2xl text-center font-bold text-sm border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          📚 Procvičit téma →
        </Link>

        <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">
          Zpět na dashboard
        </Link>
      </div>
    </div>
  );
}
