/**
 * Režim sdílení obrazovky (KO-08): skryje jména, e-maily a ID (Žák A, Žák B…). Pseudonym je stálý
 * (pořadí podle registrace), takže stejný žák má na všech stránkách stejné písmeno. Maskuje server,
 * do prohlížeče se skutečné údaje vůbec nepošlou.
 */
import type { Zak } from "./typy";

const pismena = (i: number): string => { let s = ""; let n = i; do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0); return s; };

export function pseudonymy(zaci: Zak[]): Map<string, string> {
  const serazeni = [...zaci].sort((a, b) => (a.registrace < b.registrace ? -1 : a.registrace > b.registrace ? 1 : a.id < b.id ? -1 : 1));
  return new Map(serazeni.map((z, i) => [z.id, `Žák ${pismena(i)}`]));
}

export interface ZobrazeniZaka { jmeno: string; email: string; skryto: boolean }

export function zobraz(z: Zak, sdileni: boolean, ps: Map<string, string>): ZobrazeniZaka {
  if (sdileni) return { jmeno: ps.get(z.id) ?? "Žák", email: "e-mail skrytý", skryto: true };
  return { jmeno: z.jmeno || (z.email ?? "").split("@")[0] || "Bez jména", email: z.email ?? "", skryto: false };
}

/** Text, ve kterém se může objevit e-mail (rodiče): v režimu sdílení skrýt. */
export const skryjEmail = (e: string | null, sdileni: boolean) => (!e ? null : sdileni ? "skrytý" : e);
