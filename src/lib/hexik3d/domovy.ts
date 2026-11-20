/**
 * Domovy Hexíka: 3D místa, kam se Hexík nastěhuje za dokončenou sadu (pravidla sad 19. 11. 2026).
 * Každý domov je hračkový diorama ostrůvek v kvalitě Hexíka (Karel 19. 11. 2026), kde Hexík sám dělá
 * kouzla: žák ťukne na věc, Hexík k ní dojde a udělá to. Hotový zatím Vánoční pokojíček (pokojicek.ts),
 * další domovy přibývají stejným způsobem, každý nejdřív jako prototyp ke schválení.
 * Scéna se načítá až v prohlížeči (dynamický import), ať three.js nezdržuje stránku.
 */
import type { SlotyHexika } from "./model";

export type DruhDomova = "vanocni-pokojicek";

export interface KouzloDomova { klic: string; popis: string }

export interface Domov3D {
  /** Přestaví Hexíka (jiná podoba, etapa nebo doplňky a efekt sady). */
  nastav: (podoba: string, etapa: number, sloty?: SlotyHexika) => void;
  /** Celá obrazovka: přiblížení kolečkem, svislý tah mění pohled. */
  rezim: (celaObrazovka: boolean) => void;
  /** Hexík se raduje (po dokončení sady). */
  oslava: () => void;
  znic: () => void;
}

export interface MoznostiDomova {
  podoba: string;
  etapa: number;
  sloty?: SlotyHexika;
  /** Řádky na tabuli s dnešním plánem (první = nadpis). */
  tabule?: string[];
  lehce?: boolean;
  onKouzlo: (klic: string) => void;
}

const HOTOVE: readonly DruhDomova[] = ["vanocni-pokojicek"];

export function jeHotovyDomov(id: string): id is DruhDomova {
  return (HOTOVE as readonly string[]).includes(id);
}

/** Kouzla domova (popisky pro počítadlo a bublinu). */
export async function kouzlaDomova(druh: DruhDomova): Promise<KouzloDomova[]> {
  const { KOUZLA } = await import("./pokojicek");
  void druh;
  return Object.entries(KOUZLA).map(([klic, popis]) => ({ klic, popis }));
}

export async function vytvorDomov(canvas: HTMLCanvasElement, druh: DruhDomova, o: MoznostiDomova): Promise<Domov3D> {
  void druh;
  const { vytvorPokojicek } = await import("./pokojicek");
  return vytvorPokojicek(canvas, { ...o, onKouzlo: (k) => o.onKouzlo(k) });
}
