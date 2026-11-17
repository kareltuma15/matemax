/**
 * Napojení Sbírky na trénink: krystaly za odpověď, za dokončený trénink a za nový rekord odhadu bodů.
 * Volá se z tréninku (trenink/page.tsx). Hexík u příkladu si připsané krystaly ukáže přes událost.
 */
import type { Trida } from "@/types";
import { localDateStr } from "./date";
import { loadGamification } from "./gamification";
import { spocitejOdhad } from "./odhad-vypocet";
import {
  upravSbirku, zapisOdpoved, krystalyZaOdpoved, pripis, dokoncenyTrenink, zapocitejOdhad,
  type OdmenaZaTrenink,
} from "./sbirka";

export const KRYSTALY_EVENT = "matemax-krystaly";

function ohlasKrystaly(n: number) {
  if (n > 0 && typeof window !== "undefined") window.dispatchEvent(new CustomEvent(KRYSTALY_EVENT, { detail: { n } }));
}

/** Zapíše odpověď a připíše krystaly. Vrací, kolik se připsalo. */
export function odmenaZaOdpoved(a: { spravne: boolean; obtiznost: number; uroven: number; ms: number | null; vyber: boolean }): number {
  const den = localDateStr();
  const n = upravSbirku((s) => {
    const zapsano = zapisOdpoved(s, a.spravne, den);
    return pripis(zapsano, krystalyZaOdpoved(a.spravne, a.obtiznost, a.uroven, a.ms, a.vyber), den);
  });
  ohlasKrystaly(n);
  return n;
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

export interface OdmenaKonec extends OdmenaZaTrenink { odhad: number }

/** Konec tréninku: krystaly za dokončení (jednou denně), denní a zlatá truhla, rekord odhadu. */
export function odmenaZaKonecTreninku(trida: Trida, odpovezeno: number): OdmenaKonec {
  if (odpovezeno < 5) return { krystaly: 0, denniNove: false, zlataNove: false, odhad: odmenaZaOdhad(trida) };
  const r = upravSbirku((s) => dokoncenyTrenink(s, localDateStr()));
  ohlasKrystaly(r.krystaly);
  return { ...r, odhad: odmenaZaOdhad(trida) };
}
