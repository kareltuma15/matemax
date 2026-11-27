/** Segmenty žáků (ZA-01). Prahy ze stavu žáka v nastavení. */
import { pragueDateStr } from "@/lib/date";
import type { Zak } from "./typy";
import type { Nastaveni } from "./nastaveni";
import { denZ, dnyMezi } from "./metriky";

export interface Segment { klic: string; nazev: string; popis: string; test: (z: Zak) => boolean }

export function segmenty(n: Nastaveni, dnes = pragueDateStr()): Segment[] {
  return [
    { klic: "novi", nazev: `Noví (${n.prahy.novyDni} dní)`, popis: `Registrace za posledních ${n.prahy.novyDni} dní.`, test: (z) => dnyMezi(denZ(z.registrace), dnes) < n.prahy.novyDni },
    { klic: "bez_diagnostiky", nazev: "Bez diagnostiky", popis: "Diagnostiku zatím neudělali.", test: (z) => !z.diagnostika },
    { klic: "netrenuji", nazev: "Netrénují 3+ dny", popis: "Dřív trénovali, poslední trénink před 3 a více dny.", test: (z) => !!z.posledni_aktivita && dnyMezi(z.posledni_aktivita, dnes) >= 3 },
    { klic: "aktivni", nazev: "Aktivní tento týden", popis: "Aspoň jeden den s tréninkem za posledních 7 dní.", test: (z) => z.dny_7 > 0 },
    { klic: "premium", nazev: "Premium", popis: "Platí, mají ručně udělené nebo zkušební Premium.", test: (z) => z.premium !== "zdarma" },
    { klic: "z_testu", nazev: "Z testů nanečisto", popis: "Účet propojený s Vyhodnocením testů.", test: (z) => !!z.propojeno_vysledky },
    { klic: "t5", nazev: "5. třída", popis: "Žáci 5. třídy.", test: (z) => z.trida === 5 },
    { klic: "t9", nazev: "9. třída", popis: "Žáci 9. třídy.", test: (z) => z.trida === 9 },
    { klic: "nedosazitelni", nazev: "Nedosažitelní", popis: "Neověřený e-mail nebo odhlášené e-maily (push zatím nemá nikdo).", test: (z) => !z.email_overen || z.odhlasen_emaily },
  ];
}

export type Razeni = "registrace" | "aktivita" | "pauza";
export function serad(zaci: Zak[], r: Razeni, dnes = pragueDateStr()): Zak[] {
  const k = [...zaci];
  if (r === "aktivita") return k.sort((a, b) => (b.posledni_aktivita ?? "").localeCompare(a.posledni_aktivita ?? "") || b.registrace.localeCompare(a.registrace));
  if (r === "pauza") {
    const pauza = (z: Zak) => (z.posledni_aktivita ? dnyMezi(z.posledni_aktivita, dnes) : -1);
    return k.sort((a, b) => pauza(b) - pauza(a));
  }
  return k.sort((a, b) => b.registrace.localeCompare(a.registrace));
}
