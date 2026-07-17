"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { DBExample, TEMA_LABELS, podtemaLabel } from "@/types";
import { checkAnswer } from "@/lib/normalize";
import { getTips } from "@/lib/tips";
import MathText from "./MathText";
import MathDisplay from "./MathDisplay";
import { playCorrect, playWrong } from "@/lib/sound";

/** Renderuje text nebo LaTeX podle typu příkladu */
function ExMath({ ex, text, large, display }: { ex: DBExample; text: string; large?: boolean; display?: boolean }) {
  if (ex.latex) return <MathDisplay tex={text} displayMode={display} />;
  return <MathText text={text} large={large} />;
}

interface Props {
  example: DBExample;
  cardNumber: number;
  total: number;
  consecutiveCorrect: number;
  onResult: (correct: boolean, userAnswer: string) => void;
  onSkip?: () => void;
}

const DIFFICULTY_BADGE: Record<number, { label: string; bg: string; color: string }> = {
  1: { label: "Lehká ⭐",       bg: "#f0fdf4", color: "#166534" },
  2: { label: "Střední ⭐⭐",   bg: "#fffbeb", color: "#92400e" },
  3: { label: "Těžká ⭐⭐⭐",   bg: "#fef2f2", color: "#991b1b" },
};

export default function PracticeCard({ example, cardNumber, total, consecutiveCorrect, onResult, onSkip }: Props) {
  const [input, setInput]               = useState("");
  const [status, setStatus]             = useState<"idle" | "correct" | "wrong">("idle");
  const [showSolution, setShowSolution] = useState(false);
  const [flashColor, setFlashColor]     = useState<"" | "green" | "red">("");
  const [shaking, setShaking]           = useState(false);
  const [comboText, setComboText]       = useState<string | null>(null);
  const [xpLabel, setXpLabel]           = useState<string | null>(null);
  const [cardKey, setCardKey]           = useState(0);
  const [showTip, setShowTip]           = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [lastWrongInput, setLastWrongInput] = useState("");
  const [isFlipping, setIsFlipping]     = useState(false);

  // AI hint state
  const [aiHint, setAiHint]             = useState<string | null>(null);
  const [aiHintLoading, setAiHintLoading] = useState(false);
  const [aiHintError, setAiHintError]   = useState(false);
  const [aiHintUnavailable, setAiHintUnavailable] = useState(false); // klíč nenastaven → skryj tlačítko

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
    setLastWrongInput("");
    setIsFlipping(false);
    setAiHint(null);
    setAiHintLoading(false);
    setAiHintError(false);
    setCardKey((k) => k + 1);
    inputRef.current?.focus();
  }, [example.id]);

  // Keyboard shortcut: Enter or Space to advance after final wrong or correct
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (status === "idle") return;
      if (status === "correct" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onResult(true, input);
      }
      // After 2nd wrong attempt, Enter/Space skips
      if (status === "wrong" && wrongAttempts >= 2 && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onResult(false, lastWrongInput);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, input, onResult, wrongAttempts, lastWrongInput]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "idle" || !input.trim()) return;

    const correct = checkAnswer(input, example.odpoved);
    if (correct) {
      setStatus("correct");
      setFlashColor("green");
      setXpLabel("+10 XP");
      setIsFlipping(true);
      playCorrect();
      // Small confetti burst on every correct answer
      import("canvas-confetti").then(({ default: c }) => c({
        particleCount: 35,
        spread: 52,
        origin: { y: 0.6 },
        startVelocity: 22,
        gravity: 1.3,
        colors: ["#2E6DA4", "#0D1B3E", "#fbbf24", "#22c55e", "#ffffff"],
      }));
      const newConsec = consecutiveCorrect + 1;
      if (newConsec >= 5) {
        // Extra large burst for combo ≥5
        import("canvas-confetti").then(({ default: c }) => c({ particleCount: 80, spread: 70, origin: { y: 0.45 } }));
        setComboText(`🔥 ${newConsec} v řadě!`);
      } else if (newConsec >= 3) {
        setComboText("+combo! 🔥");
      }
      setTimeout(() => setIsFlipping(false), 420);
      setTimeout(() => setComboText(null), 1500);
      setTimeout(() => setFlashColor(""), 350);
    } else {
      const newWrongCount = wrongAttempts + 1;
      setWrongAttempts(newWrongCount);
      setLastWrongInput(input);
      setStatus("wrong");
      setFlashColor("red");
      setXpLabel("+1 XP");
      setShaking(true);
      playWrong();
      // Screen shake — celá stránka se jemně zatřese
      document.body.classList.add("screen-shake");
      setTimeout(() => document.body.classList.remove("screen-shake"), 450);
      setTimeout(() => setFlashColor(""), 350);
      setTimeout(() => setShaking(false), 500);
      // Show static tip after 1st wrong (if available)
      if (newWrongCount >= 1 && tips.length > 0) setShowTip(true);
      // Auto-expand solution after 2nd wrong attempt
      if (newWrongCount >= 2 && example.reseni_kroky.length > 0) setShowSolution(true);
    }
    setTimeout(() => setXpLabel(null), 1200);
  }

  function handleRetry() {
    setInput("");
    setStatus("idle");
    setFlashColor("");
    setShaking(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function fetchAiHint() {
    if (aiHintLoading || aiHint) return;
    setAiHintLoading(true);
    setAiHintError(false);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zadani: example.zadani,
          odpoved: example.odpoved,
          tema: example.tema,
          podtema: example.podtema,
          chybna_odpoved: lastWrongInput,
        }),
      });
      const data = await res.json();
      if (data.hint) {
        setAiHint(data.hint);
      } else if (data.unavailable) {
        setAiHintUnavailable(true); // funkce vypnutá — tlačítko zmizí, žádná chyba
      } else {
        setAiHintError(true);
      }
    } catch {
      setAiHintError(true);
    } finally {
      setAiHintLoading(false);
    }
  }

  const borderColor =
    status === "correct" ? "border-green-500" :
    status === "wrong"   ? "border-red-400" :
    "border-slate-200 focus-within:border-indigo-400";

  const diff = DIFFICULTY_BADGE[example.obtiznost] ?? DIFFICULTY_BADGE[1];
  const progressPct = (cardNumber / total) * 100;
  const topicLabel = TEMA_LABELS[example.tema] ?? example.tema;
  const tips = getTips(example.tema);
  const canRetry = status === "wrong" && wrongAttempts < 2;

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
          isFlipping
            ? "card-flip border-green-400"
            : shaking
            ? "wrong-shake border-red-300"
            : status === "correct"
            ? "border-green-400"
            : "border-slate-200"
        }`}
      >
        {xpLabel && (
          <div
            className="absolute left-1/2 font-black text-xl xp-float-up z-20 pointer-events-none whitespace-nowrap"
            style={{
              top: "20%",
              color: status === "correct" ? "#f59e0b" : "#64748b",
              textShadow: status === "correct"
                ? "0 2px 8px rgba(245,158,11,0.45), 0 0 1px rgba(255,255,255,0.9)"
                : "0 2px 6px rgba(0,0,0,0.15)",
            }}
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
              {podtemaLabel(example.podtema)}
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
          <div className="text-2xl font-bold leading-snug" style={{ color: "#0D1B3E" }}>
            <ExMath ex={example} text={example.zadani} large display={example.latex} />
          </div>
        </div>

        {/* Static tip (idle only) */}
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

        {/* Correct result */}
        {status === "correct" && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-start gap-3">
            <span className="text-xl mt-0.5">✓</span>
            <div className="flex-1">
              <p className="font-bold text-green-700">Správně!</p>
              <p className="text-sm text-green-600">
                Výsledek: <strong><ExMath ex={example} text={example.odpoved} /></strong>
              </p>
              {consecutiveCorrect + 1 >= 3 && (
                <p className="text-sm font-semibold text-amber-600 mt-1">
                  🔥 {consecutiveCorrect + 1} správně v řadě!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Wrong result */}
        {status === "wrong" && (
          <>
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
              <span className="text-xl mt-0.5">✗</span>
              <div className="flex-1">
                <p className="font-bold text-red-700">
                  {canRetry ? "Není správně — zkus to ještě jednou!" : "Skoro!"}
                </p>
                <p className="text-sm text-red-600">
                  Tvoje odpověď: <strong><MathText text={lastWrongInput} /></strong>
                </p>
                {!canRetry && (
                  <p className="text-sm text-slate-600 mt-1">
                    Správně: <strong className="text-slate-800"><ExMath ex={example} text={example.odpoved} /></strong>
                  </p>
                )}
              </div>
            </div>

            {/* Retry + AI hint — po 1. špatné odpovědi */}
            {canRetry && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="flex-1 py-3 font-bold rounded-xl transition-colors press-scale text-sm"
                    style={{ background: "#eff6ff", color: "#2E6DA4", border: "1px solid #bfdbfe" }}
                  >
                    🔄 Zkusit znovu
                  </button>
                  <button
                    type="button"
                    onClick={() => onSkip ? onSkip() : onResult(false, lastWrongInput)}
                    className="py-3 px-4 font-semibold rounded-xl transition-colors text-sm"
                    style={{ background: "#f8fafc", color: "#94a3b8", border: "1px solid #e2e8f0" }}
                  >
                    Přeskočit →
                  </button>
                </div>

                {/* AI hint tlačítko */}
                {!aiHint && !aiHintLoading && !aiHintUnavailable && (
                  <button
                    type="button"
                    onClick={fetchAiHint}
                    className="w-full py-2.5 font-semibold rounded-xl transition-colors text-sm"
                    style={{ background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe" }}
                  >
                    🤖 Chceš chytrý hint od AI?
                  </button>
                )}
                {aiHintLoading && (
                  <div
                    className="w-full py-2.5 text-center text-sm rounded-xl"
                    style={{ background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe" }}
                  >
                    <span className="animate-pulse">🤖 Načítám hint…</span>
                  </div>
                )}
              </div>
            )}

            {/* AI hint výsledek */}
            {aiHint && (
              <div
                className="rounded-xl p-4 fade-in-up"
                style={{ background: "#faf5ff", border: "1.5px solid #c4b5fd" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">🤖</span>
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#7c3aed" }}>
                    AI hint · Claude Haiku
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#4c1d95" }}>{aiHint}</p>
                {canRetry && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="mt-3 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: "#ede9fe", color: "#6d28d9" }}
                  >
                    Zkusit s hintem →
                  </button>
                )}
              </div>
            )}
            {aiHintError && (
              <p className="text-xs text-slate-400 text-center">Hint se nepodařilo načíst. Zkus to za chvíli.</p>
            )}

            {/* Odkaz na podobné příklady — po finálním wrong */}
            {!canRetry && (
              <Link
                href={`/trenink?tema=${example.tema}&podtema=${encodeURIComponent(example.podtema)}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "#eff6ff", color: "#2E6DA4", border: "1px solid #bfdbfe" }}
              >
                <span>🔄</span>
                <span>Procvičit podobné příklady</span>
                <span className="text-xs opacity-50 ml-auto">
                  {(TEMA_LABELS[example.tema] ?? example.tema)} · {podtemaLabel(example.podtema)}
                </span>
              </Link>
            )}
          </>
        )}

        {/* Solution steps — po 2. špatné odpovědi nebo ručně */}
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
                {status === "wrong" && !canRetry && !showSolution && (
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
                        <ExMath ex={example} text={krok} />
                      </p>
                    </li>
                  ))}
                </ol>
                <div
                  className="mt-1 pt-3 border-t text-xs font-semibold flex items-center gap-1.5"
                  style={{ borderColor: "#e2e8f0", color: "#64748b" }}
                >
                  <span>✓</span>
<span>Správná odpověď: <ExMath ex={example} text={example.odpoved} /></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Next button */}
        {status !== "idle" && !canRetry && (
          <button
            onClick={() => onResult(status === "correct", status === "correct" ? input : lastWrongInput)}
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
