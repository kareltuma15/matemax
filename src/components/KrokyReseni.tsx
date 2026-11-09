"use client";

import { useState, type ReactNode } from "react";
import type { DBExample } from "@/types";
import MathDisplay from "@/components/MathDisplay";
import MathText from "@/components/MathText";
import { HEX_BODY } from "@/components/HexIkona";
import { temaStyl } from "@/lib/barvy-temat";

/**
 * Vysvětlení po chybě: kroky jako karty v barvě okruhu, odkrývají se po jednom,
 * po posledním kroku přijde zelená karta s výsledkem. Žák tak může přemýšlet dál, než uvidí celé řešení.
 * Volající dává `key={example.id}`, nová úloha začíná znovu od prvního kroku.
 */
export default function KrokyReseni({ example, vysledek }: { example: DBExample; vysledek?: ReactNode }) {
  const kroky = example.reseni_kroky;
  const [ukazano, setUkazano] = useState(1);
  if (kroky.length === 0) return null;

  const text = (t: string) => (example.latex ? <MathDisplay tex={t} /> : <MathText text={t} />);
  const vse = ukazano >= kroky.length;

  return (
    <div className="flex flex-col gap-2 fade-in-up" style={temaStyl(example.tema)} data-testid="kroky-reseni">
      <ol className="flex flex-col gap-2" aria-live="polite">
        {kroky.slice(0, ukazano).map((krok, i) => (
          <li key={i} className="tema-tint flex items-start gap-3 rounded-2xl p-3.5 fade-in-up" data-testid={`krok-${i + 1}`}>
            <span className="relative grid h-9 w-9 shrink-0 place-items-center">
              <svg aria-hidden="true" width="36" height="36" viewBox="0 0 48 48" className="absolute inset-0">
                <polygon points={HEX_BODY} fill="var(--tema-barva)" />
              </svg>
              <span className="relative text-[15px] font-extrabold text-white">{i + 1}</span>
            </span>
            <div className="min-w-0 pt-1.5 text-[15px] font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
              {text(krok)}
            </div>
          </li>
        ))}
      </ol>

      {vse ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl p-4 text-white fade-in-up" style={{ background: "#14753A" }} data-testid="vysledek-reseni">
          <span className="text-[15px] font-bold">Výsledek</span>
          <span className="ml-auto min-w-0 text-right text-2xl font-extrabold">{vysledek ?? text(example.odpoved)}</span>
        </div>
      ) : (
        <button type="button" onClick={() => setUkazano((n) => n + 1)} className="tema-tlacitko min-h-12 rounded-[14px] border-2 px-4 text-[15px] font-extrabold press-scale" data-testid="dalsi-krok">
          Ukaž další krok
        </button>
      )}
    </div>
  );
}
