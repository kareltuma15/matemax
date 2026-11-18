/**
 * Adventní kalendář s Hexíkem (schválil Karel 18. 11. 2026), 1.–24. prosince.
 *
 * Pravidla:
 *  • Okénko dne se otevře jen v daný den a jen po dokončeném tréninku. Nejdřív učení, pak dárek.
 *  • Zmeškané okénko jde dohnat: každý další dokončený trénink v jednom dni otevře jedno zmeškané.
 *  • Za okénky jsou krystaly, sezónní truhly zdarma (adventní neděle) a 7 věcí, které jinde nejsou.
 *  • Všech 24 okének: trofej Adventní mistr a bonus 300 krystalů.
 *
 * Čistá logika bez Reactu, testovaná v e2e/kalendar.spec.ts.
 */
import { najdiOdmenu, otevriTruhlu, VRACENI, type AdventStav, type Odmena, type SbirkaStav, type VysledekTruhly } from "./sbirka";
import type { Trida } from "@/types";

export type { AdventStav };

export type OdmenaOkna =
  | { druh: "krystaly"; n: number }
  | { druh: "vec"; typ: Odmena["typ"]; klic: string | { 5: string; 9: string }; navic?: number }
  | { druh: "truhla" };

/** Co je za kterým okénkem. Ve dnech bez věci krystaly, o adventních nedělích sezónní truhla. */
export const OKNA: Record<number, OdmenaOkna> = {
  1: { druh: "krystaly", n: 50 }, 2: { druh: "krystaly", n: 40 },
  3: { druh: "vec", typ: "hlava", klic: "parohy" },
  4: { druh: "krystaly", n: 60 }, 5: { druh: "krystaly", n: 40 },
  6: { druh: "truhla" },
  7: { druh: "krystaly", n: 50 },
  8: { druh: "vec", typ: "krk", klic: "svetr" },
  9: { druh: "krystaly", n: 60 }, 10: { druh: "krystaly", n: 40 },
  11: { druh: "vec", typ: "efekt", klic: "koule" },
  12: { druh: "krystaly", n: 70 },
  13: { druh: "truhla" },
  14: { druh: "krystaly", n: 50 },
  15: { druh: "vec", typ: "pozadi", klic: "svetylka" },
  16: { druh: "krystaly", n: 60 }, 17: { druh: "krystaly", n: 50 },
  18: { druh: "vec", typ: "podoba", klic: { 5: "pernicek", 9: "polarni" } },
  19: { druh: "krystaly", n: 70 },
  20: { druh: "truhla" },
  21: { druh: "krystaly", n: 80 },
  22: { druh: "vec", typ: "oslava", klic: "rolnicky" },
  23: { druh: "krystaly", n: 100 },
  24: { druh: "vec", typ: "hlava", klic: "hvezda", navic: 150 },
};

export const ZA_VSECHNA_OKNA = 300;

/** Pořadí okének v mřížce (jako v klasickém kalendáři, 24 je velké). */
export const PORADI_OKEN = [7, 15, 2, 20, 11, 4, 18, 9, 24, 13, 1, 23, 6, 16, 10, 21, 3, 14, 8, 19, 5, 12, 22, 17];

/** Den adventu (1–24) pro datum YYYY-MM-DD, jinak null. */
export function denAdventu(den: string): number | null {
  if (den.slice(5, 7) !== "12") return null;
  const d = Number(den.slice(8, 10));
  return d >= 1 && d <= 24 ? d : null;
}

/** Věc za okénkem pro třídu (null, když za okénkem věc není). */
export function vecOkna(d: number, trida: Trida): Odmena | null {
  const o = OKNA[d];
  if (!o || o.druh !== "vec") return null;
  const klic = typeof o.klic === "string" ? o.klic : o.klic[trida];
  return najdiOdmenu(`${trida}-${o.typ}-${klic}`) ?? null;
}

function adventLetos(s: SbirkaStav, den: string): AdventStav {
  const rok = Number(den.slice(0, 4));
  const a = s.advent;
  return a && a.rok === rok ? a : { rok, otevreno: [], tr: { d: "", n: 0 }, dohnano: { d: "", n: 0 } };
}

export type StavOkna = "otevreno" | "dnes" | "dnes-po-treninku" | "dohnat" | "zmeskane" | "budouci";

/** Stav okénka `d` v den `den`. */
export function stavOkna(s: SbirkaStav, den: string, d: number): StavOkna {
  const a = adventLetos(s, den);
  const dnes = denAdventu(den);
  if (a.otevreno.includes(d)) return "otevreno";
  if (dnes === null) return Number(den.slice(5, 7)) === 12 && d <= 24 ? "zmeskane" : "budouci";
  if (d > dnes) return "budouci";
  const tr = a.tr.d === den ? a.tr.n : 0;
  if (d === dnes) return tr >= 1 ? "dnes" : "dnes-po-treninku";
  const dohnano = a.dohnano.d === den ? a.dohnano.n : 0;
  return tr >= 2 + dohnano ? "dohnat" : "zmeskane";
}

/** Kolik okének jde právě teď otevřít (pro Domov a Hexík radí). */
export function oknaKOtevreni(s: SbirkaStav, den: string): number {
  const dnes = denAdventu(den);
  if (dnes === null) return 0;
  const st = Array.from({ length: dnes }, (_, i) => stavOkna(s, den, i + 1));
  const dnesOk = st[dnes - 1] === "dnes" ? 1 : 0;
  const a = adventLetos(s, den);
  const tr = a.tr.d === den ? a.tr.n : 0, dohnano = a.dohnano.d === den ? a.dohnano.n : 0;
  const zmeskanych = st.filter((x, i) => i < dnes - 1 && x !== "otevreno").length;
  return dnesOk + Math.min(zmeskanych, Math.max(0, tr - 1 - dohnano));
}

/** Dokončený trénink v adventu (volá se z konce tréninku). */
export function zapocitejTreninkAdvent(s: SbirkaStav, den: string): SbirkaStav {
  if (denAdventu(den) === null) return s;
  const a = adventLetos(s, den);
  return { ...s, advent: { ...a, tr: { d: den, n: (a.tr.d === den ? a.tr.n : 0) + 1 } } };
}

export interface VysledekOkna {
  d: number;
  druh: OdmenaOkna["druh"];
  odmena: Odmena | null;
  /** Věc je nová (jinak se za ni vrátily krystaly). */
  nova: boolean;
  krystaly: number;
  truhla: VysledekTruhly | null;
  /** Právě otevřel všech 24 okének. */
  mistr: boolean;
}

/** Otevře okénko `d`, když to jde. */
export function otevriOkno(s: SbirkaStav, trida: Trida, den: string, d: number, rnd: () => number = Math.random): { s: SbirkaStav; vysledek: VysledekOkna | null } {
  const st = stavOkna(s, den, d);
  if (st !== "dnes" && st !== "dohnat") return { s, vysledek: null };
  const a = adventLetos(s, den);
  const advent: AdventStav = {
    ...a,
    otevreno: [...a.otevreno, d].sort((x, y) => x - y),
    dohnano: st === "dohnat" ? { d: den, n: (a.dohnano.d === den ? a.dohnano.n : 0) + 1 } : a.dohnano,
  };
  let dalsi: SbirkaStav = { ...s, advent };
  const o = OKNA[d];
  let krystaly = 0, odmena: Odmena | null = null, nova = false, truhla: VysledekTruhly | null = null;
  if (o.druh === "krystaly") krystaly = o.n;
  if (o.druh === "vec") {
    odmena = vecOkna(d, trida);
    if (odmena && !dalsi.mam.includes(odmena.id)) { dalsi = { ...dalsi, mam: [...dalsi.mam, odmena.id] }; nova = true; }
    else if (odmena) krystaly += VRACENI[odmena.vz];
    krystaly += o.navic ?? 0;
  }
  if (o.druh === "truhla") {
    const r = otevriTruhlu(dalsi, "sezonni", trida, den, rnd, true);
    dalsi = r.s; truhla = r.vysledek; odmena = truhla?.odmena ?? null; nova = !!truhla?.nova;
  }
  let mistr = false;
  if (advent.otevreno.length >= 24 && !advent.mistr) {
    mistr = true; krystaly += ZA_VSECHNA_OKNA;
    dalsi = { ...dalsi, advent: { ...(dalsi.advent as AdventStav), mistr: true } };
  }
  // Dárky z kalendáře nepodléhají dennímu stropu (strop hlídá jen krystaly za učení)
  dalsi = { ...dalsi, ziskano: dalsi.ziskano + krystaly };
  return { s: dalsi, vysledek: { d, druh: o.druh, odmena, nova, krystaly: krystaly + (truhla?.krystaly ?? 0), truhla, mistr } };
}
