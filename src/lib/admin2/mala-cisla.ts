/**
 * Poctivá malá čísla (DA-06). Jedna sada pravidel pro celý admin:
 *  - vždy počet, procento jen s počtem („2 ze 4“),
 *  - procentní změna až od základu 20, jinak „141 proti 23“,
 *  - pod 30 pozorování štítek „malý vzorek“, u podílů Wilsonův interval,
 *  - výkyvy Poissonovým testem, ne procenty.
 * Čísla česky (1 200, 3,5 %).
 */
export const MALY_VZOREK = 30;
export const ZAKLAD_PRO_PROCENTA = 20;

export const cislo = (n: number, desetin = 0) => n.toLocaleString("cs-CZ", { minimumFractionDigits: desetin, maximumFractionDigits: desetin });
export const procenta = (p: number) => `${cislo(Math.round(p))} %`;

/** „2 ze 4“ nebo „2 ze 4 (50 %)“ při dostatečném vzorku. */
export function podil(k: number, n: number, sProcenty = n >= MALY_VZOREK): string {
  if (n === 0) return "0 z 0";
  // „ze“ podle výslovnosti: ze dvou, tří, čtyř, sedmi, dvanácti, sta…
  const z = /^[2347]/.test(String(n)) || n === 12 || (n >= 100 && n < 200) ? "ze" : "z";
  return sProcenty ? `${cislo(k)} ${z} ${cislo(n)} (${procenta((k / n) * 100)})` : `${cislo(k)} ${z} ${cislo(n)}`;
}

/** Srovnání s předchozím obdobím: „+12 % proti minulým 7 dnům“ jen od základu 20, jinak „minule 3“. */
export function srovnani(ted: number, pred: number | null): { text: string; smer: "nahoru" | "dolu" | "stejne" | null } {
  if (pred === null) return { text: "", smer: null };
  const smer = ted > pred ? "nahoru" : ted < pred ? "dolu" : "stejne";
  if (pred < ZAKLAD_PRO_PROCENTA) return { text: `minule ${cislo(pred)}`, smer };
  const zmena = Math.round(((ted - pred) / pred) * 100);
  return { text: `${zmena > 0 ? "+" : ""}${cislo(zmena)} % (minule ${cislo(pred)})`, smer };
}

/** Wilsonův interval spolehlivosti 95 % pro podíl k z n. Vrací [dolní, horní] v procentech. */
export function wilson(k: number, n: number): [number, number] | null {
  if (n === 0) return null;
  const z = 1.96, p = k / n;
  const jm = 1 + (z * z) / n;
  const stred = (p + (z * z) / (2 * n)) / jm;
  const roz = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / jm;
  return [Math.max(0, Math.round((stred - roz) * 100)), Math.min(100, Math.round((stred + roz) * 100))];
}

export const malyVzorek = (n: number) => n < MALY_VZOREK;

/**
 * Je změna z `pred` na `ted` nepravděpodobná náhodou? Poissonův test (oboustranný, p < 0,05).
 * Při malých číslech tak 1 → 3 není „+200 %“, ale běžný výkyv.
 */
export function neobvyklyVykyv(ted: number, pred: number): boolean {
  const lambda = Math.max(pred, 0.5);
  const pmf = (k: number) => { let p = Math.exp(-lambda); for (let i = 1; i <= k; i++) p *= lambda / i; return p; };
  let cdf = 0;
  for (let i = 0; i <= ted; i++) cdf += pmf(i);
  const horni = 1 - cdf + pmf(ted); // P(X >= ted)
  return ted > pred ? horni < 0.025 : cdf < 0.025;
}

/** Skloňování: 1 žák, 2–4 žáci, 5+ žáků. */
export function sklon(n: number, jeden: string, dva: string, pet: string): string {
  const a = Math.abs(n);
  return a === 1 ? jeden : a >= 2 && a <= 4 ? dva : pet;
}
