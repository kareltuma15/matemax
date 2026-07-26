"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReadiness } from "@/lib/readiness";
import { isTopicLocked } from "@/lib/subscription";
import { TEMA_LABELS, TEMATA_ORDER } from "@/types";

/**
 * Kompaktní výběr tématu — „nebo si vyber sám".
 *
 * Nahradil dřívější snake „Mapu učení". Ta byla druhá pouť vedle Cesty
 * k přijímačkám, navíc v jiném pořadí (rovnice před výrazy) a s jiným počtem
 * (9 vs 8) — dvě mapy si odporovaly. Vedení dělá Cesta; tady jde jen o
 * autonomii: skočit rovnou na konkrétní téma. Proto prostá mřížka v pořadí
 * sešitu, ne další příběh o postupu.
 */

const EMOJI: Record<string, string> = {
  zlomky:       "🍕",
  vyrazy:       "🔢",
  rovnice:      "⚖️",
  geometrie:    "📐",
  slovni_ulohy: "📝",
  grafy_logika: "📊",
  konstrukce:   "📏",
  uhly:         "🔺",
  souhrnne:     "🏆",
};

function barColor(score: number): string {
  if (score >= 70) return "#16a34a";
  if (score >= 40) return "#d97706";
  return "#dc2626";
}

export default function TopicPicker({ isPremium }: { isPremium: boolean }) {
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const r = getReadiness();
    setScores(Object.fromEntries(r.topics.map((t) => [t.tema, t.score])));
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {TEMATA_ORDER.map((tema) => {
        const locked = isTopicLocked(tema, isPremium);
        const score = scores[tema] ?? 0;
        const href = locked ? "/cenik" : `/trenink?tema=${tema}`;

        return (
          <Link
            key={tema}
            href={href}
            className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-slate-100 shadow-sm card-hover transition-transform active:scale-[0.98]"
            style={{ opacity: locked ? 0.7 : 1 }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0" style={{ filter: locked ? "grayscale(1)" : "none" }}>
                {locked ? "🔒" : EMOJI[tema]}
              </span>
              <span className="text-[13px] font-bold truncate" style={{ color: "var(--text-primary)" }}>
                {TEMA_LABELS[tema]}
              </span>
            </div>

            {locked ? (
              <span className="text-[10px] font-bold" style={{ color: "#94a3b8" }}>Premium</span>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#e2e8f0" }}>
                  <div className="h-full rounded-full" style={{ width: `${score}%`, background: barColor(score) }} />
                </div>
                <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: "#94a3b8" }}>
                  {score > 0 ? `${score} %` : "—"}
                </span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
