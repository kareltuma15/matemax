"use client";

import { useState, useEffect } from "react";
import { DBExample, TEMA_LABELS, podtemaLabel } from "@/types";
import MathDisplay from "@/components/MathDisplay";
import MathText from "@/components/MathText";
import { playCorrect, playWrong } from "@/lib/sound";

/**
 * Porovnávání zlomků/čísel klikem na znaménko.
 *
 * Dřív to byl obyčejný příklad s textovým polem a odpovědí „3/4 < 5/6". Žák
 * netušil, co se po něm chce — přepsat celý zápis? jen znaménko? slovem? — a
 * kontrola odpovědi ho trestala za formát, ne za matematiku. Znaménka jsou
 * tři, takže výběr nic neprozrazuje a hodnotí se přesně to, co se učí.
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

const ZNAKY: Array<{ znak: "<" | "=" | ">"; popis: string }> = [
  { znak: "<", popis: "je menší než" },
  { znak: "=", popis: "rovná se" },
  { znak: ">", popis: "je větší než" },
];

function Strana({ ex, text }: { ex: DBExample; text: string }) {
  if (ex.latex) return <MathDisplay tex={text} />;
  return <MathText text={text} large />;
}

export default function ComparisonCard({ example, cardNumber, total, onResult, onSkip }: Props) {
  const p = example.porovnani;
  const [picked, setPicked] = useState<"<" | "=" | ">" | null>(null);

  useEffect(() => { setPicked(null); }, [example.id]);

  if (!p) return null;

  const badge = DIFFICULTY_BADGE[example.obtiznost] ?? DIFFICULTY_BADGE[1];
  const spravne = picked === p.znak;

  function choose(znak: "<" | "=" | ">") {
    if (picked !== null) return;
    setPicked(znak);
    if (znak === p!.znak) playCorrect(); else playWrong();
  }

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

      <div className="text-sm font-semibold" style={{ color: "#0D1B3E" }}>
        Které znaménko patří mezi čísla?
      </div>

      {/* Obě strany a mezi nimi místo na znaménko */}
      <div
        className="rounded-xl px-4 py-6 flex items-center justify-center gap-4 sm:gap-6"
        style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
      >
        <div className="text-2xl font-bold" style={{ color: "#0D1B3E" }}>
          <Strana ex={example} text={p.levy} />
        </div>

        <div
          className="shrink-0 flex items-center justify-center rounded-xl text-3xl font-black transition-all"
          style={{
            width: 64, height: 64,
            background: picked === null ? "#fff" : spravne ? "#f0fdf4" : "#fef2f2",
            border: picked === null ? "2px dashed #cbd5e1" : `2px solid ${spravne ? "#16a34a" : "#dc2626"}`,
            color: picked === null ? "#cbd5e1" : spravne ? "#166534" : "#991b1b",
          }}
        >
          {picked ?? "?"}
        </div>

        <div className="text-2xl font-bold" style={{ color: "#0D1B3E" }}>
          <Strana ex={example} text={p.pravy} />
        </div>
      </div>

      {/* Tři velká tlačítka — na mobilu se do řádku vejdou i palcem */}
      <div className="grid grid-cols-3 gap-2">
        {ZNAKY.map(({ znak, popis }) => {
          const isPicked = picked === znak;
          const isCorrect = znak === p.znak;
          const revealed = picked !== null;
          let style: React.CSSProperties = { background: "#fff", border: "2px solid #e2e8f0", color: "#0D1B3E" };
          if (revealed && isCorrect) style = { background: "#f0fdf4", border: "2px solid #16a34a", color: "#166534" };
          else if (revealed && isPicked) style = { background: "#fef2f2", border: "2px solid #dc2626", color: "#991b1b" };
          else if (revealed) style = { ...style, opacity: 0.45 };
          return (
            <button
              key={znak}
              onClick={() => choose(znak)}
              disabled={revealed}
              aria-label={popis}
              className="rounded-xl py-4 flex flex-col items-center gap-0.5 transition-all active:scale-[0.97]"
              style={style}
            >
              <span className="text-3xl font-black leading-none">{znak}</span>
              <span className="text-[10px] font-semibold opacity-70">{popis}</span>
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
              background: spravne ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${spravne ? "#bbf7d0" : "#fecaca"}`,
            }}
          >
            <div className="font-bold text-sm" style={{ color: spravne ? "#166534" : "#991b1b" }}>
              {spravne ? "✓ Správně!" : `✕ Správně je ${p.znak}`}
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
            onClick={() => onResult(spravne, picked)}
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
