"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { examples } from "@/data/examples";
import { checkAnswer } from "@/lib/normalize";
import { TEMA_LABELS, DBExample } from "@/types";
import MathText from "@/components/MathText";
import MathDisplay from "@/components/MathDisplay";

function ExMath({ ex, text, large }: { ex: DBExample; text: string; large?: boolean }) {
  if (ex.latex) return <MathDisplay tex={text} displayMode={large} />;
  return <MathText text={text} large={large} />;
}
import { playCorrect, playWrong } from "@/lib/sound";

const TOTAL_TIME = 60;
const QUESTION_COUNT = 10;
const BEST_KEY = "matemax-rychly-best";
const RECENT_KEY = "matemax-rychly-recent";

function getPersonalBest(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(BEST_KEY) ?? "0", 10);
}

function savePersonalBest(score: number) {
  const prev = getPersonalBest();
  if (score > prev) localStorage.setItem(BEST_KEY, String(score));
}

function pickQuestions(): DBExample[] {
  const shuffled = [...examples].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, QUESTION_COUNT);
}

type Phase = "start" | "playing" | "done";

export default function RychlyMod() {
  const [phase, setPhase]       = useState<Phase>("start");
  const [questions, setQuestions] = useState<DBExample[]>([]);
  const [idx, setIdx]           = useState(0);
  const [correct, setCorrect]   = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [input, setInput]       = useState("");
  const [flash, setFlash]       = useState<"" | "green" | "red">("");
  const [personalBest, setPersonalBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setPersonalBest(getPersonalBest());
  }, []);

  const endGame = useCallback((finalCorrect: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    savePersonalBest(finalCorrect);
    const prev = getPersonalBest();
    setIsNewBest(finalCorrect >= prev && finalCorrect > 0);
    setPhase("done");
  }, []);

  function startGame() {
    const qs = pickQuestions();
    setQuestions(qs);
    setIdx(0);
    setCorrect(0);
    setTimeLeft(TOTAL_TIME);
    setInput("");
    setFlash("");
    setIsNewBest(false);
    setPhase("playing");

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("done");
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || phase !== "playing") return;

    const q = questions[idx];
    const ok = checkAnswer(input, q.odpoved);

    const isLast = idx + 1 >= QUESTION_COUNT;

    if (ok) {
      playCorrect();
      setFlash("green");
      setCorrect((c) => {
        const next = c + 1;
        if (isLast) setTimeout(() => endGame(next), 300);
        return next;
      });
    } else {
      playWrong();
      setFlash("red");
      if (isLast) setTimeout(() => endGame(correct), 300);
    }

    setTimeout(() => setFlash(""), 280);

    if (!isLast) {
      setIdx((i) => i + 1);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }

  // keyboard: Enter submits, also shortcut while done
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === "done" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        startGame();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const timerPct = (timeLeft / TOTAL_TIME) * 100;
  const timerColor = timeLeft > 20 ? "#2E6DA4" : timeLeft > 10 ? "#f59e0b" : "#ef4444";

  if (phase === "start") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: "#f8fafc" }}>
        <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-lg" style={{ background: "#0D1B3E" }}>
            ⚡
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: "#0D1B3E" }}>Rychlý mód</h1>
            <p className="text-slate-500 mt-1 text-sm">10 příkladů · 60 sekund · žádné nápovědy</p>
          </div>

          <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">Osobní rekord</span>
              <span className="text-xl font-black" style={{ color: personalBest > 0 ? "#f59e0b" : "#94a3b8" }}>
                {personalBest > 0 ? `${personalBest}/10` : "–"}
              </span>
            </div>
            <div className="text-xs text-slate-400 text-left leading-relaxed">
              Odpověz na co nejvíce příkladů za 60 sekund. Čas neustoje — příklady se mění ihned po odpovědi.
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full py-4 text-white font-black text-lg rounded-2xl shadow-lg press-scale glow-pulse"
            style={{ background: "#0D1B3E" }}
          >
            Spustit ⚡
          </button>

          <Link href="/trenink" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            ← Zpět na trénink
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const pct = Math.round((correct / QUESTION_COUNT) * 100);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: "#f8fafc" }}>
        <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
          <div className="text-5xl">{correct >= 9 ? "🏆" : correct >= 7 ? "🔥" : correct >= 5 ? "👍" : "💪"}</div>

          <div>
            <h1 className="text-3xl font-black" style={{ color: "#0D1B3E" }}>
              {correct}/{QUESTION_COUNT}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{pct}% správně</p>
            {isNewBest && (
              <p className="mt-2 text-amber-600 font-bold text-sm px-3 py-1 rounded-full inline-block" style={{ background: "#fffbeb" }}>
                🏅 Nový rekord!
              </p>
            )}
          </div>

          <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-2 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Správně</span>
              <span className="font-bold text-green-600">{correct}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Špatně / nestihnuté</span>
              <span className="font-bold text-red-500">{QUESTION_COUNT - correct}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Osobní rekord</span>
              <span className="font-bold" style={{ color: "#f59e0b" }}>{Math.max(correct, getPersonalBest())}/10</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full py-4 text-white font-black text-lg rounded-2xl shadow-lg press-scale"
            style={{ background: "#0D1B3E" }}
          >
            Znovu ⚡ <span className="text-xs opacity-60 font-normal ml-1">[Enter]</span>
          </button>
          <Link href="/trenink" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            ← Zpět na trénink
          </Link>
        </div>
      </div>
    );
  }

  // playing
  const q = questions[idx];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8fafc" }}>
      {flash && (
        <div
          className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-200"
          style={{ background: flash === "green" ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)" }}
        />
      )}

      {/* Header bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-base">⚡</span>
          <span className="text-xs font-bold text-slate-600">Rychlý mód</span>
        </div>

        {/* Timer */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-2.5 rounded-full transition-all duration-1000"
              style={{ width: `${timerPct}%`, background: timerColor }}
            />
          </div>
          <span
            className="text-sm font-black w-6 text-right tabular-nums"
            style={{ color: timerColor }}
          >
            {timeLeft}
          </span>
        </div>

        {/* Score */}
        <span className="shrink-0 text-sm font-black" style={{ color: "#0D1B3E" }}>
          {correct}/{idx} ✓
        </span>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col justify-center px-5 py-8 max-w-sm mx-auto w-full gap-5">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
            {idx + 1} / {QUESTION_COUNT} · {TEMA_LABELS[q.tema] ?? q.tema}
          </p>
          <p className="text-2xl font-bold leading-snug" style={{ color: "#0D1B3E" }}>
            <ExMath ex={q} text={q.zadani} large />
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex rounded-xl border-2 border-slate-200 focus-within:border-indigo-400 transition-colors overflow-hidden">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={q.tema === "zlomky" ? "např. 5/6" : "napiš výsledek"}
              className="flex-1 px-4 py-4 text-xl outline-none bg-transparent placeholder:text-slate-300"
              autoComplete="off"
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-5 text-white font-bold disabled:cursor-not-allowed transition-colors press-scale"
              style={{ background: input.trim() ? "#2E6DA4" : "#cbd5e1" }}
            >
              →
            </button>
          </div>
          <p className="text-center text-xs text-slate-400">Enter = potvrdit</p>
        </form>
      </div>
    </div>
  );
}
