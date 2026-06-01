"use client";

/**
 * MathDisplay — renderuje matematické výrazy přes KaTeX.
 * Používá se pro příklady s `latex: true` (složené zlomky, CERMAT styl).
 * Stávající příklady bez `latex` stále používají MathText.
 *
 * Syntaxe v zadání:
 *   Inline LaTeX:  "Vypočti: $\frac{3}{4} - \frac{1}{2}$"
 *   Nebo čistý LaTeX bez dolarů (celé zadání je LaTeX výraz)
 */

import { useEffect, useRef } from "react";
import katex from "katex";

interface Props {
  /** LaTeX výraz — buď celé zadání, nebo s $...$ inline bloky */
  tex: string;
  /** Větší písmo pro zadání příkladu */
  displayMode?: boolean;
  className?: string;
}

export default function MathDisplay({ tex, displayMode = false, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      // Zpracuj smíšený text — nahraď $...$ bloky KaTeX HTML
      const html = renderMixed(tex, displayMode);
      ref.current.innerHTML = html;
    } catch (err) {
      // Fallback — zobraz jako prostý text
      if (ref.current) ref.current.textContent = tex;
      console.warn("KaTeX render error:", err);
    }
  }, [tex, displayMode]);

  return (
    <span
      ref={ref}
      className={className}
      style={{ lineHeight: displayMode ? 2.2 : 1.6 }}
    />
  );
}

/**
 * Renderuje string který může obsahovat:
 *   - $...$ bloky (inline LaTeX)
 *   - Prostý text (renderuje se as-is)
 *   - Pokud string neobsahuje $, pokusí se ho renderovat jako LaTeX přímo
 */
function renderMixed(text: string, displayMode: boolean): string {
  // Pokud text neobsahuje $, renderuj celé jako LaTeX (display nebo inline)
  if (!text.includes("$")) {
    return katex.renderToString(text, {
      displayMode,
      throwOnError: false,
      trust: false,
      strict: false,
    });
  }

  // Smíšený text — rozděl na části: text a $LaTeX$ bloky
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map((part) => {
    if (part.startsWith("$") && part.endsWith("$")) {
      const latex = part.slice(1, -1);
      return katex.renderToString(latex, {
        displayMode: false,
        throwOnError: false,
        trust: false,
        strict: false,
      });
    }
    // Prostý text — escapuj HTML
    return part
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }).join("");
}
