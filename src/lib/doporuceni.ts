/**
 * Doporučení po testu nanečisto (appka Vyhodnocení testů → MateMax).
 * Tvar dat je dohodnutý s druhou appkou (v1), neměnit bez domluvy. Tenhle soubor je čistý
 * (bez kryptografie a prohlížeče): ověření podpisu je v doporuceni-server.ts, tady jen kontrola dat,
 * popisky a sestavení doporučené sady. Neznámé klíče témat a dovedností se tiše vynechají.
 */
import { DOVEDNOSTI } from "./dovednosti";
import { TEMA_LABELS, TEMATA_ORDER, TEMATA_ORDER_5, type Trida } from "@/types";

export type Jistota = "jiste" | "zlepsuje" | "doladit" | "zhorsilo" | "klopyta" | "zatim1" | "nebylo";

export interface DoporuceneTema {
  /** Klíč okruhu MateMaxu (zlomky, p5_obsah…). */
  k: string;
  /** Dovednost uvnitř okruhu (klíč z DOVEDNOSTI, např. slovni_ulohy → pohyb). */
  s?: string;
  pts: number;
  max: number;
  j: Jistota;
}

export interface Doporuceni {
  v: 1;
  src: "nanecisto";
  g: "m5" | "m9";
  test: { n: number; d: string };
  dalsi?: string;
  top: DoporuceneTema[];
  iat: number;
  exp: number;
}

const JISTOTY: Jistota[] = ["jiste", "zlepsuje", "doladit", "zhorsilo", "klopyta", "zatim1", "nebylo"];
const DATUM = /^\d{4}-\d{2}-\d{2}$/;

export function tridaDoporuceni(d: Pick<Doporuceni, "g">): Trida {
  return d.g === "m5" ? 5 : 9;
}

/**
 * Zkontroluje tvar dat a vynechá témata, která MateMax nezná (nebo nepatří ke třídě).
 * Vrátí null, když data nedávají smysl nebo po vynechání nezbude žádné téma.
 */
export function normalizujDoporuceni(raw: unknown): Doporuceni | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1 || r.src !== "nanecisto" || (r.g !== "m5" && r.g !== "m9")) return null;
  const test = r.test as Record<string, unknown> | undefined;
  if (!test || typeof test.n !== "number" || typeof test.d !== "string" || !DATUM.test(test.d)) return null;
  if (typeof r.iat !== "number" || typeof r.exp !== "number") return null;
  const poradi = (r.g === "m5" ? TEMATA_ORDER_5 : TEMATA_ORDER) as readonly string[];
  const top: DoporuceneTema[] = [];
  for (const t of Array.isArray(r.top) ? r.top.slice(0, 3) : []) {
    if (!t || typeof t !== "object") continue;
    const x = t as Record<string, unknown>;
    if (typeof x.k !== "string" || !poradi.includes(x.k) || x.k === "souhrnne") continue;
    const pts = Number(x.pts), max = Number(x.max);
    if (!Number.isFinite(pts) || !Number.isFinite(max) || max <= 0 || pts < 0) continue;
    const s = typeof x.s === "string" && (DOVEDNOSTI[x.k] ?? []).some((d) => d.klic === x.s) ? x.s : undefined;
    const j = JISTOTY.includes(x.j as Jistota) ? (x.j as Jistota) : "doladit";
    top.push({ k: x.k, ...(s ? { s } : {}), pts: Math.min(pts, max), max, j });
  }
  if (top.length === 0) return null;
  return {
    v: 1, src: "nanecisto", g: r.g, test: { n: test.n, d: test.d },
    ...(typeof r.dalsi === "string" && DATUM.test(r.dalsi) ? { dalsi: r.dalsi } : {}),
    top, iat: r.iat, exp: r.exp,
  };
}

export function nazevTematu(t: Pick<DoporuceneTema, "k" | "s">): string {
  const tema = TEMA_LABELS[t.k] ?? t.k;
  const dov = t.s ? DOVEDNOSTI[t.k]?.find((d) => d.klic === t.s)?.nazev : undefined;
  return dov ? `${tema}: ${dov}` : tema;
}

const bodu = (n: number) => (n === 1 ? "bodu" : "bodů");

/** Proč téma doporučujeme, krátce pro žáka: „v testu 2 z 6 bodů“, „v testu 0 z 2 bodů, zatím jednou“. */
export function proc(t: DoporuceneTema): string {
  const zaklad = `v testu ${t.pts} z ${t.max} ${bodu(t.max)}`;
  const dodatek: Record<Jistota, string> = {
    jiste: "", zlepsuje: ", zlepšuješ se", doladit: ", ještě doladit", zhorsilo: ", minule to šlo líp",
    klopyta: ", zatím klopýtá", zatim1: ", zatím jednou", nebylo: "",
  };
  return zaklad + dodatek[t.j];
}

/** „14. 11.“ z „2026-11-14“. */
export function kratkeDatum(d: string): string {
  return `${Number(d.slice(8, 10))}. ${Number(d.slice(5, 7))}.`;
}

/** Cílová obtížnost podle úspěšnosti v testu: pod 40 % lehčí, 40–75 % střední, nad 75 % těžší. */
export function cilovaObtiznost(pts: number, max: number): 1 | 2 | 3 {
  const p = max > 0 ? pts / max : 0;
  return p < 0.4 ? 1 : p <= 0.75 ? 2 : 3;
}

/** Rozdělení 10 příkladů mezi 1–3 témata: 6 / 3 / 1 (dvě témata 7 / 3, jedno 10). */
export function rozdeleni(pocetTemat: number): number[] {
  return pocetTemat >= 3 ? [6, 3, 1] : pocetTemat === 2 ? [7, 3] : [10];
}

interface Uloha { id: string; tema: string; obtiznost: number; dovednost?: string }

/**
 * Doporučená sada: 10 příkladů z témat v pořadí doporučení, z každého tématu nejdřív úlohy
 * na cílové obtížnosti, pak nejbližší vedlejší. Zamčená témata (bez Premium) se vynechají a jejich
 * díl připadne ostatním. `dovednostUlohy` vrací dovednost úlohy (stejně jako běžný trénink).
 */
export function sestavDoporucenouSadu(
  top: DoporuceneTema[],
  ulohy: Uloha[],
  jeZamceno: (tema: string) => boolean,
  dovednostUlohy: (u: Uloha) => string | undefined,
  nahoda: () => number = Math.random,
): string[] {
  const volna = top.filter((t) => !jeZamceno(t.k));
  if (volna.length === 0) return [];
  const pocty = rozdeleni(volna.length);
  const vybrane = new Set<string>();
  const vysledek: string[] = [];
  volna.forEach((t, i) => {
    let pool = ulohy.filter((u) => u.tema === t.k && !vybrane.has(u.id));
    if (t.s) {
      const jenDovednost = pool.filter((u) => dovednostUlohy(u) === t.s);
      if (jenDovednost.length >= pocty[i]) pool = jenDovednost;
    }
    const cil = cilovaObtiznost(t.pts, t.max);
    const serazene = pool
      .map((u) => ({ u, klic: Math.abs(u.obtiznost - cil) + nahoda() * 0.5 }))
      .sort((a, b) => a.klic - b.klic)
      .slice(0, pocty[i])
      .map((x) => x.u);
    for (const u of serazene) { vybrane.add(u.id); vysledek.push(u.id); }
  });
  return vysledek;
}
