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
import { localSaveOdhad, localLoadOdhady, type OdhadZaznam } from "./odhad-historie";
import { localLoadSessions } from "./storage";
import { localDateStr } from "./date";
import type { Trida } from "@/types";

export { MAX_BODU, BODY_TEMAT, spocitejOdhad } from "./odhad-vypocet";
export type { BodyTematu, Odhad } from "./odhad-vypocet";
import { spocitejOdhad, BODY_TEMAT, type Odhad } from "./odhad-vypocet";

type Pocty = Record<string, { correct: number; total: number }>;

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
