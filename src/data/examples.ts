import rawData from "./databaze.json";
import cermatData from "./cermat-200.json";
import konstrukceData from "./konstrukce-interaktivni.json";
import doplnkyData from "./doplnky-uhly-souhrnne.json";
import { DBExample } from "@/types";

const db = rawData as { metadata: unknown; examples: DBExample[] };
const cermat = cermatData as { metadata: unknown; examples: DBExample[] };
const konstrukce = konstrukceData as { metadata: unknown; examples: DBExample[] };
const doplnky = doplnkyData as { metadata: unknown; examples: DBExample[] };

export const examples: DBExample[] = [
  ...db.examples, ...cermat.examples, ...konstrukce.examples, ...doplnky.examples,
];

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
  return examples.find((e) => e.id === id);
}

export function getExamplesByTema(tema: string): DBExample[] {
  return examples.filter((e) => e.tema === tema);
}

export const allTemas = [...new Set(examples.map((e) => e.tema))];
