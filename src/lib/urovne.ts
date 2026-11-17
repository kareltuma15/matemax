/**
 * XP úrovně s odměnami (Karel 17. 11. 2026: „XP nechat a propojit: za postup v úrovních unikátní odměny“).
 *
 * XP se sbírají dál jako dřív (správná odpověď, mise, série…). Úroveň je číslo 1, 2, 3… a každá nová úroveň
 * dá odměnu: krystaly vždy, na vybraných úrovních věc, která nejde koupit ani vylosovat, a na 10., 20. a 30.
 * legendární truhlu. Hodnost (Začátečník → Mistr) zůstává podle původních hranic XP, ať sedí rodičovský
 * přehled a admin.
 *
 * Krystaly a truhly za úroveň se připíšou jen jednou (stav `uroven`). Věci za úroveň se doplňují podle třídy,
 * takže kdo přejde z 5. do 9. třídy, dostane i věci nové třídy (ale krystaly podruhé ne).
 */
import { getLevelFromXP, type LevelData } from "./gamification";
import { ODMENY, ziskejNarok, type Odmena, type SbirkaStav } from "./sbirka";
import type { Trida } from "@/types";

/** Úroveň, do které jsou odměny navržené (dál se jen přidávají krystaly). */
export const UROVNE_S_ODMENOU = 30;

/** Kolik XP je potřeba na úroveň n (1 = od začátku). Mezery rostou: 100, 140, 180, … XP. */
export function prahUrovne(n: number): number {
  if (n <= 1) return 0;
  return (n - 1) * 100 + 20 * (n - 1) * (n - 2);
}

export interface Uroven {
  n: number;
  /** XP na začátku této úrovně a na začátku další. */
  od: number;
  do: number;
  /** Podíl cesty k další úrovni (0–1). */
  podil: number;
  /** Hodnost podle původních hranic (Začátečník, Žák, Pokročilý, Expert, Mistr). */
  hodnost: LevelData;
}

export function urovenZXP(xp: number): Uroven {
  const x = Math.max(0, Math.floor(xp || 0));
  let n = 1;
  while (prahUrovne(n + 1) <= x) n++;
  const od = prahUrovne(n), doo = prahUrovne(n + 1);
  return { n, od, do: doo, podil: (x - od) / (doo - od), hodnost: getLevelFromXP(x) };
}

export const krystalyZaUroven = (n: number) => 30 + 10 * n;
export const legendarniZaUroven = (n: number) => n % 10 === 0 && n <= UROVNE_S_ODMENOU;

export function vecZaUroven(trida: Trida, n: number): Odmena | undefined {
  return ODMENY[trida].find((o) => o.zdroj === "uroven" && o.uroven === n);
}

export interface OdmenaUrovne { n: number; krystaly: number; vec?: Odmena; legendarni: boolean }

export function odmenaUrovne(trida: Trida, n: number): OdmenaUrovne {
  return { n, krystaly: krystalyZaUroven(n), vec: vecZaUroven(trida, n), legendarni: legendarniZaUroven(n) };
}

/** Nejbližší úroveň nad `n`, která dá věc nebo truhlu (pro „další odměna: …“). */
export function dalsiVelkaOdmena(trida: Trida, n: number): OdmenaUrovne | null {
  for (let k = n + 1; k <= UROVNE_S_ODMENOU; k++) {
    const o = odmenaUrovne(trida, k);
    if (o.vec || o.legendarni) return o;
  }
  return null;
}

/** Nové úrovně od minula (detail: { urovne: OdmenaUrovne[] }) — trénink je ohlásí na konci. */
export const UROVEN_EVENT = "matemax-uroven";

/**
 * Připíše odměny za úrovně, které žák s daným počtem XP dosáhl a ještě je nedostal.
 * Krystaly za úroveň jdou mimo denní strop (jsou to odměny za už odvedenou práci).
 */
export function zapisUroven(s: SbirkaStav, trida: Trida, xp: number): { s: SbirkaStav; vysledek: OdmenaUrovne[] } {
  const { n } = urovenZXP(xp);
  const bylo = s.uroven ?? 1;
  let dalsi: SbirkaStav = s;
  const nove: OdmenaUrovne[] = [];
  let pridatK = 0;
  for (let k = bylo + 1; k <= n; k++) {
    const o = odmenaUrovne(trida, k);
    pridatK += o.krystaly;
    if (o.legendarni) dalsi = ziskejNarok(dalsi, "legendarni", `uroven:${k}`).s;
    nove.push(o);
  }
  // Věci za úroveň pro aktuální třídu (i zpětně, kdyby žák změnil třídu)
  const chybi = ODMENY[trida].filter((o) => o.zdroj === "uroven" && (o.uroven ?? 99) <= n && !dalsi.mam.includes(o.id)).map((o) => o.id);
  if (nove.length === 0 && chybi.length === 0) return { s, vysledek: [] };
  dalsi = { ...dalsi, ziskano: dalsi.ziskano + pridatK, mam: [...dalsi.mam, ...chybi], uroven: Math.max(bylo, n) };
  return { s: dalsi, vysledek: nove };
}
