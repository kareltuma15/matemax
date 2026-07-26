import { getReadiness } from "./readiness";
import { pickMission, MASTERED } from "./mise";
import { isTopicLocked } from "./subscription";
import { getDaysUntilCermat } from "./cermat-date";
import { TEMA_LABELS, TEMATA_ORDER } from "@/types";

/**
 * „Tvoje cesta k přijímačkám" — osmitýdenní pouť tématy v pořadí sešitu.
 *
 * Nahrazuje dřívější týdenní kalendář (rotace témat podle dne v týdnu, „dny
 * volna"). Ten přiděloval téma úterku či čtvrtku a vytvářel kalendářový tlak —
 * přesně to, od čeho jsme u řízeného domova odešli. Cesta je samo-tempová:
 * pozice = nejslabší nezvládnuté dostupné téma (stejná logika jako „Dnešní
 * mise"), ne kolikátý je týden. „8 týdnů" je jen doporučené tempo, odpočet do
 * přijímaček slouží jako kontext, ne jako bič.
 *
 * 8 dovednostních témat = 8 zastávek, souhrnné je finále (testy nanečisto).
 */

export type StopStatus = "done" | "current" | "locked" | "upcoming";

export interface CestaStop {
  tema: string;
  label: string;
  week: number;          // 1..8
  subs: string;          // podtémata na jeden řádek
  score: number;         // 0–100
  status: StopStatus;
}

export interface Cesta {
  hasData: boolean;
  stops: CestaStop[];
  finale: { subs: string };
  daysUntil: number;
  weeksUntil: number;
  masteredCount: number;
  total: number;         // 8
  currentTema: string | null;
  currentWeek: number | null;
}

// Dovednostní témata v pořadí sešitu (bez souhrnného, to je finále).
const SKILL_TEMATA: string[] = TEMATA_ORDER.filter((t) => t !== "souhrnne");

/** Náhled podtémat pro každé téma — co se na zastávce naučíš (dle kapitol sešitu). */
const PODTEMATA_NAHLED: Record<string, string> = {
  zlomky:       "Sčítání a odčítání · Násobení a dělení · Smíšená čísla · Porovnávání",
  vyrazy:       "Dosazování · Mocniny · Roznásobení závorek · Vytýkání",
  rovnice:      "Lineární rovnice · Rovnice se závorkami · Zlomkové rovnice · Soustavy",
  geometrie:    "Rovinné obrazce · Prostorová tělesa · Pythagorova věta",
  slovni_ulohy: "Poměr a měřítko · Pohyb · Procenta · Finance",
  grafy_logika: "Posloupnosti · Číselné zákonitosti · Logická dedukce",
  konstrukce:   "Osa úsečky a úhlu · Kolmice · Trojúhelníky · Kružnice opsaná/vepsaná",
  uhly:         "Vnější a vedlejší úhly · Úhly u rovnoběžek · Mnohoúhelníky",
};

const FINALE_SUBS = "Mix všech témat · testy nanečisto na ostro";

export function generateCesta(isPremium: boolean): Cesta {
  const r = getReadiness();
  const daysUntil = getDaysUntilCermat();
  const weeksUntil = Math.ceil(daysUntil / 7);

  const byTema = new Map(r.topics.map((t) => [t.tema, t]));
  const currentTema = r.hasData ? (pickMission(isPremium)?.tema ?? null) : null;

  const stops: CestaStop[] = SKILL_TEMATA.map((tema, i) => {
    const score = byTema.get(tema)?.score ?? 0;
    let status: StopStatus;
    if (isTopicLocked(tema, isPremium)) status = "locked";
    else if (tema === currentTema) status = "current";   // mise má přednost i nad „done"
    else if (score >= MASTERED) status = "done";
    else status = "upcoming";
    return { tema, label: TEMA_LABELS[tema] ?? tema, week: i + 1, subs: PODTEMATA_NAHLED[tema] ?? "", score, status };
  });

  const masteredCount = stops.filter((s) => s.status === "done").length;
  const currentWeek = currentTema ? (SKILL_TEMATA.indexOf(currentTema) + 1) : null;

  return {
    hasData: r.hasData,
    stops,
    finale: { subs: FINALE_SUBS },
    daysUntil,
    weeksUntil,
    masteredCount,
    total: SKILL_TEMATA.length,
    currentTema,
    currentWeek: currentWeek && currentWeek > 0 ? currentWeek : null,
  };
}
