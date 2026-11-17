/**
 * Cvičný test pro 5. třídu: stejná kostra jako přijímačky CERMAT na víceletá gymnázia
 * (14 úloh, 70 minut, 50 bodů, viz docs/CERMAT-5-ROZBOR.md). Úlohy se losují z databáze 5. třídy.
 * Úlohy 1–6 a 14 mají dvě podúlohy (1.1, 1.2) ze stejného okruhu, 7 = dvě rýsování, 8 = pravda/nepravda,
 * 9–12 = výběr A–E, 13 = přiřazování. Čistá logika bez Reactu, aby šla testovat.
 */
import { checkAnswer } from "./normalize";
import type { DBExample } from "@/types";

export const TEST5_SEKUND = 70 * 60;
export const TEST5_MAX_BODU = 50;
export const TEST5_HISTORIE = "cvicny-test-5-historie";

export type TypCasti = "text" | "rys" | "AN" | "AE" | "AF";

interface SpecCasti {
  temata: string[];
  typ: TypCasti;
  /** Pořadí preferovaných úrovní; když v nich nic není, bere se jakákoli. */
  urovne: (1 | 2 | 3)[];
  body: number;
  podtema?: string;
}

interface SpecUlohy {
  cislo: number;
  nazev: string;
  casti: SpecCasti[];
}

const VSE5 = ["p5_grafy", "p5_jednotky", "p5_pocitani", "p5_slovni", "p5_zlomky", "p5_obsah", "p5_telesa"];

/** Kostra testu. Součet bodů = 50 (hlídá test). */
export const KOSTRA_TESTU_5: SpecUlohy[] = [
  { cislo: 1, nazev: "Počítání s čísly", casti: [
    { temata: ["p5_pocitani"], typ: "text", urovne: [2], body: 2 },
    { temata: ["p5_pocitani"], typ: "text", urovne: [3, 2], body: 2 },
  ] },
  { cislo: 2, nazev: "Jednotky, čas a peníze", casti: [
    { temata: ["p5_jednotky"], typ: "text", urovne: [2], body: 2 },
    { temata: ["p5_jednotky"], typ: "text", urovne: [3, 2], body: 2 },
  ] },
  { cislo: 3, nazev: "Úvaha", casti: [
    { temata: ["p5_slovni"], typ: "text", urovne: [3, 2], body: 3 },
  ] },
  { cislo: 4, nazev: "Slovní úloha", casti: [
    { temata: ["p5_slovni"], typ: "text", urovne: [2], body: 2 },
    { temata: ["p5_slovni", "p5_zlomky"], typ: "text", urovne: [3, 2], body: 3 },
  ] },
  { cislo: 5, nazev: "Obsah a obvod", casti: [
    { temata: ["p5_obsah"], typ: "text", urovne: [3, 2], body: 3 },
  ] },
  { cislo: 6, nazev: "Obrazce", casti: [
    { temata: ["p5_obsah"], typ: "text", urovne: [2], body: 2 },
    { temata: ["p5_obsah"], typ: "text", urovne: [3, 2], body: 2 },
  ] },
  { cislo: 7, nazev: "Rýsování", casti: [
    { temata: ["p5_rysovani"], typ: "rys", urovne: [2], body: 3 },
    { temata: ["p5_rysovani"], typ: "rys", urovne: [3, 2], body: 3 },
  ] },
  { cislo: 8, nazev: "Pravda, nebo nepravda", casti: [
    { temata: VSE5, typ: "AN", urovne: [2, 3], body: 4 },
  ] },
  { cislo: 9, nazev: "Výběr odpovědi", casti: [{ temata: ["p5_jednotky", "p5_pocitani"], typ: "AE", urovne: [3, 2], body: 2 }] },
  { cislo: 10, nazev: "Výběr odpovědi", casti: [{ temata: ["p5_telesa"], typ: "AE", urovne: [3, 2], body: 2 }] },
  { cislo: 11, nazev: "Výběr odpovědi", casti: [{ temata: ["p5_zlomky"], typ: "AE", urovne: [3, 2], body: 2 }] },
  { cislo: 12, nazev: "Výběr odpovědi", casti: [{ temata: ["p5_obsah", "p5_slovni", "p5_grafy"], typ: "AE", urovne: [3, 2], body: 2 }] },
  { cislo: 13, nazev: "Přiřazování", casti: [
    { temata: VSE5, typ: "AF", urovne: [2, 3, 1], body: 5 },
  ] },
  { cislo: 14, nazev: "Vzory a posloupnosti", casti: [
    { temata: ["p5_grafy"], podtema: "p5_vzory", typ: "text", urovne: [2], body: 2 },
    { temata: ["p5_grafy"], podtema: "p5_vzory", typ: "text", urovne: [3, 2], body: 2 },
  ] },
];

export function typCasti(e: DBExample): TypCasti | null {
  if (e.konstrukce_scena) return "rys";
  if (e.tvrzeni && e.tvrzeni.length > 0) return "AN";
  if (e.prirazeni) return "AF";
  if (e.moznosti && e.moznosti.length > 0) return "AE";
  if (e.podulohy && e.podulohy.length > 0) return null; // úlohy s podúlohami test skládá sám ze dvou úloh
  if (e.kroky_volby?.length || e.porovnani) return null;
  return "text";
}

export interface CastTestu { ex: DBExample; body: number; typ: TypCasti }
export interface UlohaTestu { cislo: number; nazev: string; casti: CastTestu[] }

/** Vylosuje test. `nahoda` jde podstrčit kvůli testům. */
export function sestavTest5(pool: DBExample[], nahoda: () => number = Math.random): UlohaTestu[] {
  const pouzite = new Set<string>();
  const zamichane = [...pool].map((e) => ({ e, r: nahoda() })).sort((a, b) => a.r - b.r).map((x) => x.e);
  const ulohy: UlohaTestu[] = [];
  for (const spec of KOSTRA_TESTU_5) {
    const casti: CastTestu[] = [];
    for (const c of spec.casti) {
      const vhodne = zamichane.filter((e) => !pouzite.has(e.id) && c.temata.includes(e.tema) && typCasti(e) === c.typ && (!c.podtema || e.podtema === c.podtema));
      const ex = c.urovne.map((u) => vhodne.find((e) => e.obtiznost === u)).find(Boolean) ?? vhodne[0];
      if (!ex) continue;
      pouzite.add(ex.id);
      casti.push({ ex, body: c.body, typ: c.typ });
    }
    if (casti.length > 0) ulohy.push({ cislo: spec.cislo, nazev: spec.nazev, casti });
  }
  return ulohy;
}

/** Odpověď žáka na jednu část. */
export interface OdpovedCasti {
  text?: string;
  /** A–E: index možnosti; pravda/nepravda: 0 = ANO, 1 = NE; přiřazování: index v nabídce */
  volby?: (number | null)[];
  /** rýsování: výsledek kontroly značek, null = nic neoznačeno */
  rys?: boolean | null;
}

export function jeVyplnena(c: CastTestu, o: OdpovedCasti | undefined): boolean {
  if (!o) return false;
  if (c.typ === "text") return !!o.text?.trim();
  if (c.typ === "rys") return o.rys !== null && o.rys !== undefined;
  const v = o.volby ?? [];
  if (c.typ === "AE") return v[0] !== null && v[0] !== undefined;
  const n = c.typ === "AN" ? c.ex.tvrzeni!.length : c.ex.prirazeni!.polozky.length;
  return v.length >= n && v.slice(0, n).every((x) => x !== null && x !== undefined);
}

/** Kolik dílčích odpovědí je správně z kolika. */
export function spravneCasti(c: CastTestu, o: OdpovedCasti | undefined): { ok: number; z: number } {
  const v = o?.volby ?? [];
  switch (c.typ) {
    case "text": return { ok: checkAnswer(o?.text ?? "", c.ex.odpoved) ? 1 : 0, z: 1 };
    case "rys": return { ok: o?.rys === true ? 1 : 0, z: 1 };
    case "AE": return { ok: v[0] === c.ex.spravna ? 1 : 0, z: 1 };
    case "AN": {
      const t = c.ex.tvrzeni!;
      return { ok: t.filter((x, i) => v[i] === (x.pravda ? 0 : 1)).length, z: t.length };
    }
    case "AF": {
      const p = c.ex.prirazeni!.polozky;
      return { ok: p.filter((x, i) => v[i] === x.spravna).length, z: p.length };
    }
  }
}

/** Body za část: plný počet za všechno správně, jinak poměrně dolů (jako dílčí body u CERMATu). */
export function bodyCasti(c: CastTestu, o: OdpovedCasti | undefined): number {
  const { ok, z } = spravneCasti(c, o);
  if (z === 0) return 0;
  return ok === z ? c.body : Math.floor((c.body * ok) / z);
}

export interface VysledekTestu5 {
  body: number;
  max: number;
  ulohy: { cislo: number; nazev: string; body: number; max: number }[];
  /** body po okruzích, nejslabší (podle podílu) první */
  okruhy: { tema: string; body: number; max: number }[];
}

export function vyhodnotTest5(ulohy: UlohaTestu[], odpovedi: Record<string, OdpovedCasti>): VysledekTestu5 {
  const okruhy = new Map<string, { body: number; max: number }>();
  const radky = ulohy.map((u) => {
    let body = 0, max = 0;
    for (const c of u.casti) {
      const b = bodyCasti(c, odpovedi[c.ex.id]);
      body += b; max += c.body;
      const o = okruhy.get(c.ex.tema) ?? { body: 0, max: 0 };
      o.body += b; o.max += c.body;
      okruhy.set(c.ex.tema, o);
    }
    return { cislo: u.cislo, nazev: u.nazev, body, max };
  });
  return {
    body: radky.reduce((s, r) => s + r.body, 0),
    max: radky.reduce((s, r) => s + r.max, 0),
    ulohy: radky,
    okruhy: [...okruhy.entries()].map(([tema, v]) => ({ tema, ...v })).sort((a, b) => a.body / a.max - b.body / b.max),
  };
}

/** Označení části v testu: „7.1“, u úlohy z jedné části jen „3“. */
export function oznaceniCasti(u: UlohaTestu, i: number): string {
  return u.casti.length > 1 ? `${u.cislo}.${i + 1}` : String(u.cislo);
}
