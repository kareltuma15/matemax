import rawData from "./databaze.json";
import cermatData from "./cermat-200.json";
import konstrukceData from "./konstrukce-interaktivni.json";
import doplnkyData from "./doplnky-uhly-souhrnne.json";
import data5Raw from "./databaze-5.json";
import { DBExample, Trida } from "@/types";

const db = rawData as { metadata: unknown; examples: DBExample[] };
const cermat = cermatData as { metadata: unknown; examples: DBExample[] };
const konstrukce = konstrukceData as { metadata: unknown; examples: DBExample[] };
const doplnky = doplnkyData as { metadata: unknown; examples: DBExample[] };

/** Úlohy 9. třídy (původní databáze). Úlohy 5. třídy jsou odděleně v examples5, aby se nikdy nepromíchaly. */
/**
 * Úlohy se stejným id se sloučí (zůstane první). Dřív měl soubor doplnků 8 starších úloh se stejnými id
 * jako novější úlohy s obrázkem; vyhledávání podle id stejně vždy vrátilo tu první, takže ty starší jen
 * zdvojovaly losování.
 */
function unikatni(list: DBExample[]): DBExample[] {
  const videno = new Set<string>();
  return list.filter((e) => (videno.has(e.id) ? false : (videno.add(e.id), true)));
}

export const examples: DBExample[] = unikatni([
  ...db.examples, ...cermat.examples, ...konstrukce.examples, ...doplnky.examples,
]);

const data5 = data5Raw as { metadata: unknown; examples: DBExample[] };
/** Úlohy 5. třídy (témata s předponou p5_). */
export const examples5: DBExample[] = data5.examples.map((e) => ({ ...e, trida: 5 as const }));

/** Všechny úlohy obou tříd — jen pro hledání podle id (uložené sezení, rodičovský přehled). Na losování se nehodí. */
export const allExamples: DBExample[] = [...examples, ...examples5];

/** Úlohy pro danou třídu — z nich se vždy losuje. */
export function examplesFor(trida: Trida): DBExample[] {
  return trida === 5 ? examples5 : examples;
}

/**
 * Úloha, kterou lze zobrazit jako zadání + políčko pro odpověď. Úlohy s obrázkem, výběrem A–E, krokovou nebo rýsovací
 * konstrukcí a porovnáním potřebují vlastní kartu (PracticeCard/MoznostiCard/…) — stránky, které mají jen text + políčko
 * (denní výzva, boss battle, rychlý mód, CERMAT test), z nich proto nesmí losovat.
 */
export function isPlainTyped(e: DBExample): boolean {
  return !e.image && !(e.moznosti && e.moznosti.length > 0) && !(e.kroky_volby && e.kroky_volby.length > 0) && !e.porovnani && !e.konstrukce_scena;
}

export const plainExamples: DBExample[] = examples.filter(isPlainTyped);

export function getExampleById(id: string): DBExample | undefined {
  return allExamples.find((e) => e.id === id);
}

export function plainExamplesFor(trida: Trida): DBExample[] {
  return examplesFor(trida).filter(isPlainTyped);
}

export function getExamplesByTema(tema: string): DBExample[] {
  return examples.filter((e) => e.tema === tema);
}

export const allTemas = [...new Set(examples.map((e) => e.tema))];
