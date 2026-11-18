/**
 * Combo v tréninku (schválil Karel 18. 11. 2026): správné odpovědi za sebou.
 *
 * Stupně: 3 Rozjíždíš se, 5 Hexík září, 10 Ohnivé, 15 Duhové, 20 Legendární.
 * Na milnících (10, 15, 20, 25 a pak každých 5) krystaly navíc, počítají se do denního stropu.
 * Od comba 5 má žák jednou za trénink štít: první chyba combo nesrazí.
 * Rychlý tip u výběru A–E (pod 3 s) combo nezvedne ani nesrazí. Combo je za přemýšlení, ne za klikání.
 *
 * Čistá logika bez Reactu, testovaná v e2e/combo.spec.ts.
 */

export interface StupenComba { od: number; nazev: string }

export const STUPNE_COMBA: StupenComba[] = [
  { od: 0, nazev: "" },
  { od: 3, nazev: "Rozjíždíš se" },
  { od: 5, nazev: "Hexík září" },
  { od: 10, nazev: "Ohnivé combo" },
  { od: 15, nazev: "Duhové combo" },
  { od: 20, nazev: "Legendární combo" },
];

/** Index stupně 0–5 pro dané combo. */
export function stupenComba(n: number): number {
  let i = 0;
  STUPNE_COMBA.forEach((s, j) => { if (n >= s.od) i = j; });
  return i;
}

/** Krystaly navíc za milník (0 = není milník). */
export function bonusZaMilnik(n: number): number {
  if (n === 10 || n === 15) return 5;
  if (n >= 20 && n % 5 === 0) return 10;
  return 0;
}

/** Od kolika správně v řadě dostane žák štít (jednou za trénink). */
export const COMBO_STIT_OD = 5;

export interface StavComba {
  n: number;
  /** Nejdelší combo v tomto tréninku. */
  max: number;
  /** Štít je připravený (podrží combo při jedné chybě). */
  stit: boolean;
  /** Štít už v tomto tréninku byl (znovu se nedává). */
  stitPouzit: boolean;
}

export const VYCHOZI_COMBO: StavComba = { n: 0, max: 0, stit: false, stitPouzit: false };

export type UdalostComba =
  | { druh: "vic"; milnik: number; bonus: number; novyStupen: boolean; noveStit: boolean }
  | { druh: "stit" }
  | { druh: "konec"; bylo: number }
  | { druh: "nic" };

/**
 * Další krok comba po vyhodnocené odpovědi.
 * @param rychlyTip správná odpověď u výběru odpovědi rychleji než za 3 s (spíš tip)
 */
export function krokComba(s: StavComba, spravne: boolean, rychlyTip = false): { s: StavComba; udalost: UdalostComba } {
  if (spravne && rychlyTip) return { s, udalost: { druh: "nic" } };
  if (spravne) {
    const n = s.n + 1;
    const noveStit = !s.stit && !s.stitPouzit && n >= COMBO_STIT_OD;
    const bonus = bonusZaMilnik(n);
    return {
      s: { n, max: Math.max(s.max, n), stit: s.stit || noveStit, stitPouzit: s.stitPouzit },
      udalost: { druh: "vic", milnik: bonus > 0 ? n : 0, bonus, novyStupen: stupenComba(n) > stupenComba(s.n), noveStit },
    };
  }
  if (s.n === 0) return { s, udalost: { druh: "nic" } };
  if (s.stit) return { s: { ...s, stit: false, stitPouzit: true }, udalost: { druh: "stit" } };
  return { s: { ...s, n: 0 }, udalost: { druh: "konec", bylo: s.n } };
}

/** Událost pro Hexíka u příkladu (posílá trénink po každé odpovědi). */
export const COMBO_EVENT = "matemax-combo";
export interface DetailComba { stav: StavComba; udalost: UdalostComba; krystaly: number; rekord: number }
