import { examples } from "@/data/examples";
import { localLoadCards } from "@/lib/storage";

/**
 * Nejvyšší odemčená obtížnost (1–3) pro každé téma — pro zobrazení v tréninku.
 *
 * Stejná pravidla jako session builder (trenink/page.tsx): postup se odemyká
 * prokázanými správnými odpověďmi (SM-2 lastQuality ≥ 3), diagnostika umí
 * nanejvýš L2. Tady jen počítáme, co UI ukáže — žák poprvé uvidí, že si
 * vytrénoval přístup k těžším příkladům.
 */

const UNLOCK_CORRECT = 4;
const DIAG_UNLOCK_L2 = 0.6;

export type Level = 1 | 2 | 3;

function diagScoresFromStorage(): Record<string, number> {
  try {
    const raw = localStorage.getItem("matemax-diag-results");
    if (!raw) return {};
    const results = JSON.parse(raw) as Record<string, { correct: number; total: number }>;
    const out: Record<string, number> = {};
    for (const [tema, v] of Object.entries(results)) {
      if (v.total > 0) out[tema] = (v.correct / v.total) * 100;
    }
    return out;
  } catch {
    return {};
  }
}

/** Odemčené úrovně po tématech + počet karet s čekající chybou (pro „Zopakovat chyby"). */
export function computeTrainingState(): { levels: Record<string, Level>; mistakes: number } {
  if (typeof window === "undefined") return { levels: {}, mistakes: 0 };

  const cards = localLoadCards();
  const exById = new Map(examples.map((e) => [e.id, e]));
  const diag = diagScoresFromStorage();

  // Správné odpovědi po tématu a obtížnosti (jen prokázané: lastQuality ≥ 3).
  const correct: Record<string, Record<number, number>> = {};
  let mistakes = 0;
  for (const c of cards) {
    if (c.repetitions > 0 && c.lastQuality <= 2) mistakes++;
    if (c.lastQuality < 3) continue;
    const ex = exById.get(c.exampleId);
    if (!ex) continue;
    (correct[ex.tema] ??= { 1: 0, 2: 0, 3: 0 })[ex.obtiznost]++;
  }

  const temata = new Set(examples.map((e) => e.tema));
  const levels: Record<string, Level> = {};
  for (const tema of temata) {
    const ca = correct[tema] ?? { 1: 0, 2: 0, 3: 0 };
    let lvl: Level = 1;
    if (ca[1] >= UNLOCK_CORRECT || (diag[tema] ?? 0) >= DIAG_UNLOCK_L2 * 100) lvl = 2;
    if (lvl === 2 && ca[2] >= UNLOCK_CORRECT) lvl = 3;
    levels[tema] = lvl;
  }
  return { levels, mistakes };
}

/** Kolik příkladů dané úrovně má žák prokazatelně zvládnuto (SM-2 lastQuality ≥ 3) z kolika je celkem. */
export type LevelProgress = { done: number; total: number };

/** Úroveň se považuje za splněnou, když je zvládnutá aspoň tato část jejích příkladů. */
export const LEVEL_DONE_RATIO = 0.7;

/**
 * Skutečný postup v tématu — z tréninku, ne z diagnostiky. Dřív „Mistrovství témat" ukazovalo
 * výsledek diagnostiky (pár otázek → snadno 100 %) a zelené „✓" u každé odemčené úrovně,
 * takže žák měl „100 %" u tématu, kde neudělal ani jeden příklad z L3.
 */
export function computeTopicProgress(): Record<string, Record<Level, LevelProgress>> {
  const out: Record<string, Record<Level, LevelProgress>> = {};
  if (typeof window === "undefined") return out;

  const mastered = new Set<string>();
  for (const c of localLoadCards()) {
    if (c.repetitions > 0 && c.lastQuality >= 3) mastered.add(c.exampleId);
  }
  for (const ex of examples) {
    const t = (out[ex.tema] ??= { 1: { done: 0, total: 0 }, 2: { done: 0, total: 0 }, 3: { done: 0, total: 0 } });
    const lv = t[ex.obtiznost as Level];
    lv.total++;
    if (mastered.has(ex.id)) lv.done++;
  }
  return out;
}
