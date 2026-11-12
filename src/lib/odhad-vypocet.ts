/**
 * Čistý výpočet odhadu bodů (bez prohlížeče): používá ho profil, rodičovský přehled i týdenní e-mail rodičům.
 */
import { skoreTematu } from "./readiness";
import type { Trida } from "@/types";

export const MAX_BODU = 50;

/**
 * Kolik bodů za téma bývá v testu (součet 50).
 * 5. třída: rozbor 18 sešitů CERMAT (docs/CERMAT-5-ROZBOR.md): úloha 1 a část 2 počítání, 2 a část 9–12 jednotky,
 * 3, 4 a část 9–12 úvaha, 13 a část 9–12 zlomky, 5 + 6 obvod a obsah, 11–13 tělesa, 7 rýsování, 8 + 14 grafy a vzory.
 * 9. třída: struktura šesti ověřených testů 2025/26 (docs/STRUKTURA-cermat-sesit-matemax.md); body po tématech
 * jsou přibližné, souhrnné úlohy se nepočítají (jsou mix ostatních témat).
 */
export const BODY_TEMAT: Record<Trida, Record<string, number>> = {
  9: { zlomky: 6, vyrazy: 6, rovnice: 6, geometrie: 9, slovni_ulohy: 10, grafy_logika: 5, konstrukce: 4, uhly: 4 },
  5: { p5_pocitani: 6, p5_jednotky: 5, p5_slovni: 9, p5_zlomky: 4, p5_obsah: 8, p5_telesa: 4, p5_rysovani: 6, p5_grafy: 8 },
};

type Pocty = Record<string, { correct: number; total: number }>;

export interface BodyTematu {
  tema: string;
  max: number;
  /** Připravenost 0–100. */
  skore: number;
  /** Body, které by teď získal (na desetiny). */
  body: number;
}

export interface Odhad {
  celkem: number;
  max: number;
  temata: BodyTematu[];
  /** Žák zatím nic neřešil ani nemá diagnostiku: odhad nemá smysl ukazovat jako číslo. */
  bezDat: boolean;
}

/** Čistý výpočet (bez prohlížeče), použije ho i test. */
export function spocitejOdhad(trida: Trida, stats: Pocty, diag: Pocty): Odhad {
  const vahy = BODY_TEMAT[trida];
  const temata = Object.entries(vahy).map(([tema, max]) => {
    const skore = skoreTematu(stats[tema], diag[tema]);
    return { tema, max, skore, body: Math.round(max * skore / 10) / 10 };
  });
  const celkem = Math.round(temata.reduce((a, t) => a + max0(t.max * t.skore / 100), 0));
  const bezDat = Object.keys(vahy).every((t) => !(stats[t]?.total) && !(diag[t]?.total));
  return { celkem, max: MAX_BODU, temata, bezDat };
}
const max0 = (n: number) => Math.max(0, n);
