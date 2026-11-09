"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { TEMATA_ORDER_5, TEMA_LABELS } from "@/types";
import { examples5 } from "@/data/examples";
import { FREE_TOPICS_5 } from "@/lib/subscription";
import { computeTopicProgress, LEVEL_DONE_RATIO, type Level, type LevelProgress } from "@/lib/levels";
import { temaStyl, vzhledTematu } from "@/lib/barvy-temat";
import { HEX_BODY } from "@/components/HexIkona";

/**
 * Mapa okruhů pro 5. třídu (osm okruhů podle oficiálních testů CERMAT, viz docs/CERMAT-5-ROZBOR.md).
 * Hravější varianta: dlaždice v barvě okruhu, tři šestiúhelníky = tři úrovně.
 * Okruh bez úloh se ukazuje jako „Připravujeme“; první tři okruhy jsou zdarma, další v Premium.
 */

const UROVNE: Level[] = [1, 2, 3];

type VysledkyDiagnostiky = Record<string, { correct: number; total: number }>;

function nactiDiagnostiku(): VysledkyDiagnostiky {
  try {
    return JSON.parse(localStorage.getItem("matemax-diag-results") ?? "{}") as VysledkyDiagnostiky;
  } catch {
    return {};
  }
}

function jeHotovo(p: LevelProgress | undefined): boolean {
  return !!p && p.total > 0 && p.done / p.total >= LEVEL_DONE_RATIO;
}

interface Props {
  isPremium: boolean;
  onSelectTopic: (tema: string) => void;
}

export default function TopicMap5({ isPremium, onSelectTopic }: Props) {
  // Postup a diagnostika jsou v localStorage: na serveru prázdné, v prohlížeči se doplní hned po prvním vykreslení.
  const vProhlizeci = useSyncExternalStore(() => () => {}, () => true, () => false);
  const postup = useMemo(() => (vProhlizeci ? computeTopicProgress() : {}), [vProhlizeci]);
  const diagnostika = useMemo(() => (vProhlizeci ? nactiDiagnostiku() : {}), [vProhlizeci]);

  const pocet = (tema: string) => examples5.filter((e) => e.tema === tema).length;
  const dostupny = (tema: string) => pocet(tema) > 0 && (isPremium || FREE_TOPICS_5.has(tema));

  // Doporučení jen z opravdové diagnostiky: nejslabší dostupný okruh, při shodě dřívější v pořadí.
  const doporuceno = TEMATA_ORDER_5
    .filter((t) => dostupny(t) && (diagnostika[t]?.total ?? 0) > 0)
    .reduce<string | null>((nej, t) => {
      const podil = (x: string) => diagnostika[x].correct / diagnostika[x].total;
      return nej === null || podil(t) < podil(nej) ? t : nej;
    }, null);

  return (
    <div className="flex flex-col gap-4" data-testid="mapa-temat-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-[30px] font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>Co dnes potrénuješ?</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Tři šestiúhelníky znamenají tři úrovně. Zaplň je všechny.</p>
      </div>

      {doporuceno && (
        <button
          type="button"
          onClick={() => onSelectTopic(doporuceno)}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-left text-white press-scale"
          style={{ background: "#0D1B3E" }}
          data-testid="doporuceny-okruh"
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-xs" style={{ color: "#D9D8FE" }}>Doporučujeme podle diagnostiky</span>
            <span className="text-base font-extrabold">{TEMA_LABELS[doporuceno]}</span>
          </span>
          <span className="shrink-0 rounded-[10px] px-3.5 py-2 text-sm font-extrabold" style={{ background: "#F5A623", color: "#0D1B3E" }}>Začít</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {TEMATA_ORDER_5.map((tema) => {
          const pripravuje = pocet(tema) === 0;
          const zamceno = !pripravuje && !isPremium && !FREE_TOPICS_5.has(tema);
          const plna = !pripravuje && !zamceno;
          const hotovo = UROVNE.filter((u) => jeHotovo(postup[tema]?.[u])).length;

          const obsah: ReactNode = (
            <>
              <svg aria-hidden="true" width="120" height="120" viewBox="0 0 48 48" className="absolute" style={{ right: -28, top: -24, opacity: 0.16 }}>
                <polygon points={HEX_BODY} fill="currentColor" />
              </svg>
              <svg aria-hidden="true" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative">
                <path d={vzhledTematu(tema).ikona} />
              </svg>
              <span className="relative flex flex-col gap-2">
                <span className="text-base font-extrabold leading-[1.15]">{TEMA_LABELS[tema]}</span>
                {plna && (
                  <span className="flex gap-[3px]" role="img" aria-label={`Hotové úrovně: ${hotovo} ze 3`} data-testid={`urovne-${tema}`}>
                    {UROVNE.map((u) => (
                      <svg key={u} aria-hidden="true" width="18" height="18" viewBox="0 0 48 48" data-hotovo={jeHotovo(postup[tema]?.[u]) ? "1" : "0"}>
                        <polygon points="24,3 42,13.5 42,34.5 24,45 6,34.5 6,13.5" fill={jeHotovo(postup[tema]?.[u]) ? "#fff" : "none"} stroke="#fff" strokeWidth="5" />
                      </svg>
                    ))}
                  </span>
                )}
                {zamceno && (
                  <span className="flex items-center gap-1 text-xs font-extrabold">
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5Z" /></svg>
                    Premium
                  </span>
                )}
                {pripravuje && <span className="text-xs font-extrabold">Připravujeme</span>}
              </span>
            </>
          );

          const trida = `relative flex h-[158px] w-full flex-col justify-between overflow-hidden rounded-[20px] p-3.5 text-left ${plna ? "tema-plna press-scale" : "tema-tint tema-text"}`;
          if (pripravuje) return <div key={tema} className={`${trida} opacity-70`} style={temaStyl(tema)} data-tema={tema}>{obsah}</div>;
          if (zamceno) return <Link key={tema} href="/cenik" className={trida} style={temaStyl(tema)} data-tema={tema}>{obsah}</Link>;
          return <button key={tema} type="button" onClick={() => onSelectTopic(tema)} className={trida} style={temaStyl(tema)} data-tema={tema}>{obsah}</button>;
        })}
      </div>
    </div>
  );
}
