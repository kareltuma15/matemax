/**
 * Dnešní trénink na domově: jedno téma a jedna dovednost, kterou appka žákovi sama vybere.
 *
 * Téma: první nezvládnuté v pořadí kapitol (jako „Dnešní mise“), zamčená se přeskočí.
 * Dovednost: první v pořadí, kterou žák ještě nemá z větší části zvládnutou; když má všechny,
 * nabídne testové příklady (úroveň přijímaček).
 */
import { loadGamification } from "./gamification";
import { skoreTematu } from "./readiness";
import { isTopicLocked } from "./subscription";
import { dovednostiTematu, TESTOVE, TESTOVE_NAZEV } from "./dovednosti";
import { computeDovednostProgress } from "./levels";
import { TEMATA_ORDER, TEMATA_ORDER_5, TEMA_LABELS, type Trida } from "@/types";

/** Téma se považuje za zvládnuté (stejný práh jako mise). */
const ZVLADNUTO = 70;
/** Dovednost je hotová, když má žák zvládnutou aspoň takovou část úloh. */
const DOVEDNOST_HOTOVA = 0.7;

export interface DnesniTrenink {
  tema: string;
  nazevTematu: string;
  dovednost: string | null;
  nazevDovednosti: string | null;
  href: string;
  duvod: string;
}

type Pocty = Record<string, { correct: number; total: number }>;

export function dnesniTrenink(trida: Trida, isPremium: boolean): DnesniTrenink | null {
  const stats = loadGamification().topicStats;
  let diag: Pocty = {};
  try { diag = JSON.parse(localStorage.getItem("matemax-diag-results") ?? "{}") as Pocty; } catch { /* nic */ }

  const poradi = (trida === 5 ? TEMATA_ORDER_5 : TEMATA_ORDER.filter((t) => t !== "souhrnne")) as readonly string[];
  const dostupna = poradi.filter((t) => !isTopicLocked(t, isPremium));
  if (dostupna.length === 0) return null;
  const skore = (t: string) => skoreTematu(stats[t], diag[t]);
  const tema = dostupna.find((t) => skore(t) < ZVLADNUTO) ?? [...dostupna].sort((a, b) => skore(a) - skore(b))[0];

  const postup = computeDovednostProgress(tema);
  const dovednosti = dovednostiTematu(tema).filter((d) => (postup[d.klic]?.total ?? 0) > 0);
  const dalsi = dovednosti.find((d) => {
    const p = postup[d.klic];
    return p.done / p.total < DOVEDNOST_HOTOVA;
  });
  const dov = dalsi ?? (dovednosti.length ? { klic: TESTOVE, nazev: TESTOVE_NAZEV } : null);

  const d = diag[tema];
  const s = stats[tema];
  const duvod = d && d.total > 0 && d.correct / d.total < 0.6 && !(s?.total)
    ? "V diagnostice ti tohle téma šlo nejhůř, tak začneme tady."
    : !dalsi && dov
    ? "Základy máš. Teď úlohy jako u přijímaček."
    : s?.total
    ? "Navazuješ tam, kde jsi minule skončil."
    : "Nové téma, začneme od základu.";

  return {
    tema,
    nazevTematu: TEMA_LABELS[tema] ?? tema,
    dovednost: dov?.klic ?? null,
    nazevDovednosti: dov?.nazev ?? null,
    href: dov ? `/trenink?tema=${tema}&dovednost=${dov.klic}` : `/trenink?tema=${tema}`,
    duvod,
  };
}
