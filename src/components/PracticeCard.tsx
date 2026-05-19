"use client";

import { useState, useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import { DBExample, TEMA_LABELS } from "@/types";
import { checkAnswer } from "@/lib/normalize";
import { getTips } from "@/lib/tips";
import MathText from "./MathText";

interface Props {
  example: DBExample;
  cardNumber: number;
  total: number;
  consecutiveCorrect: number;
  onResult: (correct: boolean, userAnswer: string) => void;
}

const DIFFICULTY_BADGE: Record<number, { label: string; bg: string; color: string }> = {
  1: { label: "Lehká ⭐",       bg: "#f0fdf4", color: "#166534" },
  2: { label: "Střední ⭐⭐",   bg: "#fffbeb", color: "#92400e" },
  3: { label: "Těžká ⭐⭐⭐",   bg: "#fef2f2", color: "#991b1b" },
};

export default function PracticeCard({ example, cardNumber, total, consecutiveCorrect, onResult }: Props) {
  const [input, setInput]               = useState("");
  const [status, setStatus]             = useState<"idle" | "correct" | "wrong">("idle");
  const [showSolution, setShowSolution] = useState(false);
  const [flashColor, setFlashColor] = useState<"" | "green" | "red">("");
  const [shaking, setShaking]       = useState(false);
  const [comboText, setComboText]   = useState<string | null>(null);
  const [xpLabel, setXpLabel]       = useState<string | null>(null);
  const [cardKey, setCardKey]       = useState(0);
  const [showTip, setShowTip]       = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput("");
    setStatus("idle");
    setShowSolution(false);
    setFlashColor("");
    setShaking(false);
    setComboText(null);
    setXpLabel(null);
    setShowTip(false);
    setWrongAttempts(0);
    setCardKey((k) => k + 1);
    inputRef.current?.focus();
  }, [example.id]);

  // Keyboard shortcut: Enter or Space to advance after answering
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (status === "idle") return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onResult(status === "correct", input);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, input, onResult]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "idle" || !input.trim()) return;

    const correct = checkAnswer(input, example.odpoved);
    if (correct) {
      setStatus("correct");
      setFlashColor("green");
      setXpLabel("+10 XP");
      const newConsec = consecutiveCorrect + 1;
      if (newConsec >= 5) {
        confetti({ particleCount: 100, spread: 65, origin: { y: 0.5 } });
        setComboText(`🔥 ${newConsec} v řadě!`);
      } else if (newConsec >= 3) {
        setComboText("+combo! 🔥");
      }
      setTimeout(() => setComboText(null), 1500);
      setTimeout(() => setFlashColor(""), 350);
    } else {
      setStatus("wrong");
      setFlashColor("red");
      setXpLabel("+1 XP");
      setShaking(true);
      setTimeout(() => setFlashColor(""), 350);
      setTimeout(() => setShaking(false), 500);
      const newWrongCount = wrongAttempts + 1;
      setWrongAttempts(newWrongCount);
      if (newWrongCount >= 1 && tips.length > 0) setShowTip(true);
      // Auto-expand solution steps after wrong answer
      if (example.reseni_kroky.length > 0) setShowSolution(true);
    }
    setTimeout(() => setXpLabel(null), 1200);
  }

  const borderColor =
    status === "correct" ? "border-green-500" :
    status === "wrong"   ? "border-red-400" :
    "border-slate-200 focus-within:border-indigo-400";

  const diff = DIFFICULTY_BADGE[example.obtiznost] ?? DIFFICULTY_BADGE[1];
  const progressPct = (cardNumber / total) * 100;
  const topicLabel = TEMA_LABELS[example.tema] ?? example.tema;
  const tips = getTips(example.tema);

  return (
    <>
      {flashColor && (
        <div
          className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-300"
          style={{ background: flashColor === "green" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }}
        />
      )}

      {comboText && (
        <div
          className="fixed left-1/2 z-50 pointer-events-none xp-bump"
          style={{ top: "30%", transform: "translateX(-50%)" }}
        >
          <span
            className="text-2xl font-black px-5 py-2.5 rounded-2xl shadow-xl"
            style={{ background: "#fff7ed", color: "#c2410c", border: "2px solid #fed7aa" }}
          >
            {comboText}
          </span>
        </div>
      )}

      <div
        key={cardKey}
        className={`card-enter bg-white rounded-2xl shadow-sm border p-6 flex flex-col gap-5 relative transition-colors duration-200 ${
          shaking
            ? "wrong-shake border-red-300"
            : status === "correct"
            ? "correct-pop border-green-400"
            : "border-slate-200"
        }`}
      >
        {xpLabel && (
          <div
            className="absolute top-4 right-4 font-bold text-sm px-2 py-1 rounded-lg xp-bump z-10"
            style={{ background: "#e0e7ff", color: "#2E6DA4" }}
          >
            {xpLabel}
          </div>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2 gap-2">
            <span className="font-semibold text-slate-500 shrink-0">{cardNumber} / {total}</span>
            <span
              className="font-semibold px-2 py-0.5 rounded-full text-[11px] shrink-0 whitespace-nowrap"
              style={{ background: "#eff6ff", color: "#2E6DA4" }}
            >
              {topicLabel}
            </span>
            <span className="text-slate-300 text-[10px] shrink-0 truncate max-w-[80px]">
              {example.podtema.replace(/_/g, " ")}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: "#0D1B3E" }}
            />
          </div>
        </div>

        {/* Difficulty badge */}
        <div className="flex items-center justify-end">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ background: diff.bg, color: diff.color }}
          >
            {diff.label}
          </span>
        </div>

        {/* Question */}
        <div className="text-center py-2">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-3">Vypočítej</p>
          <p className="text-2xl font-bold leading-snug" style={{ color: "#0D1B3E" }}>
            <MathText text={example.zadani} large />
          </p>
        </div>

        {/* Tip */}
        {status === "idle" && tips.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowTip(!showTip)}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: showTip ? "#0D1B3E" : "#2E6DA4" }}
            >
              <span className="text-base">💡</span>
              {showTip ? "Skrýt nápovědu" : "Zobrazit nápovědu"}
            </button>
            {showTip && (
              <div
                className="mt-2 rounded-xl border p-4 flex flex-col gap-3 fade-in-up"
                style={{ background: "#fffbeb", borderColor: "#fde68a" }}
              >
                {tips.map((tip, i) => (
                  <div key={i}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: "#92400e" }}>
                      {tip.label}
                    </p>
                    <p className="text-sm leading-snug" style={{ color: "#78350f" }}>
                      {tip.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                className="px-5 text-white font-semibold disabled:cursor-not-allowed transition-colors press-scale"
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
              <p className="text-sm text-green-600">
                Výsledek: <strong><MathText text={example.odpoved} /></strong>
              </p>
              {consecutiveCorrect + 1 >= 3 && (
                <p className="text-sm font-semibold text-amber-600 mt-1">
                  🔥 {consecutiveCorrect + 1} správně v řadě!
                </p>
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
                Tvoje odpověď: <strong><MathText text={input} /></strong>
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Správně: <strong className="text-slate-800"><MathText text={example.odpoved} /></strong>
              </p>
            </div>
          </div>
        )}

        {/* Solution steps */}
        {status !== "idle" && example.reseni_kroky.length > 0 && (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: status === "wrong" ? "#bfdbfe" : "#e2e8f0" }}
          >
            <button
              onClick={() => setShowSolution(!showSolution)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors"
              style={{
                background: status === "wrong" ? "#eff6ff" : "#f8fafc",
                color: "#0D1B3E",
              }}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">📐</span>
                Jak se to řeší?
                {status === "wrong" && !showSolution && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "#2E6DA4", color: "#fff" }}
                  >
                    NOVÉ
                  </span>
                )}
              </span>
              <span className="text-slate-400 text-xs">{showSolution ? "▲ skrýt" : "▼ zobrazit"}</span>
            </button>

            {showSolution && (
              <div className="px-4 pb-4 pt-2 fade-in-up" style={{ background: "#fff" }}>
                <ol className="flex flex-col gap-0">
                  {example.reseni_kroky.map((krok, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: "#2E6DA4" }}
                        >
                          {i + 1}
                        </span>
                        {i < example.reseni_kroky.length - 1 && (
                          <div className="w-0.5 flex-1 my-1" style={{ background: "#bfdbfe", minHeight: 12 }} />
                        )}
                      </div>
                      <p
                        className="text-sm leading-snug pb-3 pt-0.5"
                        style={{ color: "#1e293b" }}
                      >
                        <MathText text={krok} />
                      </p>
                    </li>
                  ))}
                </ol>
                <div
                  className="mt-1 pt-3 border-t text-xs font-semibold flex items-center gap-1.5"
                  style={{ borderColor: "#e2e8f0", color: "#64748b" }}
                >
                  <span>✓</span>
                  <span>Správná odpověď: <MathText text={example.odpoved} /></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Next button */}
        {status !== "idle" && (
          <button
            onClick={() => onResult(status === "correct", input)}
            className="w-full py-3 text-white font-semibold rounded-xl transition-colors text-base mt-1 press-scale"
            style={{ background: "#0D1B3E" }}
          >
            Další příklad → <span className="text-xs opacity-50 ml-1">[Enter]</span>
          </button>
        )}
      </div>
    </>
  );
}
