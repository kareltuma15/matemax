"use client";

import { useMemo, useSyncExternalStore } from "react";
import { TEMA_LABELS } from "@/types";
import { dovednostiTematu, TESTOVE, TESTOVE_NAZEV, TESTOVE_POPIS } from "@/lib/dovednosti";
import { computeDovednostProgress, type LevelProgress } from "@/lib/levels";
import { temaStyl } from "@/lib/barvy-temat";
import { HexIkona, HEX_BODY } from "@/components/HexIkona";

/**
 * Výběr dovednosti v tématu: žák si vybere, co chce procvičit, nebo jde na testové příklady (styl CERMAT).
 * `dovednost = null` znamená celé téma dohromady.
 */
interface Props {
  tema: string;
  onStart: (dovednost: string | null) => void;
  onBack: () => void;
}

function Pruh({ p }: { p: LevelProgress | undefined }) {
  const done = p?.done ?? 0;
  const total = p?.total ?? 0;
  const procent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <span className="flex items-center gap-2">
      <span className="tema-tint flex-1 h-1.5 rounded-full overflow-hidden">
        <span className="block h-full rounded-full" style={{ width: `${procent}%`, background: "var(--tema-barva)" }} />
      </span>
      <span className="tema-text text-xs font-bold shrink-0 tabular-nums">{done}/{total}</span>
    </span>
  );
}

export default function TemaDovednosti({ tema, onStart, onBack }: Props) {
  // Počty úloh jsou hned, zvládnuté (z localStorage) se doplní až v prohlížeči po prvním vykreslení.
  const vProhlizeci = useSyncExternalStore(() => () => {}, () => true, () => false);
  const postup = useMemo(() => computeDovednostProgress(tema, vProhlizeci), [vProhlizeci, tema]);
  const dovednosti = dovednostiTematu(tema);
  const testove = postup[TESTOVE];

  return (
    <div className="flex flex-col gap-4 fade-in-up" style={temaStyl(tema)} data-testid="tema-dovednosti" data-tema-vyber={tema}>
      <button type="button" onClick={onBack} className="w-fit text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
        ← Všechna témata
      </button>

      <div className="flex items-center gap-3">
        <HexIkona tema={tema} velikost={56} />
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>{TEMA_LABELS[tema] ?? tema}</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Vyber, co chceš procvičit. Začneš lehčími příklady, těžší přibývají.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {dovednosti.map((d, i) => (
          <button
            key={d.klic}
            type="button"
            onClick={() => onStart(d.klic)}
            className="text-left rounded-2xl p-3 flex items-center gap-3 bg-white border border-slate-200 card-hover"
            data-dovednost={d.klic}
          >
            <svg aria-hidden="true" width="36" height="36" viewBox="0 0 48 48" className="shrink-0">
              <polygon points={HEX_BODY} className="tema-tint-fill" />
              <text x="24" y="25" textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="800" className="tema-text" fill="currentColor">{i + 1}</text>
            </svg>
            <span className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="text-[15px] font-bold leading-snug" style={{ color: "var(--text-primary)" }}>{d.nazev}</span>
              <span className="text-xs leading-snug" style={{ color: "var(--text-secondary)" }}>{d.popis}</span>
              <Pruh p={postup[d.klic]} />
            </span>
          </button>
        ))}
      </div>

      {(testove?.total ?? 0) > 0 && (
        <button
          type="button"
          onClick={() => onStart(TESTOVE)}
          className="relative overflow-hidden text-left rounded-[20px] p-4 flex items-center gap-3 text-white press-scale"
          style={{ background: "#0D1B3E" }}
          data-dovednost={TESTOVE}
        >
          <svg aria-hidden="true" width="120" height="120" viewBox="0 0 48 48" className="absolute" style={{ right: -30, top: -34, opacity: 0.18 }}>
            <polygon points={HEX_BODY} fill="#AFACFB" />
          </svg>
          <span className="relative flex-1 min-w-0 flex flex-col gap-1">
            <span className="w-fit px-2 py-px rounded-full text-[11px] font-extrabold" style={{ background: "#F5A623", color: "#0D1B3E" }}>Jako u přijímaček</span>
            <span className="text-lg font-extrabold leading-tight">{TESTOVE_NAZEV}</span>
            <span className="text-xs" style={{ color: "#D9D8FE" }}>{TESTOVE_POPIS}</span>
            <span className="text-xs font-bold" style={{ color: "#D9D8FE" }}>Zvládnuto {testove?.done ?? 0} z {testove?.total ?? 0}</span>
          </span>
          <span className="relative shrink-0 rounded-[10px] px-3.5 py-2 text-sm font-extrabold" style={{ background: "#F5A623", color: "#0D1B3E" }}>Začít</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => onStart(null)}
        className="rounded-2xl px-4 py-3 text-sm font-bold border border-slate-200 bg-white card-hover"
        style={{ color: "var(--text-primary)" }}
        data-dovednost="vse"
      >
        Procvičit všechno z tématu dohromady
      </button>
    </div>
  );
}
