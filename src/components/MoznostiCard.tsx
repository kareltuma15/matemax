"use client";

import { useState, useEffect } from "react";
import { DBExample, TEMA_LABELS, podtemaLabel } from "@/types";
import MathDisplay from "@/components/MathDisplay";
import MathText from "@/components/MathText";
import TaskImageView from "@/components/TaskImageView";
import { playCorrect, playWrong } from "@/lib/sound";

/**
 * Výběr z možností (A–E) — formát těžších CERMAT úloh. Žák klikne na jednu
 * možnost místo psaní. Díky tomu umíme zadat libovolně těžkou úlohu (i se
 * statickým obrázkem a vícekrokovým výpočtem) bez parsování odpovědi.
 *
 * Vykreslí `image` (parametrický i statický) nad zadáním, pak zadání a možnosti.
 * Viz docs/KONCEPT-tezsi-ulohy.md.
 */

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

const PISMENA = ["A", "B", "C", "D", "E", "F"];

function Text({ ex, text }: { ex: DBExample; text: string }) {
  return ex.latex ? <MathDisplay tex={text} /> : <MathText text={text} />;
}

export default function MoznostiCard({ example, cardNumber, total, onResult, onSkip }: Props) {
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => { setPicked(null); }, [example.id]);

  const moznosti = example.moznosti ?? [];
  const spravna = example.spravna ?? 0;
  if (moznosti.length === 0) return null;

  const spravneVybrano = picked === spravna;

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === spravna) playCorrect(); else playWrong();
  }

  const badge = DIFFICULTY_BADGE[example.obtiznost] ?? DIFFICULTY_BADGE[1];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 fade-in-up">
      {/* Hlavička: pořadí + téma + obtížnost */}
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-slate-500 shrink-0">{cardNumber} / {total}</span>
        <span
          className="font-semibold px-2 py-0.5 rounded-full text-[11px] shrink-0"
          style={{ background: "#eff6ff", color: "#2E6DA4" }}
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

      {/* Obrázek k úloze (parametrický i statický) */}
      {example.image && <TaskImageView image={example.image} />}

      {/* Zadání */}
      <div className="text-base font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
        <Text ex={example} text={example.zadani} />
      </div>

      {/* Možnosti A–E */}
      <div className="flex flex-col gap-2">
        {moznosti.map((m, i) => {
          const revealed = picked !== null;
          const isCorrect = i === spravna;
          const isPicked = picked === i;
          let style: React.CSSProperties = { background: "#fff", border: "2px solid #e2e8f0", color: "var(--text-primary)" };
          if (revealed && isCorrect) style = { background: "#f0fdf4", border: "2px solid #16a34a", color: "#166534" };
          else if (revealed && isPicked) style = { background: "#fef2f2", border: "2px solid #dc2626", color: "#991b1b" };
          else if (revealed) style = { ...style, opacity: 0.5 };
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={revealed}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all active:scale-[0.99]"
              style={style}
            >
              <span
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-black"
                style={{
                  background: revealed && isCorrect ? "#16a34a" : revealed && isPicked ? "#dc2626" : "#eff6ff",
                  color: revealed && (isCorrect || isPicked) ? "#fff" : "#2E6DA4",
                }}
              >
                {PISMENA[i]}
              </span>
              <span className="text-[15px] font-semibold"><Text ex={example} text={m} /></span>
            </button>
          );
        })}
      </div>

      {/* Vyhodnocení + postup */}
      {picked !== null && (
        <div className="flex flex-col gap-3 fade-in-up">
          <div
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{
              background: spravneVybrano ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${spravneVybrano ? "#bbf7d0" : "#fecaca"}`,
            }}
          >
            <div className="font-bold text-sm" style={{ color: spravneVybrano ? "#166534" : "#991b1b" }}>
              {spravneVybrano ? "✓ Správně!" : `✕ Správně je ${PISMENA[spravna]}) ${moznosti[spravna]}`}
            </div>
            {example.reseni_kroky.length > 0 && (
              <ol className="flex flex-col gap-1.5">
                {example.reseni_kroky.map((krok, i) => (
                  <li key={i} className="flex gap-2 text-sm" style={{ color: "#334155" }}>
                    <span className="font-black shrink-0" style={{ color: "#2E6DA4" }}>{i + 1}.</span>
                    <span>{example.latex ? <MathDisplay tex={krok} /> : <MathText text={krok} />}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <button
            onClick={() => onResult(spravneVybrano, moznosti[picked])}
            className="rounded-xl px-4 py-3 text-sm font-bold text-white"
            style={{ background: "#2E6DA4" }}
          >
            Pokračovat →
          </button>
        </div>
      )}

      {picked === null && onSkip && (
        <button onClick={onSkip} className="text-xs font-semibold self-center" style={{ color: "#94a3b8" }}>
          Přeskočit úlohu
        </button>
      )}
    </div>
  );
}
