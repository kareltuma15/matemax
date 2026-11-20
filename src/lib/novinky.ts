/**
 * Novinky pro žáky a návštěvníky (Karel 18. 11. 2026): na úvodní stránce i na Domově má být vidět,
 * co je nového a na co se těšit. Novinka je zápis v kronice (src/data/kronika-obsahu.json) s polem `novinka`.
 *
 *  • „Brzy“: novinka má `od` v budoucnu → odpočet.
 *  • „Nově“: od data nasazení (nebo `od`) 45 dní. Zápis bez data = hotové, čeká na nasazení (ukáže se jako Nově).
 */
import { KRONIKA, dnyMezi, type ZapisKroniky } from "./obsah-kronika";
import type { Trida } from "@/types";

/** Obrázek novinky: 3D Hexík (podoba a etapa), hotové 3D rendery z public/uvod, kalendář, combo, test. */
export type VizualNovinky = "hexik" | "kalendar" | "combo" | "truhla" | "truhla-vanocni" | "pokojicek" | "pokojicek-zakladni" | "medaile" | "test";

export interface Novinka {
  nadpis: string;
  text: string;
  vizual: VizualNovinky;
  /** U vizuálu „hexik“: která podoba a etapa 3D Hexíka. */
  podoba?: string;
  etapa?: number;
  /** Den startu (YYYY-MM-DD). Dřív = „Brzy“ s odpočtem. */
  od?: string;
  /** Kam vede tlačítko v appce. */
  odkaz?: string;
  /** Pro které třídy (bez = obě). */
  tridy?: Trida[];
}

export interface NovinkaVeStavu extends Novinka { stav: "nove" | "brzy"; dniDoStartu: number; klic: string }

const NOVE_DNI = 45;

export function novinky(den: string, trida?: Trida): NovinkaVeStavu[] {
  return (KRONIKA.zapisy as (ZapisKroniky & { novinka?: Novinka })[])
    .filter((z) => z.novinka && (!trida || !z.novinka.tridy || z.novinka.tridy.includes(trida)))
    .map((z) => {
      const n = z.novinka!;
      const start = n.od ?? z.datum;
      const dniDoStartu = start ? dnyMezi(den, start) : 0;
      const stav: "nove" | "brzy" = dniDoStartu > 0 ? "brzy" : "nove";
      return { ...n, stav, dniDoStartu, klic: `${n.od ?? z.datum ?? "ceka"}:${n.nadpis}`, _d: start };
    })
    .filter((n) => n.stav === "brzy" || !n._d || dnyMezi(n._d, den) <= NOVE_DNI)
    .map(({ _d, ...n }) => { void _d; return n; });
}

/**
 * Připravujeme (Karel 19. 11.): věci s domluveným měsícem, bez přesného data. Ukážou se za novinkami.
 * Až budou hotové, přesunou se do kroniky jako běžná novinka.
 */
export interface Pripravujeme { nadpis: string; text: string; mesic: string; podoba: string; etapa?: number }
export const PRIPRAVUJEME: Pripravujeme[] = [
  { nadpis: "Další pokojíčky", text: "Podmořský svět, kouzelnická věž a dódžó. Každý za jednu sadu.", mesic: "leden", podoba: "dracek", etapa: 4 },
  { nadpis: "Vzhledy appky ve 3D", text: "Živé pozadí s hloubkou a Hexík v rohu obrazovky.", mesic: "únor", podoba: "neon", etapa: 4 },
];
