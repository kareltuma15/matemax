/**
 * Plán (fáze B4, PL-05 až PL-08): týden v kostce, kronika změn s vyhodnocením, kalendář a shrnutí pro Clauda.
 * Čísla počítá metriky.ts (stejné definice jako dlaždice na Dnes a pondělní report), lidé jen pseudonymně.
 */
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { KRONIKA, type ZapisKroniky } from "@/lib/obsah-kronika";
import { dalsiSezona } from "@/lib/obsah";
import { pragueDateStr } from "@/lib/date";
import { DEFINICE, lideMetriky, posunDen, dnyMezi, type DnyAktivity, type MetrikaId } from "./metriky";
import { srovnani } from "./mala-cisla";
import type { Zak } from "./typy";
import type { Kontext } from "./data";
import type { Doporuceni } from "./doporuceni";

// ── Týden v kostce (PL-06) ──

/** Poslední celý kalendářní týden (pondělí–neděle) a ten před ním. */
export function minulyTyden(dnes = pragueDateStr()): { od: string; do: string; predOd: string; predDo: string } {
  const den = new Date(dnes + "T12:00:00Z").getUTCDay(); // 0 = neděle
  const nedele = posunDen(dnes, -(den === 0 ? 7 : den));
  return { od: posunDen(nedele, -6), do: nedele, predOd: posunDen(nedele, -13), predDo: posunDen(nedele, -7) };
}

export interface ZmenaTydne { id: MetrikaId; nazev: string; ted: number; pred: number; text: string; lide: string[] }

export function tydenVKostce(zaci: Zak[], dny: DnyAktivity, dnes = pragueDateStr()) {
  const t = minulyTyden(dnes);
  const zmeny: ZmenaTydne[] = (["pravidelni", "novi", "aktivovani", "platici", "testy"] as MetrikaId[]).map((id) => {
    const a = lideMetriky(id, zaci, dny, t.od, t.do), b = lideMetriky(id, zaci, dny, t.predOd, t.predDo);
    const ted = a.lide.length, pred = b.lide.length;
    const text = id === "aktivovani" ? `${ted} z ${a.zaklad.length} (minule ${pred} z ${b.zaklad.length})` : `${ted} (${srovnani(ted, pred).text ?? `minule ${pred}`})`;
    return { id, nazev: DEFINICE[id].nazev, ted, pred, text, lide: a.lide };
  });
  // Trénovali v týdnu (aspoň 1 den), pro souhrn
  let trenovali = 0, dniTreninku = 0;
  for (const z of zaci) { let n = 0; for (const d of dny.get(z.id) ?? []) if (d >= t.od && d <= t.do) n++; if (n) { trenovali++; dniTreninku += n; } }
  return { ...t, zmeny: zmeny.sort((x, y) => Math.abs(y.ted - y.pred) - Math.abs(x.ted - x.pred)), trenovali, dniTreninku };
}

// ── Kronika změn a experimentů (PL-05) ──

export interface Experiment { proc: string; sledovat: "dny_tydne" | "aktivace" | "navrat"; vyhodnotit: string }
export const NAZVY_SLEDOVANI: Record<Experiment["sledovat"], string> = {
  dny_tydne: "Dny tréninku za týden (stejní žáci 14 dní před a po)",
  aktivace: "Aktivace nových žáků (14 dní před a po)",
  navrat: "Návrat druhý den u nových žáků (14 dní před a po)",
};
export const klicZapisu = (z: ZapisKroniky) => `${z.datum ?? "x"}:${z.popis.slice(0, 40)}`;

export const nactiExperimenty = cache(async (demo: boolean): Promise<Record<string, Experiment>> => {
  if (demo) {
    const z = KRONIKA.zapisy.find((x) => x.datum && x.oblast === "odmeny");
    return z ? { [klicZapisu(z)]: { proc: "Žáci se po prvním tréninku nevracejí.", sledovat: "dny_tydne", vyhodnotit: posunDen(z.datum!, 14) } } : {};
  }
  if (!supabaseAdmin) return {};
  const { data } = await supabaseAdmin.from("admin_nastaveni").select("hodnota").eq("klic", "kronika_experimenty").maybeSingle();
  return (data?.hodnota ?? {}) as Record<string, Experiment>;
});

export interface Vyhodnoceni { pred: string; po: string; zakladPred: number; zakladPo: number; malyVzorek: boolean; zaver: string; hotovo: boolean }

/** Čísla před a po změně. U dnů tréninku stejní žáci (aktivní v obou obdobích), u aktivace a návratu noví žáci v obdobích. */
export function vyhodnot(datum: string, e: Experiment, zaci: Zak[], dny: DnyAktivity, dnes = pragueDateStr()): Vyhodnoceni {
  const predOd = posunDen(datum, -14), predDo = posunDen(datum, -1), poOd = datum, poDo = posunDen(datum, 13);
  const hotovo = dnes > poDo;
  const doo = hotovo ? poDo : dnes;
  if (e.sledovat === "dny_tydne") {
    const pocet = (id: string, a: string, b: string) => { let n = 0; for (const d of dny.get(id) ?? []) if (d >= a && d <= b) n++; return n; };
    const stejni = zaci.filter((z) => z.registrace.slice(0, 10) < predOd && pocet(z.id, predOd, predDo) > 0);
    const tydnu = Math.max(1, (dnyMezi(poOd, doo) + 1) / 7);
    const pred = stejni.reduce((s, z) => s + pocet(z.id, predOd, predDo), 0) / Math.max(1, stejni.length) / 2;
    const po = stejni.reduce((s, z) => s + pocet(z.id, poOd, doo), 0) / Math.max(1, stejni.length) / tydnu;
    const f = (x: number) => x.toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
    return { pred: `${f(pred)} dne za týden`, po: `${f(po)} dne za týden`, zakladPred: stejni.length, zakladPo: stejni.length, malyVzorek: stejni.length < 30, hotovo,
      zaver: stejni.length ? `${stejni.length} ${stejni.length === 1 ? "žák trénoval" : "žáků trénovalo"} před změnou: průměrně ${f(pred)} → ${f(po)} dne za týden${hotovo ? "" : " (zatím neúplné období)"}.` : "Před změnou nikdo netrénoval, není s čím srovnat." };
  }
  const id: MetrikaId = "aktivovani";
  const a = lideMetriky(id, zaci, dny, predOd, predDo), b = lideMetriky(id, zaci, dny, poOd, doo);
  if (e.sledovat === "aktivace") {
    return { pred: `${a.lide.length} z ${a.zaklad.length}`, po: `${b.lide.length} z ${b.zaklad.length}`, zakladPred: a.zaklad.length, zakladPo: b.zaklad.length, malyVzorek: a.zaklad.length + b.zaklad.length < 30, hotovo,
      zaver: `Aktivace ${a.lide.length} z ${a.zaklad.length} před změnou, ${b.lide.length} z ${b.zaklad.length} po ní${hotovo ? "" : " (zatím neúplné období)"}.` };
  }
  const navrat = (lide: string[]) => zaci.filter((z) => lide.includes(z.id) && z.vratil_2den).length;
  return { pred: `${navrat(a.zaklad)} z ${a.zaklad.length}`, po: `${navrat(b.zaklad)} z ${b.zaklad.length}`, zakladPred: a.zaklad.length, zakladPo: b.zaklad.length, malyVzorek: a.zaklad.length + b.zaklad.length < 30, hotovo,
    zaver: `Návrat 2. den ${navrat(a.zaklad)} z ${a.zaklad.length} před změnou, ${navrat(b.zaklad)} z ${b.zaklad.length} po ní${hotovo ? "" : " (zatím neúplné období)"}.` };
}

// ── Kalendář (PL-08) ──

export interface Udalost { datum: string; nazev: string; druh: "sezona" | "test" | "skola" | "prijimacky" }

/** Pevné termíny přijímacího řízení 2027 (zadání Karla). Testy nanečisto se berou z dat, ne natvrdo. */
const PEVNE: Udalost[] = [
  { datum: "2027-02-01", nazev: "Přihlášky na střední školy (od 1. 2.)", druh: "skola" },
  { datum: "2027-04-12", nazev: "Přijímačky: čtyřleté obory (12.–13. 4.)", druh: "prijimacky" },
  { datum: "2027-04-14", nazev: "Přijímačky: víceletá gymnázia (14.–15. 4.)", druh: "prijimacky" },
  { datum: "2027-05-15", nazev: "Výsledky přijímaček", druh: "prijimacky" },
];

export async function kalendar(k: Kontext, dnes = pragueDateStr()): Promise<Udalost[]> {
  const out: Udalost[] = PEVNE.filter((u) => u.datum >= dnes);
  const s = dalsiSezona(dnes);
  if (s) out.push({ datum: s.datum, nazev: `Sezóna v appce: ${s.nazev}`, druh: "sezona" });
  if (!k.demo && supabaseAdmin) {
    const { data } = await supabaseAdmin.from("online_test_sessions").select("title, scheduled_at, is_published").gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(10);
    for (const t of data ?? []) out.push({ datum: pragueDateStr(new Date(t.scheduled_at as string)), nazev: `${t.title as string}${t.is_published ? "" : " (nezveřejněno)"}`, druh: "test" });
  }
  return out.sort((a, b) => a.datum.localeCompare(b.datum)).slice(0, 12);
}

// ── Kopírovat pro Clauda (PL-07) ──

/** Shrnutí týdne v markdownu. Žáci jen jako Žák 1, Žák 2…, bez jmen, e-mailů a ID. */
export function shrnutiProClauda(t: ReturnType<typeof tydenVKostce>, dop: Doporuceni[], cile: { nazev: string; hodnota: number | null; od: number; az: number; doKdy: string }[], extra: string[] = []): string {
  const cislo = new Map<string, number>();
  const zak = (id: string) => { if (!cislo.has(id)) cislo.set(id, cislo.size + 1); return `Žák ${cislo.get(id)}`; };
  const d = (x: string) => new Date(x + "T12:00:00").toLocaleDateString("cs-CZ");
  return [
    `# MateMax: týden ${d(t.od)} až ${d(t.do)}`,
    "",
    "## Čísla (stejné definice jako v adminu)",
    ...t.zmeny.map((z) => `- ${z.nazev}: ${z.text}`),
    `- Trénovalo aspoň 1 den: ${t.trenovali} žáků, celkem ${t.dniTreninku} dní tréninku`,
    "",
    "## Doporučení z adminu",
    ...(dop.length ? dop.slice(0, 7).map((x) => `- ${x.titulek}${x.lide.length ? ` (${x.lide.slice(0, 5).map(zak).join(", ")}${x.lide.length > 5 ? "…" : ""})` : ""}: ${x.proc}`) : ["- nic nečeká"]),
    "",
    "## Cíle sezóny",
    ...cile.map((c) => `- ${c.nazev}: ${c.hodnota ?? "neměří se"} z ${c.od}–${c.az} do ${d(c.doKdy)}`),
    ...(extra.length ? ["", "## Další", ...extra] : []),
    "",
    "Pozn.: malá čísla, procenta jen orientačně. Žáci jsou pseudonymy, bez osobních údajů.",
  ].join("\n");
}
