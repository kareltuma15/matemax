"use client";

import { useEffect } from "react";
import { temaStyl } from "@/lib/barvy-temat";

interface Props {
  /** Téma aktuální úlohy (barva proužků). */
  tema: string;
  /** Pořadí aktuální úlohy od nuly. */
  aktualni: number;
  celkem: number;
  /** XP získané v této sérii. */
  xp: number;
  onZavrit: () => void;
}

/**
 * Horní lišta během série: zavřít, postup série po úlohách a XP za sérii. Nic dalšího.
 * Dokud je na obrazovce, appka skryje horní lištu, spodní navigaci i patičku (html[data-priklad],
 * viz globals.css), aby žák viděl jen zadání a odpověď.
 */
export default function SerieHlava({ tema, aktualni, celkem, xp, onZavrit }: Props) {
  useEffect(() => {
    document.documentElement.dataset.priklad = "1";
    return () => { delete document.documentElement.dataset.priklad; };
  }, []);

  return (
    <div className="flex items-center gap-3 mb-4" style={temaStyl(tema)} data-testid="serie-hlava">
      <button
        type="button"
        onClick={onZavrit}
        aria-label="Ukončit sérii"
        className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-xl leading-none press-scale"
        style={{ background: "#EEF0F6", color: "#5F6982" }}
      >
        ×
      </button>
      <div
        className="flex-1 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, celkem)}, minmax(0, 1fr))` }}
        role="progressbar"
        aria-label="Postup série"
        aria-valuemin={0}
        aria-valuemax={celkem}
        aria-valuenow={aktualni + 1}
        aria-valuetext={`Úloha ${aktualni + 1} z ${celkem}`}
      >
        {Array.from({ length: celkem }, (_, i) => (
          <i
            key={i}
            className="block h-2 rounded-full transition-colors duration-300"
            style={
              i < aktualni
                ? { background: "var(--tema-barva)" }
                : i === aktualni
                ? { background: "var(--tema-tint)", outline: "2px solid var(--tema-barva)", outlineOffset: -2 }
                : { background: "#E4E6EF" }
            }
          />
        ))}
      </div>
      <span
        className="shrink-0 text-sm font-extrabold px-2.5 py-1 rounded-lg tabular-nums"
        style={{ background: "#ECEBFE", color: "#4741B8" }}
        aria-label={`Za tuhle sérii ${xp} XP`}
      >
        ⚡ +{xp}
      </span>
    </div>
  );
}
