/**
 * Domovy Hexíka: 3D pokojíčky v kvalitě Hexíka (Karel 19.–20. 11. 2026). Základní Hexíkův pokojíček
 * má každý zdarma, další pokoje se odemykají za dokončené sady. Hexík v nich sám dělá kouzla, tabule
 * vede do tréninku a skříň do šatníku. Scény se načítají až v prohlížeči (dynamický import).
 */
import type { SlotyHexika } from "./model";

export type DruhDomova = "zakladni-pokojicek" | "vanocni-pokojicek" | "pernikova-chaloupka" | "polarni-zare";

export interface KouzloDomova { klic: string; popis: string }

/** Průchody z pokojíčku: tabule vede do tréninku, skříň do šatníku. */
export type PruchodDomova = "trenink" | "satnik";

export interface Domov3D {
  nastav: (podoba: string, etapa: number, sloty?: SlotyHexika) => void;
  rezim: (celaObrazovka: boolean) => void;
  oslava: () => void;
  zpet: () => void;
  znic: () => void;
}

export interface MoznostiDomova {
  podoba: string;
  etapa: number;
  sloty?: SlotyHexika;
  /** Řádky na tabuli s dnešním plánem (první = nadpis). */
  tabule?: string[];
  lehce?: boolean;
  tabuleSviti?: boolean;
  /** Vybavení z Obchůdku (jen základní pokojíček). */
  vybaveni?: Partial<Record<string, string>>;
  onKouzlo: (klic: string) => void;
  onPruchod?: (k: PruchodDomova) => void;
}

const HOTOVE: readonly DruhDomova[] = ["zakladni-pokojicek", "vanocni-pokojicek", "pernikova-chaloupka", "polarni-zare"];

export function jeHotovyDomov(id: string): id is DruhDomova {
  return (HOTOVE as readonly string[]).includes(id);
}

/** Kouzla domova (popisky pro počítadlo a bublinu). */
export async function kouzlaDomova(druh: DruhDomova): Promise<KouzloDomova[]> {
  const seznam: Partial<Record<string, string>> =
    druh === "vanocni-pokojicek" ? (await import("./pokojicek")).KOUZLA
      : druh === "pernikova-chaloupka" ? (await import("./chaloupka")).KOUZLA_CHALOUPKY
        : druh === "polarni-zare" ? (await import("./polarni")).KOUZLA_POLARNI
          : (await import("./zakladni")).KOUZLA_ZAKLADNI;
  return Object.entries(seznam).filter((x): x is [string, string] => !!x[1]).map(([klic, popis]) => ({ klic, popis }));
}

export async function vytvorDomov(canvas: HTMLCanvasElement, druh: DruhDomova, o: MoznostiDomova): Promise<Domov3D> {
  if (druh === "vanocni-pokojicek") { const { vytvorPokojicek } = await import("./pokojicek"); return vytvorPokojicek(canvas, { ...o, onKouzlo: (k) => o.onKouzlo(k) }); }
  if (druh === "pernikova-chaloupka") { const { vytvorChaloupku } = await import("./chaloupka"); return vytvorChaloupku(canvas, o); }
  if (druh === "polarni-zare") { const { vytvorPolarniZari } = await import("./polarni"); return vytvorPolarniZari(canvas, o); }
  const { vytvorZakladniPokojicek } = await import("./zakladni"); return vytvorZakladniPokojicek(canvas, o);
}
