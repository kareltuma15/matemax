/**
 * Odhad bodů u přijímaček: kolik by žák teď získal z 50 bodů a jak se posouvá.
 *
 * Připravenost v tématu (0–100, skoreTematu z tréninku a diagnostiky) × kolik bodů za téma
 * bývá v testu. Je to orientační odhad, ne předpověď; appka to žákovi i rodiči říká.
 *
 * Historie: jeden záznam denně v localStorage (matemax-odhad-historie). Když žádná není,
 * dopočítá se zpětně ze záznamů tréninků za posledních 8 týdnů (jen tam, kde záznamy sahají).
 */
import { loadGamification } from "./gamification";
import { skoreTematu } from "./readiness";
import { localSaveOdhad, localLoadOdhady, type OdhadZaznam } from "./odhad-historie";
import { localLoadSessions } from "./storage";
import { localDateStr } from "./date";
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

function nactiDiag(): Pocty {
  try { return JSON.parse(localStorage.getItem("matemax-diag-results") ?? "{}") as Pocty; } catch { return {}; }
}

export interface Vyvoj {
  odhad: Odhad;
  /** Odhad na konci každého z posledních 8 týdnů (nejstarší první, poslední = dnes); null = nejsou data. */
  tydny: (number | null)[];
  /** Změna celkového odhadu za 14 dní (null = zatím není s čím srovnat). */
  zmena14: number | null;
  /** Změna bodů po tématech za 14 dní. */
  zmenaTemat: Record<string, number | null>;
}

const DEN = 86400000;

/** Odhad pro přihlášeného žáka v prohlížeči: spočítá dnešek, uloží ho do historie a vrátí i vývoj. */
export function nactiVyvoj(trida: Trida, ted: Date = new Date()): Vyvoj {
  const stats = loadGamification().topicStats;
  const diag = nactiDiag();
  const odhad = spocitejOdhad(trida, stats, diag);

  let historie = localLoadOdhady(trida);
  if (historie.length === 0 && !odhad.bezDat) historie = zpetnyOdhad(trida, stats, diag, ted);
  const dnes: OdhadZaznam = { d: localDateStr(ted), b: odhad.celkem, t: Object.fromEntries(odhad.temata.map((t) => [t.tema, t.body])) };
  if (!odhad.bezDat) historie = localSaveOdhad(trida, dnes, historie);

  // Záznam platný k danému dni = poslední záznam s datem ≤ ten den.
  const kDni = (dny: number): OdhadZaznam | null => {
    const hranice = localDateStr(new Date(ted.getTime() - dny * DEN));
    let nalez: OdhadZaznam | null = null;
    for (const z of historie) if (z.d <= hranice && (!nalez || z.d > nalez.d)) nalez = z;
    return nalez;
  };
  const tydny = Array.from({ length: 8 }, (_, i) => (i === 7 ? (odhad.bezDat ? null : odhad.celkem) : kDni((7 - i) * 7)?.b ?? null));
  const pred14 = kDni(14) ?? null;
  return {
    odhad,
    tydny,
    zmena14: pred14 ? odhad.celkem - pred14.b : null,
    zmenaTemat: Object.fromEntries(odhad.temata.map((t) => [t.tema, pred14 ? Math.round((t.body - (pred14.t[t.tema] ?? 0)) * 10) / 10 : null])),
  };
}

/**
 * Zpětný odhad z historie tréninků: od dnešních počtů odečte tréninky po daném dni.
 * Trénink s více tématy se rozdělí rovným dílem. Kde historie tréninků nesahá dost daleko
 * (ukládá se posledních 50), týden se vynechá, ať graf neukazuje vymyšlený vývoj.
 */
function zpetnyOdhad(trida: Trida, stats: Pocty, diag: Pocty, ted: Date): OdhadZaznam[] {
  const vahy = BODY_TEMAT[trida];
  const sezeni = localLoadSessions();
  if (sezeni.length === 0) return [];
  const nejstarsi = sezeni.reduce((a, s) => (s.date < a ? s.date : a), sezeni[0].date);
  const plnaHistorie = sezeni.length < 50;
  const out: OdhadZaznam[] = [];
  for (let tyden = 8; tyden >= 1; tyden--) {
    const den = localDateStr(new Date(ted.getTime() - tyden * 7 * DEN));
    if (!plnaHistorie && den < nejstarsi) continue;
    const kopie: Pocty = {};
    for (const [t, v] of Object.entries(stats)) kopie[t] = { ...v };
    for (const s of sezeni) {
      if (s.date <= den) continue;
      const temata = s.temas.filter((t) => t in vahy);
      if (temata.length === 0) continue;
      for (const t of temata) {
        const k = kopie[t] ?? { correct: 0, total: 0 };
        kopie[t] = { correct: Math.max(0, k.correct - s.correct / temata.length), total: Math.max(0, k.total - s.total / temata.length) };
      }
    }
    const o = spocitejOdhad(trida, kopie, diag);
    out.push({ d: den, b: o.celkem, t: Object.fromEntries(o.temata.map((x) => [x.tema, x.body])) });
  }
  return out;
}
