/**
 * Napojení Sbírky na trénink: krystaly za odpověď, za dokončený trénink a za nový rekord odhadu bodů.
 * Volá se z tréninku (trenink/page.tsx). Hexík u příkladu si připsané krystaly ukáže přes událost.
 */
import type { Trida } from "@/types";
import { localDateStr } from "./date";
import { loadGamification } from "./gamification";
import { spocitejOdhad } from "./odhad-vypocet";
import { loadProgress } from "./progress";
import { zapisUroven, UROVEN_EVENT, type OdmenaUrovne } from "./urovne";
import {
  upravSbirku, zapisOdpoved, krystalyZaOdpoved, pripis, dokoncenyTrenink, zapocitejOdhad,
  misePriOdpovedi, splnMise, ziskejDoporuceni, novaZvladnutaTemata,
  type OdmenaZaTrenink, type MiseId,
} from "./sbirka";

export const KRYSTALY_EVENT = "matemax-krystaly";
/** Splněná denní mise (detail: { ids }) — Hexík u příkladu ji ohlásí. */
export const MISE_EVENT = "matemax-mise";

function ohlasKrystaly(n: number) {
  if (n > 0 && typeof window !== "undefined") window.dispatchEvent(new CustomEvent(KRYSTALY_EVENT, { detail: { n } }));
}

function ohlasMise(ids: MiseId[]) {
  if (ids.length > 0 && typeof window !== "undefined") window.dispatchEvent(new CustomEvent(MISE_EVENT, { detail: { ids } }));
}

/** Zapíše odpověď a připíše krystaly (za odpověď i za právě splněné mise). Vrací, kolik se připsalo. */
export function odmenaZaOdpoved(a: { spravne: boolean; obtiznost: number; uroven: number; ms: number | null; vyber: boolean }): number {
  const den = localDateStr();
  const { n, mise } = upravSbirku((s) => {
    const zapsano = misePriOdpovedi(zapisOdpoved(s, a.spravne, den), a.spravne, a.obtiznost, den);
    const r = pripis(zapsano, krystalyZaOdpoved(a.spravne, a.obtiznost, a.uroven, a.ms, a.vyber), den);
    const m = splnMise(r.s, den);
    return { s: m.s, vysledek: { n: r.vysledek + m.vysledek.krystaly, mise: m.vysledek.nove } };
  });
  ohlasKrystaly(n);
  ohlasMise(mise);
  return n;
}

/** Splněné doporučení (zvládnuté téma, plán po testu) přidá Truhlu doporučení. Vrací true, když je nová. */
export function odmenaZaDoporuceni(klic: string): boolean {
  return upravSbirku((s) => ziskejDoporuceni(s, klic));
}

function aktualniOdhad(trida: Trida): number | null {
  try {
    const diag = JSON.parse(localStorage.getItem("matemax-diag-results") ?? "{}");
    const o = spocitejOdhad(trida, loadGamification().topicStats ?? {}, diag);
    return o.bezDat ? null : o.celkem;
  } catch {
    return null;
  }
}

/** Nový rekord odhadu bodů (+30 za bod). Na začátku tréninku poprvé jen nastaví základ. */
export function odmenaZaOdhad(trida: Trida): number {
  const celkem = aktualniOdhad(trida);
  if (celkem === null) return 0;
  const n = upravSbirku((s) => zapocitejOdhad(s, trida, celkem, localDateStr()));
  ohlasKrystaly(n);
  return n;
}

export interface OdmenaKonec extends OdmenaZaTrenink { odhad: number; mise: MiseId[]; doporuceni: boolean }

/**
 * Konec tréninku: krystaly za dokončení (jednou denně), denní a zlatá truhla, mise, rekord odhadu
 * a Truhla doporučení za každé téma, které se v tomto tréninku dostalo přes práh zvládnutí.
 */
export function odmenaZaKonecTreninku(
  trida: Trida,
  odpovezeno: number,
  pripravenost?: { pred: Record<string, number> | null; po: Record<string, number>; prah: number },
): OdmenaKonec {
  const den = localDateStr();
  const zvladnuta = pripravenost ? novaZvladnutaTemata(pripravenost.pred, pripravenost.po, pripravenost.prah) : [];
  const doporuceni = zvladnuta.map((t) => odmenaZaDoporuceni(`tema:${t}`)).some(Boolean);
  if (odpovezeno < 5) return { krystaly: 0, denniNove: false, zlataNove: false, odhad: odmenaZaOdhad(trida), mise: [], doporuceni };
  const r = upravSbirku((s) => {
    const t = dokoncenyTrenink(s, den);
    const m = splnMise(t.s, den);
    return { s: m.s, vysledek: { ...t.vysledek, krystaly: t.vysledek.krystaly + m.vysledek.krystaly, mise: m.vysledek.nove } };
  });
  ohlasKrystaly(r.krystaly);
  ohlasMise(r.mise);
  return { ...r, odhad: odmenaZaOdhad(trida), doporuceni };
}

/**
 * Připíše odměny za nově dosažené XP úrovně (krystaly, věc za úroveň, legendární truhla) a ohlásí je.
 * Volá se po každé změně XP v tréninku a při otevření Domova a Sbírky (zpětně i za starší XP).
 */
export function zkontrolujUroven(trida: Trida): OdmenaUrovne[] {
  if (typeof window === "undefined") return [];
  const xp = loadProgress().xp ?? 0;
  const nove = upravSbirku((s) => zapisUroven(s, trida, xp));
  if (nove.length > 0) window.dispatchEvent(new CustomEvent(UROVEN_EVENT, { detail: { urovne: nove } }));
  return nove;
}
