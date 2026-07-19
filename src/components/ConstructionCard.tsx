"use client";

import { useState, useEffect, useMemo } from "react";
import { DBExample, TEMA_LABELS, podtemaLabel } from "@/types";
import { playCorrect, playWrong } from "@/lib/sound";

interface Props {
  example: DBExample;
  cardNumber: number;
  total: number;
  onResult: (correct: boolean, userAnswer: string) => void;
  onSkip?: () => void;
}

const DIFFICULTY_BADGE: Record<number, { label: string; bg: string; color: string }> = {
  1: { label: "Lehká ⭐",       bg: "#f0fdf4", color: "#166534" },
  2: { label: "Střední ⭐⭐",   bg: "#fffbeb", color: "#92400e" },
  3: { label: "Těžká ⭐⭐⭐",   bg: "#fef2f2", color: "#991b1b" },
};

// Deterministické zamíchání voleb podle indexu kroku — pořadí je stabilní
// napříč re-rendery, ale správná odpověď není pořád první.
function shuffled<T>(arr: T[], seed: number): T[] {
  const out = arr.map((v, i) => ({ v, k: (Math.sin(seed * 97.13 + i * 31.7) + 1) }));
  out.sort((a, b) => a.k - b.k);
  return out.map((o) => o.v);
}

export default function ConstructionCard({ example, cardNumber, total, onResult, onSkip }: Props) {
  const steps = example.kroky_volby ?? [];
  const [stepIdx, setStepIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);   // index ve zamíchaných volbách
  const [madeMistake, setMadeMistake] = useState(false);        // chyba kdekoli v úloze
  const [finished, setFinished] = useState(false);

  // Reset při přechodu na jiný příklad
  useEffect(() => {
    setStepIdx(0); setPicked(null); setMadeMistake(false); setFinished(false);
  }, [example.id]);

  const step = steps[stepIdx];

  // Zamíchané volby pro aktuální krok + kam se přesunul správný index
  const { order, correctPos } = useMemo(() => {
    if (!step) return { order: [] as string[], correctPos: 0 };
    const idxs = shuffled(step.volby.map((_, i) => i), (example.id.length + stepIdx) * 7 + stepIdx);
    return {
      order: idxs.map((i) => step.volby[i]),
      correctPos: idxs.indexOf(step.spravna),
    };
  }, [example.id, stepIdx, step]);

  const badge = DIFFICULTY_BADGE[example.obtiznost] ?? DIFFICULTY_BADGE[1];
  const progressPct = Math.round((stepIdx / Math.max(1, steps.length)) * 100);

  if (steps.length === 0) return null;

  function choose(pos: number) {
    if (picked !== null) return;
    setPicked(pos);
    const correct = pos === correctPos;
    if (correct) {
      playCorrect();
    } else {
      playWrong();
      setMadeMistake(true);
    }
  }

  function next() {
    if (picked === null) return;
    if (stepIdx + 1 < steps.length) {
      setStepIdx((i) => i + 1);
      setPicked(null);
    } else {
      setFinished(true);
    }
  }

  // ── Souhrn po dokončení ────────────────────────────────────────────────────
  if (finished) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 fade-in-up">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-4xl">{madeMistake ? "📐" : "🎉"}</div>
          <div className="text-lg font-black" style={{ color: "#0D1B3E" }}>
            {madeMistake ? "Konstrukce hotová" : "Perfektní konstrukce!"}
          </div>
          <div className="text-sm" style={{ color: "#64748b" }}>
            {madeMistake
              ? "Něco ti ještě uteklo — projdi si celý postup níže."
              : "Celý postup správně napoprvé. Přesně takhle u přijímaček."}
          </div>
        </div>

        {/* Celý postup konstrukce */}
        <div className="rounded-xl p-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#94a3b8" }}>
            Postup konstrukce
          </div>
          <ol className="flex flex-col gap-2">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm" style={{ color: "#334155" }}>
                <span className="font-black shrink-0" style={{ color: "#2E6DA4" }}>{i + 1}.</span>
                <span>{s.volby[s.spravna]}</span>
              </li>
            ))}
          </ol>
        </div>

        <button
          onClick={() => onResult(!madeMistake, "konstrukce")}
          className="rounded-xl px-4 py-3 text-sm font-bold text-white"
          style={{ background: "#2E6DA4" }}
        >
          Pokračovat →
        </button>
      </div>
    );
  }

  // ── Krok konstrukce ────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 fade-in-up">
      {/* Hlavička: pořadí + téma + obtížnost */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500 shrink-0">{cardNumber} / {total}</span>
          <span
            className="font-semibold px-2 py-0.5 rounded-full text-[11px] shrink-0"
            style={{ background: "#eef2ff", color: "#4338ca" }}
          >
            {TEMA_LABELS[example.tema] ?? example.tema}
          </span>
          {podtemaLabel(example.podtema) && (
            <span className="text-slate-300 text-[10px] shrink-0 truncate max-w-[90px]">
              {podtemaLabel(example.podtema)}
            </span>
          )}
          <span
            className="ml-auto font-semibold px-2 py-0.5 rounded-full text-[11px] shrink-0"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
        </div>
        {/* Postup kroky */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div className="h-3 rounded-full transition-all duration-500"
               style={{ width: `${progressPct}%`, background: "#4338ca" }} />
        </div>
      </div>

      {/* Zadání úlohy */}
      <div className="rounded-xl p-4" style={{ background: "#eef2ff", border: "1px solid #c7d2fe" }}>
        <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#6366f1" }}>
          📐 Konstrukční úloha
        </div>
        <div className="text-base font-bold" style={{ color: "#0D1B3E" }}>{example.zadani}</div>
        {example.kontext && (
          <div className="text-sm mt-1" style={{ color: "#475569" }}>{example.kontext}</div>
        )}
      </div>

      {/* Aktuální krok */}
      <div className="flex flex-col gap-1">
        <div className="text-xs font-bold" style={{ color: "#94a3b8" }}>
          Krok {stepIdx + 1} z {steps.length}
        </div>
        <div className="text-sm font-semibold" style={{ color: "#0D1B3E" }}>{step.otazka}</div>
      </div>

      {/* Volby */}
      <div className="flex flex-col gap-2">
        {order.map((volba, pos) => {
          const isPicked = picked === pos;
          const isCorrect = pos === correctPos;
          const revealed = picked !== null;
          let style: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", color: "#334155" };
          if (revealed && isCorrect) style = { background: "#f0fdf4", border: "2px solid #16a34a", color: "#166534" };
          else if (revealed && isPicked && !isCorrect) style = { background: "#fef2f2", border: "2px solid #dc2626", color: "#991b1b" };
          else if (revealed) style = { ...style, opacity: 0.55 };
          return (
            <button
              key={pos}
              onClick={() => choose(pos)}
              disabled={revealed}
              className="text-left rounded-xl px-4 py-3 text-sm font-medium transition-all active:scale-[0.99] flex items-start gap-2"
              style={style}
            >
              <span className="shrink-0 font-black">
                {revealed && isCorrect ? "✓" : revealed && isPicked ? "✕" : String.fromCharCode(65 + pos)}
              </span>
              <span>{volba}</span>
            </button>
          );
        })}
      </div>

      {/* Vysvětlení + další */}
      {picked !== null && (
        <div className="flex flex-col gap-3 fade-in-up">
          {step.vysvetleni && (
            <div className="rounded-xl p-3 text-sm" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569" }}>
              <span className="font-bold" style={{ color: picked === correctPos ? "#16a34a" : "#dc2626" }}>
                {picked === correctPos ? "Správně. " : "Pozor. "}
              </span>
              {step.vysvetleni}
            </div>
          )}
          <button
            onClick={next}
            className="rounded-xl px-4 py-3 text-sm font-bold text-white"
            style={{ background: "#4338ca" }}
          >
            {stepIdx + 1 < steps.length ? "Další krok →" : "Dokončit konstrukci"}
          </button>
        </div>
      )}

      {/* Přeskočit */}
      {picked === null && onSkip && (
        <button onClick={onSkip} className="text-xs font-semibold self-center" style={{ color: "#94a3b8" }}>
          Přeskočit úlohu
        </button>
      )}
    </div>
  );
}
