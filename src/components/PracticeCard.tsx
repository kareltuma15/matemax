"use client";

import { useState, useRef, useEffect } from "react";
import { DBExample, TEMA_LABELS } from "@/types";
import { checkAnswer } from "@/lib/normalize";

interface Props {
  example: DBExample;
  cardNumber: number;
  total: number;
  consecutiveCorrect: number;
  onResult: (correct: boolean) => void;
}

const DIFFICULTY_BADGE: Record<number, { label: string; bg: string; color: string }> = {
  1: { label: "Lehká ⭐",       bg: "#f0fdf4", color: "#166534" },
  2: { label: "Střední ⭐⭐",   bg: "#fffbeb", color: "#92400e" },
  3: { label: "Těžká ⭐⭐⭐",   bg: "#fef2f2", color: "#991b1b" },
};

export default function PracticeCard({ example, cardNumber, total, consecutiveCorrect, onResult }: Props) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [showSolution, setShowSolution] = useState(false);
  const [flashColor, setFlashColor] = useState<"" | "green" | "red">("");
  const [shaking, setShaking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [xpLabel, setXpLabel] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput("");
    setStatus("idle");
    setShowSolution(false);
    setFlashColor("");
    setShaking(false);
    setShowConfetti(false);
    setXpLabel(null);
    inputRef.current?.focus();
  }, [example.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "idle" || !input.trim()) return;

    const correct = checkAnswer(input, example.odpoved);
    if (correct) {
      setStatus("correct");
      setFlashColor("green");
      setXpLabel("+10 XP");
      if (consecutiveCorrect + 1 >= 3) setShowConfetti(true);
      setTimeout(() => setFlashColor(""), 350);
    } else {
      setStatus("wrong");
      setFlashColor("red");
      setXpLabel("+5 XP");
      setShaking(true);
      setTimeout(() => setFlashColor(""), 350);
      setTimeout(() => setShaking(false), 500);
    }
    setTimeout(() => setXpLabel(null), 1200);
  }

  const borderColor =
    status === "correct" ? "border-green-500" :
    status === "wrong" ? "border-red-400" :
    "border-slate-200 focus-within:border-indigo-400";

  const diff = DIFFICULTY_BADGE[example.obtiznost] ?? DIFFICULTY_BADGE[1];
  const progressPct = (cardNumber / total) * 100;

  return (
    <>
      {/* Flash overlay */}
      {flashColor && (
        <div
          className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-300"
          style={{
            background: flashColor === "green" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          }}
        />
      )}

      {/* Confetti dots */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2.5 h-2.5 rounded-full animate-bounce"
              style={{
                left: `${5 + (i * 5.5) % 90}%`,
                top: `${10 + (i * 7) % 50}%`,
                background: ["#6366f1", "#f59e0b", "#10b981", "#ec4899", "#3b82f6"][i % 5],
                animationDelay: `${i * 60}ms`,
                animationDuration: `${600 + (i * 80) % 400}ms`,
              }}
            />
          ))}
        </div>
      )}

      <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-5 relative ${shaking ? "card-shake" : ""}`}>
        {/* XP animation */}
        {xpLabel && (
          <div
            className="absolute top-4 right-4 font-bold text-sm px-2 py-1 rounded-lg animate-bounce z-10"
            style={{ background: "#e0e7ff", color: "#2E6DA4" }}
          >
            {xpLabel}
          </div>
        )}

        {/* Progress bar + label */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-500">{cardNumber} / {total}</span>
            <span className="font-semibold" style={{ color: "#2E6DA4" }}>
              {TEMA_LABELS[example.tema] ?? example.tema}
            </span>
            <span className="capitalize text-slate-300 text-xs">{example.podtema.replace(/_/g, " ")}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: "#0D1B3E" }}
            />
          </div>
        </div>

        {/* Difficulty badge — top right of question area */}
        <div className="flex items-center justify-end">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: diff.bg, color: diff.color }}
          >
            {diff.label}
          </span>
        </div>

        {/* Question */}
        <div className="text-center py-2">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-3">Vypočítej</p>
          <p className="text-2xl font-bold leading-snug" style={{ color: "#0D1B3E" }}>
            {example.zadani}
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label className="text-xs font-medium text-slate-500">Tvoje odpověď</label>
          <div className={`flex rounded-xl border-2 transition-colors ${borderColor} overflow-hidden`}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={status !== "idle"}
              placeholder={example.tema === "zlomky" ? "např. 5/6" : "napiš výsledek"}
              className="flex-1 px-4 py-3 text-lg outline-none bg-transparent placeholder:text-slate-300"
              autoComplete="off"
            />
            {status === "idle" && (
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-5 text-white font-semibold disabled:cursor-not-allowed transition-colors"
                style={{ background: input.trim() ? "#2E6DA4" : "#cbd5e1" }}
              >
                OK
              </button>
            )}
          </div>
        </form>

        {/* Result */}
        {status === "correct" && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-start gap-3">
            <span className="text-xl mt-0.5">✓</span>
            <div className="flex-1">
              <p className="font-bold text-green-700">Správně!</p>
              <p className="text-sm text-green-600">Výsledek: <strong>{example.odpoved}</strong></p>
              {consecutiveCorrect + 1 >= 3 && (
                <p className="text-sm font-semibold text-amber-600 mt-1">🔥 {consecutiveCorrect + 1} správně v řadě!</p>
              )}
            </div>
          </div>
        )}

        {status === "wrong" && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <span className="text-xl mt-0.5">✗</span>
            <div className="flex-1">
              <p className="font-bold text-red-700">Skoro!</p>
              <p className="text-sm text-red-600">
                Tvoje odpověď: <strong>{input}</strong>
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Správně: <strong className="text-slate-800">{example.odpoved}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Solution steps */}
        {status !== "idle" && example.reseni_kroky.length > 0 && (
          <div>
            <button
              onClick={() => setShowSolution(!showSolution)}
              className="text-sm font-medium transition-colors"
              style={{ color: "#2E6DA4" }}
            >
              {showSolution ? "▲ Skrýt postup" : "▼ Zobrazit postup řešení"}
            </button>
            {showSolution && (
              <ol className="mt-3 space-y-1 pl-4 list-decimal marker:text-slate-400">
                {example.reseni_kroky.map((krok, i) => (
                  <li key={i} className="text-sm text-slate-700 font-mono">{krok}</li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* Next button */}
        {status !== "idle" && (
          <button
            onClick={() => onResult(status === "correct")}
            className="w-full py-3 text-white font-semibold rounded-xl transition-colors text-base mt-1"
            style={{ background: "#0D1B3E" }}
          >
            Další příklad →
          </button>
        )}
      </div>
    </>
  );
}
