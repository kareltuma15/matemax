"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { checkAnswer } from "@/lib/normalize";
import { playCorrect, playWrong } from "@/lib/sound";
import MathText from "@/components/MathText";

const DEMO_EXAMPLES = [
  { zadani: "Kolik je 1/2 + 1/4?", odpoved: "3/4", hint: "Najdi společného jmenovatele", tema: "Zlomky" },
  { zadani: "2x + 4 = 10. Kolik je x?", odpoved: "3", hint: "Odečti 4 od obou stran", tema: "Rovnice" },
  { zadani: "Kolik je 15 % ze 60?", odpoved: "9", hint: "15 % = 15/100 × 60", tema: "Procenta" },
  { zadani: "Kolik je 2/3 z čísla 12?", odpoved: "8", hint: "12 ÷ 3 × 2 = ?", tema: "Zlomky" },
  { zadani: "Obvod čtverce je 20 cm. Kolik je strana?", odpoved: "5", hint: "O = 4 × a", tema: "Geometrie" },
];

const TEMA_COLOR: Record<string, string> = {
  Zlomky: "#6366f1",
  Rovnice: "#0891b2",
  Procenta: "#059669",
  Geometrie: "#d97706",
};

export default function DemoCard() {
  const [exIdx, setExIdx] = useState(() => Math.floor(Math.random() * DEMO_EXAMPLES.length));
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"idle" | "correct" | "wrong">("idle");
  const [flash, setFlash] = useState<"" | "green" | "red">("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ex = DEMO_EXAMPLES[exIdx];
  const temaColor = TEMA_COLOR[ex.tema] ?? "#2E6DA4";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || phase !== "idle") return;
    const ok = checkAnswer(input, ex.odpoved);
    if (ok) {
      playCorrect();
      setFlash("green");
      import("canvas-confetti").then(({ default: c }) =>
        c({ particleCount: 80, spread: 60, origin: { y: 0.6 } })
      );
    } else {
      playWrong();
      setFlash("red");
    }
    setPhase(ok ? "correct" : "wrong");
    setTimeout(() => setFlash(""), 350);
  }

  function nextExample() {
    setExIdx((i) => (i + 1) % DEMO_EXAMPLES.length);
    setInput("");
    setPhase("idle");
    setFlash("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div className="relative">
      {flash && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          style={{
            background: flash === "green" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            transition: "opacity 0.3s",
          }}
        />
      )}

      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 8px 32px rgba(13,27,62,0.10)" }}
      >
        {/* Gradient header */}
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white tracking-wide uppercase">Vyzkoušej MateMax</span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.18)", color: "#bfdbfe" }}
            >
              bez registrace
            </span>
          </div>
          <span className="text-xs font-bold opacity-60" style={{ color: "#bfdbfe" }}>
            {exIdx + 1} / {DEMO_EXAMPLES.length}
          </span>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-6 flex flex-col gap-4">
          {/* Topic chip */}
          <div>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: temaColor }}
            >
              {ex.tema}
            </span>
          </div>

          {/* Question */}
          <div className="text-center py-1">
            <p className="text-xl font-black leading-snug" style={{ color: "#0D1B3E" }}>
              <MathText text={ex.zadani} />
            </p>
            {phase === "idle" && (
              <p className="text-xs text-slate-400 mt-2">💡 {ex.hint}</p>
            )}
          </div>

          {/* Input form */}
          {phase === "idle" && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Tvoje odpověď…"
                className="flex-1 px-4 py-3 rounded-xl text-base outline-none transition-all"
                style={{
                  border: `2px solid ${focused ? "#2E6DA4" : "#e2e8f0"}`,
                  background: "#f8fafc",
                  color: "#0D1B3E",
                }}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-5 py-3 text-white font-black rounded-xl disabled:opacity-40 transition-all press-scale text-lg"
                style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
              >
                →
              </button>
            </form>
          )}

          {/* Correct state */}
          {phase === "correct" && (
            <div className="flex flex-col gap-3">
              <div
                className="rounded-xl p-4 text-center"
                style={{ background: "#f0fdf4", border: "2px solid #bbf7d0" }}
              >
                <div className="text-3xl mb-1.5">🎉</div>
                <p className="font-black text-lg" style={{ color: "#166534" }}>Správně! Výborně!</p>
                <p className="text-xs mt-1" style={{ color: "#15803d" }}>
                  Správná odpověď: <strong>{ex.odpoved}</strong>
                </p>
              </div>
              <Link
                href="/vitej"
                className="w-full py-3.5 text-center text-white font-black rounded-xl text-sm press-scale"
                style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
              >
                Chci procvičovat víc → Registrace zdarma
              </Link>
              <button
                type="button"
                onClick={nextExample}
                className="text-sm font-semibold text-center py-1 transition-colors"
                style={{ color: "#94a3b8" }}
              >
                Zkusit další příklad ↓
              </button>
            </div>
          )}

          {/* Wrong state */}
          {phase === "wrong" && (
            <div className="flex flex-col gap-3">
              <div
                className="rounded-xl p-4 text-center"
                style={{ background: "#fff7ed", border: "2px solid #fed7aa" }}
              >
                <div className="text-3xl mb-1.5">🤔</div>
                <p className="font-bold" style={{ color: "#9a3412" }}>
                  Skoro! Správně je: <strong>{ex.odpoved}</strong>
                </p>
                <p className="text-xs mt-1" style={{ color: "#c2410c" }}>
                  Procvičovat se dá — MateMax tě naučí postup krok po kroku.
                </p>
              </div>
              <Link
                href="/vitej"
                className="w-full py-3.5 text-center text-white font-black rounded-xl text-sm press-scale"
                style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
              >
                Procvičit a zlepšit se → Registrace zdarma
              </Link>
              <button
                type="button"
                onClick={nextExample}
                className="text-sm font-semibold text-center py-1 transition-colors"
                style={{ color: "#94a3b8" }}
              >
                Zkusit jiný příklad ↓
              </button>
            </div>
          )}

          {/* Progress dots */}
          {phase === "idle" && (
            <div className="flex justify-center gap-1.5 pt-1">
              {DEMO_EXAMPLES.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === exIdx ? "20px" : "8px",
                    height: "8px",
                    background: i === exIdx ? "#2E6DA4" : "#e2e8f0",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
