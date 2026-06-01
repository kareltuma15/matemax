"use client";

import { useState, useEffect, useRef } from "react";
import { DBExample } from "@/types";
import { checkAnswer } from "@/lib/normalize";
import MathText from "./MathText";
import MathDisplay from "./MathDisplay";
import { playCorrect, playWrong } from "@/lib/sound";

function ExMath({ ex, text, large }: { ex: DBExample; text: string; large?: boolean }) {
  if (ex.latex) return <MathDisplay tex={text} displayMode={large} />;
  return <MathText text={text} large={large} />;
}

const BOSS_TIME = 60; // seconds
const BOSS_XP   = 50;

interface Props {
  example: DBExample;
  tema: string;
  temaLabel: string;
  onComplete: (won: boolean) => void;
}

export default function BossBattleCard({ example, temaLabel, onComplete }: Props) {
  const [input, setInput]       = useState("");
  const [phase, setPhase]       = useState<"intro" | "battle" | "won" | "lost">("intro");
  const [timeLeft, setTimeLeft] = useState(BOSS_TIME);
  const [showAnswer, setShowAnswer] = useState(false);
  const [shaking, setShaking]   = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);
  const timerRef                = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown
  useEffect(() => {
    if (phase !== "battle") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("lost");
          setShowAnswer(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Focus input when battle starts
  useEffect(() => {
    if (phase === "battle") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [phase]);

  // Confetti on win
  useEffect(() => {
    if (phase === "won") {
      import("canvas-confetti").then(({ default: c }) => {
        c({ particleCount: 150, spread: 80, origin: { y: 0.55 }, colors: ["#f59e0b", "#fbbf24", "#fde68a", "#fff"] });
        setTimeout(() => c({ particleCount: 80, spread: 60, origin: { x: 0.1, y: 0.6 } }), 300);
        setTimeout(() => c({ particleCount: 80, spread: 60, origin: { x: 0.9, y: 0.6 } }), 500);
      });
    }
  }, [phase]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "battle" || !input.trim()) return;

    const correct = checkAnswer(input, example.odpoved);
    if (correct) {
      clearInterval(timerRef.current!);
      playCorrect();
      setPhase("won");
    } else {
      playWrong();
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  }

  // SVG countdown ring
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - timeLeft / BOSS_TIME);
  const timerColor = timeLeft > 30 ? "#22c55e" : timeLeft > 10 ? "#f59e0b" : "#ef4444";

  // ── INTRO SCREEN ──────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div
        className="rounded-2xl overflow-hidden flex flex-col items-center text-center gap-5 p-8 animate-fade-in"
        style={{ background: "linear-gradient(160deg, #1a0a0a 0%, #3b0f0f 50%, #1a0a0a 100%)", border: "2px solid #7f1d1d" }}
      >
        <div className="text-6xl animate-bounce">⚔️</div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#f87171" }}>
            Boss příklad odemčen!
          </p>
          <h2 className="text-2xl font-black text-white leading-tight">
            Zvládneš ten nejtěžší<br />příklad z tématu?
          </h2>
        </div>
        <div
          className="rounded-xl px-5 py-3 text-sm font-semibold"
          style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
        >
          🎯 Téma: <strong className="text-white">{temaLabel}</strong>
          &ensp;·&ensp;⏱ 60 vteřin
          &ensp;·&ensp;🏆 +{BOSS_XP} XP za výhru
        </div>
        <button
          type="button"
          onClick={() => setPhase("battle")}
          className="w-full py-4 font-black text-lg rounded-xl transition-all press-scale"
          style={{ background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", color: "#fff", boxShadow: "0 0 20px rgba(220,38,38,0.4)" }}
        >
          ⚔️ Bojovat!
        </button>
        <button
          type="button"
          onClick={() => onComplete(false)}
          className="text-xs text-red-900 hover:text-red-700 transition-colors"
        >
          Přeskočit boss příklad
        </button>
      </div>
    );
  }

  // ── WON SCREEN ───────────────────────────────────────────────────
  if (phase === "won") {
    return (
      <div
        className="rounded-2xl overflow-hidden flex flex-col items-center text-center gap-5 p-8"
        style={{ background: "linear-gradient(160deg, #052e16 0%, #14532d 50%, #052e16 100%)", border: "2px solid #166534" }}
      >
        <div className="text-6xl">🏆</div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#4ade80" }}>
            Boss poražen!
          </p>
          <h2 className="text-2xl font-black text-white leading-tight">
            Neuvěřitelné! Zvládl/a jsi<br />nejtěžší příklad!
          </h2>
        </div>
        <div
          className="rounded-xl px-6 py-4 flex flex-col gap-1"
          style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)" }}
        >
          <span className="text-3xl font-black" style={{ color: "#fbbf24" }}>+{BOSS_XP} XP</span>
          <span className="text-sm" style={{ color: "#86efac" }}>Bonus za Boss příklad</span>
        </div>
        <div
          className="rounded-xl p-4 text-sm w-full"
          style={{ background: "rgba(255,255,255,0.05)", color: "#d1fae5" }}
        >
          Správná odpověď: <strong className="text-white"><ExMath ex={example} text={example.odpoved} /></strong>
        </div>
        <button
          type="button"
          onClick={() => onComplete(true)}
          className="w-full py-4 font-black text-lg rounded-xl press-scale"
          style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)", color: "#fff" }}
        >
          Pokračovat → Výsledky
        </button>
      </div>
    );
  }

  // ── LOST SCREEN ──────────────────────────────────────────────────
  if (phase === "lost") {
    return (
      <div
        className="rounded-2xl overflow-hidden flex flex-col items-center text-center gap-5 p-8"
        style={{ background: "linear-gradient(160deg, #1a0a0a 0%, #3b0f0f 50%, #1a0a0a 100%)", border: "2px solid #7f1d1d" }}
      >
        <div className="text-6xl">💀</div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#f87171" }}>
            {timeLeft === 0 ? "Čas vypršel!" : "Boss vyhrál tentokrát…"}
          </p>
          <h2 className="text-2xl font-black text-white leading-tight">
            Příště ho dostaneš!<br />
            <span style={{ color: "#fca5a5" }}>Nevzdávej to.</span>
          </h2>
        </div>
        {showAnswer && (
          <div
            className="rounded-xl p-4 text-sm w-full"
            style={{ background: "rgba(255,255,255,0.05)", color: "#fca5a5" }}
          >
            Správná odpověď byla: <strong className="text-white"><MathText text={example.odpoved} /></strong>
          </div>
        )}
        <button
          type="button"
          onClick={() => onComplete(false)}
          className="w-full py-4 font-black text-lg rounded-xl press-scale"
          style={{ background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", color: "#fff" }}
        >
          Pokračovat → Výsledky
        </button>
      </div>
    );
  }

  // ── BATTLE SCREEN ────────────────────────────────────────────────
  return (
    <div
      className={`rounded-2xl overflow-hidden flex flex-col gap-5 p-6 ${shaking ? "wrong-shake" : ""}`}
      style={{ background: "linear-gradient(160deg, #1a0a0a 0%, #3b0f0f 50%, #1a0a0a 100%)", border: "2px solid #7f1d1d" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚔️</span>
          <div>
            <p className="text-xs font-black uppercase tracking-wider" style={{ color: "#f87171" }}>Boss příklad</p>
            <p className="text-xs" style={{ color: "#fca5a5" }}>{temaLabel} · Obtížnost ⭐⭐⭐</p>
          </div>
        </div>

        {/* Countdown ring */}
        <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
          <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            <circle
              cx="32" cy="32" r={radius}
              fill="none"
              stroke={timerColor}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
            />
          </svg>
          <span
            className="absolute text-base font-black"
            style={{ color: timerColor }}
          >
            {timeLeft}
          </span>
        </div>
      </div>

      {/* XP badge */}
      <div className="flex justify-center">
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}
        >
          🏆 Win = +{BOSS_XP} XP bonus
        </span>
      </div>

      {/* Question */}
      <div
        className="rounded-xl p-5 text-center"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#fca5a5" }}>Vypočítej</p>
        <p className="text-2xl font-bold text-white leading-snug">
          <ExMath ex={example} text={example.zadani} large />
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={example.tema === "zlomky" ? "např. 5/6" : "napiš výsledek"}
          className="w-full px-4 py-3 text-lg rounded-xl outline-none font-semibold text-white"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "2px solid rgba(239,68,68,0.5)",
            caretColor: "#f87171",
          }}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-full py-3.5 font-black text-lg rounded-xl disabled:opacity-40 transition-all press-scale"
          style={{ background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", color: "#fff" }}
        >
          Potvrdit odpověď ⚔️
        </button>
      </form>
    </div>
  );
}
