"use client";

import { useRef, useEffect } from "react";
import MathDisplay from "./MathDisplay";

/** „Řešte rovnici: $…$" → pokyn + výraz. Krátké „Vypočítej:" / „Vyřeš:" (< 12 znaků) se nedělí. */
export function splitPrompt(zadani: string): { instruction: string; expression: string } | null {
  const m = zadani.match(/^([^$]{12,}?):\s*\$([^$]+)\$\s*$/);
  return m ? { instruction: `${m[1]}:`, expression: m[2] } : null;
}

/**
 * Velký výraz na vlastním řádku, který se vždy vejde celý: font se zmenší přesně tak, aby výraz
 * nepřetekl šířku karty (žádný posuvník). Přepočítá se při změně šířky okna i po načtení fontů KaTeXu.
 */
export default function FitMath({ tex, base = 24 }: { tex: string; base?: number }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;
    const fit = () => {
      inner.style.fontSize = `${base}px`;
      const need = inner.getBoundingClientRect().width;
      const avail = box.clientWidth;
      if (need > avail && need > 0 && avail > 0) {
        inner.style.fontSize = `${Math.max(11, Math.floor((base * avail * 0.98) / need))}px`;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [tex, base]);
  return (
    <div ref={boxRef} className="text-center font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
      <span ref={innerRef} style={{ display: "inline-block", whiteSpace: "nowrap", fontSize: base }}>
        <MathDisplay tex={tex} displayMode />
      </span>
    </div>
  );
}
