/**
 * Propojení účtů s appkou Vyhodnocení testů (krok 2). Čistý soubor bez kryptografie a databáze:
 * povolené adresy návratu, kontrola výsledku testu, sestavení plánu do příštího testu a souhrn procvičování.
 * Formáty jsou dohodnuté s druhou appkou, neměnit bez domluvy.
 */
import { DOVEDNOSTI } from "./dovednosti";
import { TEMATA_ORDER, TEMATA_ORDER_5 } from "@/types";
import type { Doporuceni, DoporuceneTema, Jistota } from "./doporuceni";

export type Trida2 = "m5" | "m9";

/** Kam smí obrazovka propojení vrátit kód. Vývojová adresa jen mimo produkci. */
export const NAVRAT_PRODUKCE = "https://vysledky.matematika-snadno.cz/api/matemax/navrat";
export const NAVRAT_VYVOJ = "http://localhost:3001/api/matemax/navrat";

export function povolenyNavrat(navrat: unknown, produkce: boolean): navrat is string {
  if (typeof navrat !== "string") return false;
  return navrat === NAVRAT_PRODUKCE || (!produkce && navrat === NAVRAT_VYVOJ);
}

/** `state` od druhé appky jen vracíme. Hlídáme jen délku a znaky, ať se nedá podstrčit nic jiného. */
export function platnyState(state: unknown): state is string {
  return typeof state === "string" && state.length >= 1 && state.length <= 512 && /^[A-Za-z0-9._~-]+$/.test(state);
}

/** Adresa návratu s parametry (state se nemění, jen se vrátí). */
export function navratUrl(navrat: string, state: string, vysledek: { code: string } | { chyba: "odmitnuto" }): string {
  const u = new URL(navrat);
  u.searchParams.set("state", state);
  if ("code" in vysledek) u.searchParams.set("code", vysledek.code);
  else u.searchParams.set("chyba", vysledek.chyba);
  return u.toString();
}

export const tridaNaG = (t: number): Trida2 => (t === 5 ? "m5" : "m9");

const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const JISTOTY: Jistota[] = ["jiste", "zlepsuje", "doladit", "zhorsilo", "klopyta", "zatim1", "nebylo"];
export const LINK_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function platneDatum(d: unknown): d is string {
  if (typeof d !== "string" || !DATUM.test(d)) return false;
  const t = new Date(`${d}T12:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
}

export interface VysledekTestu {
  link_id: string;
  g: Trida2;
  test: { n: number; d: string };
  dalsi?: string;
  celkem?: { pts: number; max: number };
  temata: DoporuceneTema[];
}

/** Témata, která MateMax zná (a patří ke třídě). Neznámé `k` / `s` se tiše vynechají. */
export function normalizujTemata(g: Trida2, raw: unknown): DoporuceneTema[] {
  const poradi = (g === "m5" ? TEMATA_ORDER_5 : TEMATA_ORDER) as readonly string[];
  const out: DoporuceneTema[] = [];
  for (const t of Array.isArray(raw) ? raw.slice(0, 100) : []) {
    if (!t || typeof t !== "object") continue;
    const x = t as Record<string, unknown>;
    if (typeof x.k !== "string" || !poradi.includes(x.k) || x.k === "souhrnne") continue;
    const pts = Number(x.pts), max = Number(x.max);
    if (!Number.isFinite(pts) || !Number.isFinite(max) || max <= 0 || pts < 0) continue;
    const s = typeof x.s === "string" && (DOVEDNOSTI[x.k] ?? []).some((d) => d.klic === x.s) ? x.s : undefined;
    const j = JISTOTY.includes(x.j as Jistota) ? (x.j as Jistota) : "doladit";
    out.push({ k: x.k, ...(s ? { s } : {}), pts: Math.min(pts, max), max, j });
  }
  return out;
}

/** Kontrola výsledku jednoho testu (POST /api/vysledky/vysledky). Vrací null, když data nedávají smysl. */
export function normalizujVysledek(raw: unknown): VysledekTestu | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.link_id !== "string" || !LINK_ID.test(r.link_id)) return null;
  if (r.g !== "m5" && r.g !== "m9") return null;
  const test = r.test as Record<string, unknown> | undefined;
  if (!test || !Number.isInteger(test.n) || (test.n as number) < 1 || (test.n as number) > 99 || !platneDatum(test.d)) return null;
  const celkemRaw = r.celkem as Record<string, unknown> | undefined;
  const cp = Number(celkemRaw?.pts), cm = Number(celkemRaw?.max);
  const celkem = celkemRaw && Number.isFinite(cp) && Number.isFinite(cm) && cm > 0 && cp >= 0 ? { pts: Math.min(cp, cm), max: cm } : undefined;
  return {
    link_id: r.link_id.toLowerCase(),
    g: r.g,
    test: { n: test.n as number, d: test.d as string },
    ...(platneDatum(r.dalsi) ? { dalsi: r.dalsi } : {}),
    ...(celkem ? { celkem } : {}),
    temata: normalizujTemata(r.g, r.temata),
  };
}

// Váha jistoty při řazení: kde dítě klopýtá nebo se zhoršilo, to jde dopředu.
const VAHA: Record<Jistota, number> = { klopyta: 1.5, zhorsilo: 1.4, zatim1: 1.2, doladit: 1.1, nebylo: 1, zlepsuje: 0.9, jiste: 0.5 };

/**
 * Plán do příštího testu: témata seřazená podle ztracených bodů a jistoty, nejvýš tři.
 * Téma bez ztracených bodů se nedoporučuje. Výsledek má tvar doporučení v1, ať ho appka ukáže stejně jako odkaz.
 * Vrací null, když není co doporučit.
 */
export function planZVysledku(v: VysledekTestu, nyniSekundy = Math.floor(Date.now() / 1000)): Doporuceni | null {
  const top = v.temata
    .filter((t) => t.max - t.pts > 0)
    .map((t, i) => ({ t, skore: (t.max - t.pts) * VAHA[t.j], i }))
    .sort((a, b) => b.skore - a.skore || a.i - b.i)
    .slice(0, 3)
    .map((x) => x.t);
  if (top.length === 0) return null;
  return {
    v: 1, src: "nanecisto", g: v.g, test: v.test,
    ...(v.dalsi ? { dalsi: v.dalsi } : {}),
    top, iat: nyniSekundy, exp: nyniSekundy + 180 * 86400,
  };
}

/** Jeden záznam tréninku v tabulce procvicovani. */
export interface ZaznamProcvicovani {
  datum: string;
  kdy: string;
  sekund: number;
  temata: { k: string; s?: string; n: number; ok: number }[];
}

export interface SouhrnTematu { k: string; s?: string; prikladu: number; spravne: number; minut: number }

/**
 * Souhrn procvičování pro Vyhodnocení testů: za každý okruh jedna položka (`k`) a k tomu rozpad
 * podle dovedností (`k` + `s`). Položky s `s` jsou část okruhu, nesčítat je s ním.
 * Minuty se dělí mezi témata podle počtu příkladů v tréninku.
 */
export function souhrnProcvicovani(zaznamy: ZaznamProcvicovani[]): { temata: SouhrnTematu[]; posledni_aktivita: string | null } {
  const mapa = new Map<string, { k: string; s?: string; prikladu: number; spravne: number; sekund: number }>();
  let posledni: string | null = null;
  const pridej = (k: string, s: string | undefined, n: number, ok: number, sekund: number) => {
    const klic = s ? `${k}/${s}` : k;
    const x = mapa.get(klic) ?? { k, ...(s ? { s } : {}), prikladu: 0, spravne: 0, sekund: 0 };
    x.prikladu += n; x.spravne += ok; x.sekund += sekund;
    mapa.set(klic, x);
  };
  for (const z of zaznamy) {
    if (!posledni || z.kdy > posledni) posledni = z.kdy;
    const celkem = z.temata.reduce((a, t) => a + Math.max(0, t.n), 0);
    for (const t of z.temata) {
      const n = Math.max(0, Math.round(t.n)), ok = Math.min(n, Math.max(0, Math.round(t.ok)));
      if (n === 0) continue;
      const sekund = celkem > 0 ? (z.sekund * n) / celkem : 0;
      pridej(t.k, undefined, n, ok, sekund);
      if (t.s) pridej(t.k, t.s, n, ok, sekund);
    }
  }
  const vsechna = [...mapa.values()]
    .map(({ sekund, ...x }) => ({ ...x, minut: Math.round(sekund / 60) }))
    .sort((a, b) => b.prikladu - a.prikladu || a.k.localeCompare(b.k) || (a.s ?? "").localeCompare(b.s ?? ""));
  // Okruhy podle počtu příkladů, dovednosti hned za svým okruhem.
  const vysledek: SouhrnTematu[] = [];
  for (const o of vsechna.filter((t) => !t.s)) vysledek.push(o, ...vsechna.filter((t) => t.k === o.k && t.s));
  return { temata: vysledek, posledni_aktivita: posledni ? new Date(posledni).toISOString().replace(/\.\d{3}Z$/, "Z") : null };
}

/** Souhrn jednoho tréninku po tématech a dovednostech (zapisuje se po dokončení tréninku). */
export function temataTreninku(odpovedi: { tema: string; dovednost?: string; ok: boolean }[]): ZaznamProcvicovani["temata"] {
  const mapa = new Map<string, { k: string; s?: string; n: number; ok: number }>();
  for (const o of odpovedi) {
    if (!o.tema) continue;
    const klic = `${o.tema}/${o.dovednost ?? ""}`;
    const x = mapa.get(klic) ?? { k: o.tema, ...(o.dovednost ? { s: o.dovednost } : {}), n: 0, ok: 0 };
    x.n += 1; if (o.ok) x.ok += 1;
    mapa.set(klic, x);
  }
  return [...mapa.values()];
}
