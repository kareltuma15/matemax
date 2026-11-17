/**
 * Boss týdne: těžký testový příklad ve stylu CERMAT (3. úroveň, „testové“), stejný pro všechny žáky
 * jedné třídy po celý týden (od pondělí). Jeden pokus za týden, výhra = trofej a +100 krystalů.
 */
import { allExamples } from "@/data/examples";
import type { DBExample, Trida } from "@/types";
import { vyberBosse } from "./sbirka";

export function kandidatiNaBosse(trida: Trida): DBExample[] {
  return allExamples.filter((e) =>
    (trida === 5 ? e.tema.startsWith("p5_") : !e.tema.startsWith("p5_")) &&
    e.obtiznost === 3 &&
    e.dovednost === "testove" &&
    !e.konstrukce_scena && !e.kroky_volby?.length,
  );
}

export function bossTydne(trida: Trida, den: string): DBExample | null {
  return vyberBosse(kandidatiNaBosse(trida), den);
}
