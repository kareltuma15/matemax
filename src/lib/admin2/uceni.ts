/**
 * Učení v novém adminu (fáze B3, UC-01 až UC-06, UC-09, UC-10). Jediné místo, kde se z logu odpovědí (tabulka odpovedi,
 * od 26. 11. 2026) a karet opakování (sm2_cards) počítají čísla o učení. Používá ho sekce Učení, karta žáka i doporučení.
 *
 * Pravidla (UC-10):
 * - Úspěšnost = první pokus u všech, kdo úlohu začali (přeskočení se počítá jako neúspěch), ne jen u těch, kdo dokončili.
 * - Malý vzorek hlídá mala-cisla.ts; příznaky úloh mají minimální počet pokusů.
 * - Pořadí úlohy v sadě ovlivňuje výsledek: u úlohy ukazujeme průměrné pořadí.
 */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { temaLabel } from "@/types";
import { pragueDateStr } from "@/lib/date";
import type { Kontext } from "./data";
import type { Zak } from "./typy";
import { denZ, dnyMezi, posunDen, type DnyAktivity } from "./metriky";

export interface Odpoved {
  user_id: string; uloha_id: string; tema: string | null; dovednost: string | null; uroven: number | null; trida: number | null;
  rezim: string; poradi: number | null; pokus: number | null; spravne: boolean | null; spravne_napoprve: boolean | null;
  odpoved: string | null; cas_ms: number | null; napoveda: boolean; postup: boolean; preskoceno: boolean; created_at: string;
}
export interface Karta { user_id: string; example_id: string; interval: number; ease: number; next_review: string; repetitions: number; last_quality: number | null }

/** Výchozí prahy příznaků (UC-03, UC-05, UC-06). Vždy s počtem pokusů. */
export const PRAHY_UCENI = {
  podezrelaMinPokusu: 8,
  tezkaMinPokusu: 10, tezkaPodil: 30,
  lehkaMinPokusu: 10, lehkaPodil: 95, lehkaCasNasobek: 0.5,
  zdlouhavaMinPokusu: 5, zdlouhavaCasNasobek: 2,
  preskakovanaMinPokusu: 8, preskakovanaPodil: 30,
  tipovaniMs: 5000,
  zakPosledni: 20, zakLehkePodil: 90, zakTezkePodil: 50, zakTezkePreskoceno: 30, zakMinOdpovedi: 8,
  zapominaNeuspechu: 4,
} as const;

export const MERI_SE_OD = "2026-11-26";
/** Přijímačky 2027 (zadání Karla): čtyřleté obory 12. 4. (9. třída), víceleté 14. 4. (5. třída). */
export const PRIJIMACKY: Record<5 | 9, string> = { 9: "2027-04-12", 5: "2027-04-14" };

const median = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
const kvartily = (a: number[]) => { if (a.length < 4) return null; const s = [...a].sort((x, y) => x - y); return [s[Math.floor(s.length * 0.25)], s[Math.floor(s.length * 0.75)]] as const; };
const pct = (n: number, z: number) => (z ? Math.round((n / z) * 100) : null);

// ── Načítání ──

export class ChybiMigraceUceni extends Error {}

export async function nactiOdpovedi(k: Kontext, o: { od?: string; userId?: string; ulohaId?: string } = {}): Promise<Odpoved[]> {
  if (k.demo) return demoUceni().odpovedi.filter((r) => (!o.userId || r.user_id === o.userId) && (!o.ulohaId || r.uloha_id === o.ulohaId) && (!o.od || r.created_at >= o.od));
  if (!supabaseAdmin) return [];
  const out: Odpoved[] = [];
  for (let i = 0; i < 100_000; i += 1000) {
    let q = supabaseAdmin.from("odpovedi").select("user_id, uloha_id, tema, dovednost, uroven, trida, rezim, poradi, pokus, spravne, spravne_napoprve, odpoved, cas_ms, napoveda, postup, preskoceno, created_at").order("created_at", { ascending: true }).range(i, i + 999);
    if (o.od) q = q.gte("created_at", o.od);
    if (o.userId) q = q.eq("user_id", o.userId);
    if (o.ulohaId) q = q.eq("uloha_id", o.ulohaId);
    const { data, error } = await q;
    if (error) { if (/relation .*odpovedi|schema cache/i.test(error.message)) throw new ChybiMigraceUceni(error.message); throw new Error(error.message); }
    out.push(...((data ?? []) as Odpoved[]));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

export async function nactiKarty(k: Kontext, userId?: string): Promise<Karta[]> {
  if (k.demo) return demoUceni().karty.filter((c) => !userId || c.user_id === userId);
  if (!supabaseAdmin) return [];
  const out: Karta[] = [];
  for (let i = 0; i < 100_000; i += 1000) {
    let q = supabaseAdmin.from("sm2_cards").select("user_id, example_id, interval, ease, next_review, repetitions, last_quality").range(i, i + 999);
    if (userId) q = q.eq("user_id", userId);
    const { data, error } = await q;
    if (error) return out;
    out.push(...((data ?? []) as Karta[]));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

// ── První pokusy (UC-10) ──

/** První pokus každého žáka u každé úlohy (mimo opakování): základ úspěšnosti. */
export function prvniPokusy(odp: Odpoved[]): Odpoved[] {
  const videno = new Set<string>();
  const out: Odpoved[] = [];
  for (const r of odp) {
    if (r.rezim === "opakovani") continue;
    const k = `${r.user_id}|${r.uloha_id}`;
    if (videno.has(k)) continue;
    videno.add(k);
    out.push(r);
  }
  return out;
}
const uspech = (r: Odpoved) => !r.preskoceno && (r.spravne_napoprve ?? r.spravne) === true;

// ── Témata (UC-01) ──

export interface StatTematu { tema: string; nazev: string; trida: 5 | 9; zaci: string[]; odpovedi: number; prvni: number; spravne: number; uspesnost: number | null; medianMs: number | null; trend: number | null; trendZaklad: number }

export function statTemat(odp: Odpoved[], dnes = pragueDateStr()): StatTematu[] {
  const prvni = prvniPokusy(odp);
  const m = new Map<string, StatTematu & { casy: number[]; ted: [number, number]; pred: [number, number] }>();
  const hranice = posunDen(dnes, -13), hranice2 = posunDen(dnes, -27);
  for (const r of odp) {
    if (!r.tema) continue;
    const s = m.get(r.tema) ?? { tema: r.tema, nazev: temaLabel(r.tema), trida: (r.trida === 5 || r.tema.startsWith("p5_") ? 5 : 9) as 5 | 9, zaci: [], odpovedi: 0, prvni: 0, spravne: 0, uspesnost: null, medianMs: null, trend: null, trendZaklad: 0, casy: [], ted: [0, 0], pred: [0, 0] };
    s.odpovedi++;
    if (!s.zaci.includes(r.user_id)) s.zaci.push(r.user_id);
    if (r.cas_ms !== null && !r.preskoceno) s.casy.push(r.cas_ms);
    m.set(r.tema, s);
  }
  for (const r of prvni) {
    const s = r.tema ? m.get(r.tema) : undefined;
    if (!s) continue;
    s.prvni++; if (uspech(r)) s.spravne++;
    const d = denZ(r.created_at);
    if (d >= hranice) { s.ted[1]++; if (uspech(r)) s.ted[0]++; } else if (d >= hranice2) { s.pred[1]++; if (uspech(r)) s.pred[0]++; }
  }
  return [...m.values()].map(({ casy, ted, pred, ...s }) => ({
    ...s, uspesnost: pct(s.spravne, s.prvni), medianMs: median(casy),
    trend: ted[1] >= 10 && pred[1] >= 10 ? (pct(ted[0], ted[1])! - pct(pred[0], pred[1])!) : null, trendZaklad: Math.min(ted[1], pred[1]),
  })).sort((a, b) => (a.uspesnost ?? 101) - (b.uspesnost ?? 101));
}

// ── Úlohy (UC-03) ──

export type Priznak = "podezrela" | "tezka" | "lehka" | "zdlouhava" | "preskakovana";
export const NAZVY_PRIZNAKU: Record<Priznak, string> = { podezrela: "podezřelá", tezka: "moc těžká", lehka: "moc lehká", zdlouhava: "zdlouhavá", preskakovana: "přeskakovaná" };
export const POPISY_PRIZNAKU: Record<Priznak, string> = {
  podezrela: "Nejčastější špatná odpověď je stejně častá jako správná, nebo častější (aspoň 8 pokusů). Nejspíš chyba v klíči nebo nejasné zadání.",
  tezka: "Úspěšnost na první pokus pod 30 % (aspoň 10 pokusů).",
  lehka: "Úspěšnost nad 95 % a medián času pod polovinou mediánu tématu (aspoň 10 pokusů).",
  zdlouhava: "Medián času přes dvojnásobek mediánu tématu (aspoň 5 pokusů).",
  preskakovana: "Víc než 30 % žáků úlohu přeskočilo (aspoň 8 pokusů).",
};

export interface StatUlohy {
  uloha_id: string; tema: string | null; nazevTematu: string; uroven: number | null; trida: 5 | 9; pokusy: number; zaci: number; spravne: number;
  uspesnost: number | null; medianMs: number | null; kvartilyMs: readonly [number, number] | null; preskoceno: number; napoveda: number;
  spatna: { odpoved: string; pocet: number } | null; spravnaPocet: number; tipovani: number; spatnych: number; poradi: number | null; priznaky: Priznak[];
}

export function statUloh(odp: Odpoved[]): StatUlohy[] {
  const prvni = prvniPokusy(odp);
  const medTematu = new Map<string, number>();
  const casyTematu = new Map<string, number[]>();
  for (const r of prvni) if (r.tema && r.cas_ms !== null && !r.preskoceno) casyTematu.set(r.tema, [...(casyTematu.get(r.tema) ?? []), r.cas_ms]);
  for (const [t, c] of casyTematu) medTematu.set(t, median(c) ?? 0);
  const m = new Map<string, Odpoved[]>();
  for (const r of prvni) m.set(r.uloha_id, [...(m.get(r.uloha_id) ?? []), r]);
  const P = PRAHY_UCENI;
  return [...m].map(([id, rr]) => {
    const pokusy = rr.length;
    const spravne = rr.filter(uspech).length;
    const casy = rr.filter((r) => r.cas_ms !== null && !r.preskoceno).map((r) => r.cas_ms!);
    const spatne = rr.filter((r) => !r.preskoceno && !uspech(r));
    const odpovedi = new Map<string, number>();
    for (const r of spatne) if (r.odpoved) odpovedi.set(r.odpoved, (odpovedi.get(r.odpoved) ?? 0) + 1);
    const top = [...odpovedi].sort((a, b) => b[1] - a[1])[0];
    const preskoceno = rr.filter((r) => r.preskoceno).length;
    const med = median(casy);
    const medT = rr[0].tema ? medTematu.get(rr[0].tema) ?? null : null;
    const u = pct(spravne, pokusy);
    const priznaky: Priznak[] = [];
    if (pokusy >= P.podezrelaMinPokusu && top && top[1] >= spravne) priznaky.push("podezrela");
    if (pokusy >= P.tezkaMinPokusu && u !== null && u < P.tezkaPodil) priznaky.push("tezka");
    if (pokusy >= P.lehkaMinPokusu && u !== null && u > P.lehkaPodil && med !== null && medT && med < medT * P.lehkaCasNasobek) priznaky.push("lehka");
    if (pokusy >= P.zdlouhavaMinPokusu && med !== null && medT && med > medT * P.zdlouhavaCasNasobek) priznaky.push("zdlouhava");
    if (pokusy >= P.preskakovanaMinPokusu && pct(preskoceno, pokusy)! > P.preskakovanaPodil) priznaky.push("preskakovana");
    const poradi = rr.filter((r) => r.poradi !== null);
    return {
      uloha_id: id, tema: rr[0].tema, nazevTematu: rr[0].tema ? temaLabel(rr[0].tema) : "?", uroven: rr[0].uroven, trida: (rr[0].trida === 5 ? 5 : 9) as 5 | 9,
      pokusy, zaci: new Set(rr.map((r) => r.user_id)).size, spravne, uspesnost: u, medianMs: med, kvartilyMs: kvartily(casy),
      preskoceno, napoveda: rr.filter((r) => r.napoveda).length, spatna: top ? { odpoved: top[0], pocet: top[1] } : null, spravnaPocet: spravne,
      tipovani: spatne.filter((r) => r.cas_ms !== null && r.cas_ms < P.tipovaniMs).length, spatnych: spatne.length,
      poradi: poradi.length ? Math.round((poradi.reduce((s, r) => s + (r.poradi ?? 0), 0) / poradi.length) * 10) / 10 : null, priznaky,
    };
  }).sort((a, b) => b.priznaky.length - a.priznaky.length || b.pokusy - a.pokusy);
}

// ── Žáci × témata (UC-02) a žák (UC-05) ──

export interface Bunka { odpovedi: number; uspesnost: number | null }
export function mrizka(odp: Odpoved[]): { temata: string[]; radky: Map<string, Map<string, Bunka>> } {
  const prvni = prvniPokusy(odp);
  const radky = new Map<string, Map<string, Bunka & { ok: number }>>();
  const pocty = new Map<string, number>();
  for (const r of prvni) {
    if (!r.tema) continue;
    pocty.set(r.tema, (pocty.get(r.tema) ?? 0) + 1);
    const z = radky.get(r.user_id) ?? new Map();
    const b = z.get(r.tema) ?? { odpovedi: 0, uspesnost: null, ok: 0 };
    b.odpovedi++; if (uspech(r)) b.ok++;
    b.uspesnost = pct(b.ok, b.odpovedi);
    z.set(r.tema, b); radky.set(r.user_id, z);
  }
  return { temata: [...pocty].sort((a, b) => b[1] - a[1]).map(([t]) => t), radky };
}

export interface TemaZaka { tema: string; nazev: string; odpovedi: number; uspesnost: number | null; posledni: { n: number; spravne: number; preskoceno: number; medianMs: number | null }; obtiznost: "lehke" | "tezke" | null; trend: number | null }

/** Témata žáka s obtížností z posledních 20 odpovědí (UC-05). medianOstatnich = medián času ostatních žáků v tématu. */
export function tematZaka(odpZaka: Odpoved[], odpVsech: Odpoved[]): TemaZaka[] {
  const P = PRAHY_UCENI;
  const casOstatnich = new Map<string, number[]>();
  for (const r of odpVsech) if (r.tema && r.user_id !== odpZaka[0]?.user_id && r.cas_ms !== null && !r.preskoceno) casOstatnich.set(r.tema, [...(casOstatnich.get(r.tema) ?? []), r.cas_ms]);
  const podle = new Map<string, Odpoved[]>();
  for (const r of odpZaka) if (r.tema && r.rezim !== "opakovani") podle.set(r.tema, [...(podle.get(r.tema) ?? []), r]);
  return [...podle].map(([tema, rr]) => {
    const prvni = prvniPokusy(rr);
    const posl = rr.slice(-P.zakPosledni);
    const ok = posl.filter((r) => !r.preskoceno && r.spravne === true).length;
    const presk = posl.filter((r) => r.preskoceno).length;
    const med = median(posl.filter((r) => r.cas_ms !== null && !r.preskoceno).map((r) => r.cas_ms!));
    const medO = median(casOstatnich.get(tema) ?? []);
    let obtiznost: TemaZaka["obtiznost"] = null;
    if (posl.length >= P.zakMinOdpovedi) {
      if (pct(ok, posl.length)! > P.zakLehkePodil && med !== null && (medO === null || med < medO)) obtiznost = "lehke";
      else if (pct(ok, posl.length)! < P.zakTezkePodil || pct(presk, posl.length)! > P.zakTezkePreskoceno) obtiznost = "tezke";
    }
    const pul = Math.floor(prvni.length / 2);
    const trend = prvni.length >= 10 ? pct(prvni.slice(pul).filter(uspech).length, prvni.length - pul)! - pct(prvni.slice(0, pul).filter(uspech).length, pul)! : null;
    return { tema, nazev: temaLabel(tema), odpovedi: rr.length, uspesnost: pct(prvni.filter(uspech).length, prvni.length), posledni: { n: posl.length, spravne: ok, preskoceno: presk, medianMs: med }, obtiznost, trend };
  }).sort((a, b) => (a.uspesnost ?? 101) - (b.uspesnost ?? 101));
}

// ── Opakování (UC-06) ──

export interface StavOpakovani { karet: number; naRade: number; poTerminu: number; uspesnost: number | null; opakovani: number; prumerEase: number | null; intervaly: { nazev: string; pocet: number }[]; zapomina: { user_id: string; uloha_id: string; neuspechu: number }[] }

export function opakovani(karty: Karta[], odp: Odpoved[], dnes = pragueDateStr()): StavOpakovani {
  const naRade = karty.filter((c) => c.next_review && c.next_review.slice(0, 10) <= dnes).length;
  const poTerminu = karty.filter((c) => c.next_review && c.next_review.slice(0, 10) < dnes).length;
  const op = odp.filter((r) => r.rezim === "opakovani" && !r.preskoceno);
  const kos = [["1 den", 0, 1], ["2–6 dní", 2, 6], ["7–20 dní", 7, 20], ["21+ dní", 21, 100000]] as const;
  const neusp = new Map<string, number>();
  for (const r of op) if (r.spravne === false) neusp.set(`${r.user_id}|${r.uloha_id}`, (neusp.get(`${r.user_id}|${r.uloha_id}`) ?? 0) + 1);
  return {
    karet: karty.length, naRade, poTerminu, opakovani: op.length, uspesnost: pct(op.filter((r) => r.spravne).length, op.length),
    prumerEase: karty.length ? Math.round((karty.reduce((s, c) => s + Number(c.ease || 0), 0) / karty.length) * 100) / 100 : null,
    intervaly: kos.map(([nazev, a, b]) => ({ nazev, pocet: karty.filter((c) => c.interval >= a && c.interval <= b).length })),
    zapomina: [...neusp].filter(([, n]) => n >= PRAHY_UCENI.zapominaNeuspechu).map(([k, n]) => { const [user_id, uloha_id] = k.split("|"); return { user_id, uloha_id, neuspechu: n }; }).sort((a, b) => b.neuspechu - a.neuspechu),
  };
}

// ── Připravenost (UC-09) ──

export interface Pripravenost { dniDo: number; tydnuDo: number; tempo: number; slaba: { tema: string; nazev: string; podil: number }[]; netrenovanaSlaba: string[]; pozadu: boolean; vysvetleni: string }

/**
 * Pravidlo „pozadu“ (návrh, upravitelné): každé slabé téma (pod 60 % bodů v odhadu) potřebuje aspoň 3 dny tréninku.
 * Pozadu = slabých témat × 3 > zbývající týdny × tempo (dny tréninku za týden, průměr posledních 14 dní).
 */
export function pripravenost(z: Zak, dny: DnyAktivity, temataOdhadu: { tema: string; label: string; body: number; max: number }[], trenovanaTemata: Set<string>, dnes = pragueDateStr()): Pripravenost {
  const dniDo = Math.max(0, dnyMezi(dnes, PRIJIMACKY[z.trida]));
  const tydnuDo = Math.max(0, Math.floor(dniDo / 7));
  let d14 = 0; for (const d of dny.get(z.id) ?? []) if (dnyMezi(d, dnes) < 14 && dnyMezi(d, dnes) >= 0) d14++;
  const tempo = Math.round((d14 / 2) * 10) / 10;
  const slaba = temataOdhadu.filter((t) => t.max > 0 && t.body / t.max < 0.6).map((t) => ({ tema: t.tema, nazev: t.label, podil: Math.round((t.body / t.max) * 100) }));
  const potreba = slaba.length * 3;
  const pozadu = slaba.length > 0 && potreba > tydnuDo * tempo;
  return {
    dniDo, tydnuDo, tempo, slaba, netrenovanaSlaba: slaba.filter((s) => !trenovanaTemata.has(s.tema)).map((s) => s.nazev), pozadu,
    vysvetleni: `${slaba.length} slabých témat × 3 dny tréninku = ${potreba} dní; do přijímaček ${tydnuDo} týdnů × tempo ${tempo.toLocaleString("cs-CZ")} dne za týden = ${Math.round(tydnuDo * tempo)} dní.`,
  };
}

// ── Demo ──

let demoCache: { den: string; d: { odpovedi: Odpoved[]; karty: Karta[] } } | null = null;
const TEMATA_DEMO: [string, string[]][] = [["zlomky", ["ZLO1_03", "ZLO2_09", "ZLO2_14", "ZLO3_02"]], ["slovni_ulohy", ["SLO2_01", "SLO3_06"]], ["vyrazy", ["VYR1_31", "VYR2_04", "VYR2_11"]], ["uhly", ["UHN1_05", "UHN2_02"]], ["p5_zlomky", ["P5ZLO1_02", "P5ZLO2_07"]]];

export function demoUceni() {
  const den = pragueDateStr();
  if (demoCache?.den === den) return demoCache.d;
  let s = 20261128 >>> 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const ted = Date.now();
  const odpovedi: Odpoved[] = [];
  const karty: Karta[] = [];
  const uid = (i: number) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
  for (let zi = 0; zi < 16; zi++) {
    const schopnost = 0.35 + r() * 0.6;
    const p5 = zi % 4 === 1;
    for (const [tema, ulohy] of TEMATA_DEMO) {
      if (p5 !== tema.startsWith("p5_")) continue;
      if (r() < 0.25) continue;
      const tezka = tema === "zlomky" ? 0.2 : tema === "slovni_ulohy" ? 0.12 : 0;
      for (const [ui, uloha] of ulohy.entries()) {
        const kolikrat = 1 + Math.floor(r() * 3);
        for (let p = 0; p < kolikrat; p++) {
          const kdy = new Date(ted - Math.floor(r() * 26) * 86400000 - Math.floor(r() * 8) * 3600000).toISOString();
          const presk = uloha === "SLO3_06" ? r() < 0.45 : r() < 0.06;
          const ok = !presk && r() < schopnost - tezka - (uloha === "ZLO2_14" ? 0.25 : 0);
          const spatna = uloha === "ZLO2_14" ? (r() < 0.7 ? "0,75" : "6/8") : String(Math.floor(r() * 30));
          odpovedi.push({
            user_id: uid(zi), uloha_id: uloha, tema, dovednost: null, uroven: Number(uloha.match(/(\d)_/)?.[1] ?? 2), trida: p5 ? 5 : 9, rezim: p > 0 && r() < 0.5 ? "opakovani" : "trenink",
            poradi: ui + 1, pokus: p + 1, spravne: presk ? null : ok, spravne_napoprve: presk ? null : ok, odpoved: presk ? null : ok ? "správně" : spatna,
            cas_ms: Math.round((uloha === "SLO3_06" ? 150000 : 40000) * (0.4 + r() * 1.4)), napoveda: r() < 0.15, postup: r() < 0.1, preskoceno: presk, created_at: kdy,
          });
        }
        karty.push({ user_id: uid(zi), example_id: uloha, interval: [1, 3, 6, 12, 25][Math.floor(r() * 5)], ease: Math.round((1.8 + r() * 0.9) * 100) / 100, next_review: posunDen(den, Math.floor(r() * 10) - 4), repetitions: 1 + Math.floor(r() * 4), last_quality: Math.floor(r() * 6) });
      }
    }
  }
  odpovedi.sort((a, b) => a.created_at.localeCompare(b.created_at));
  const d = { odpovedi, karty };
  demoCache = { den, d };
  return d;
}
