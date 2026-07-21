import { getReadiness } from "./readiness";
import { isTopicLocked } from "./subscription";
import { TEMA_LABELS, TEMATA_ORDER } from "@/types";

/** Téma se považuje za zvládnuté a v pořadí se přeskočí. */
export const MASTERED = 70;

export interface Mise {
  tema: string;
  label: string;
  score: number;
}

/**
 * Dnešní téma = první nezvládnuté téma v pořadí kapitol sešitu.
 *
 * Schválně NE rotace podle dne v týdnu: kdo vynechá úterý, nesmí „přijít
 * o rovnice". Postup drží žák, ne kalendář — na tématu zůstává, dokud ho
 * nezvedne nad práh, pak se posune dál. Zamčená témata přeskakujeme, aby
 * byla mise vždy splnitelná.
 *
 * Sdílí domov („Dnes tě čeká…") i konec tréninku („Zítra tě čeká…"), aby
 * appka slibovala na obou místech totéž.
 */
export function pickMission(isPremium: boolean): Mise | null {
  const r = getReadiness();
  const byTema = new Map(r.topics.map((t) => [t.tema, t]));

  const accessible = TEMATA_ORDER
    .filter((tema) => !isTopicLocked(tema, isPremium))
    .map((tema) => byTema.get(tema) ?? { tema, label: TEMA_LABELS[tema] ?? tema, score: 0, practiced: 0 });

  if (accessible.length === 0) return null;

  const next = accessible.find((t) => t.score < MASTERED)
    ?? [...accessible].sort((a, b) => a.score - b.score)[0];

  return { tema: next.tema, label: next.label ?? TEMA_LABELS[next.tema] ?? next.tema, score: next.score };
}

/** Snímek připravenosti po tématech — pro porovnání „před / po" tréninku. */
export function snapshotReadiness(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of getReadiness().topics) out[t.tema] = t.score;
  return out;
}
