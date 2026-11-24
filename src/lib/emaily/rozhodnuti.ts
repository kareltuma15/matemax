import type { EmailZaka } from "./katalog";

/**
 * Kdo dnes dostane jakou připomínku (denní běh v 16:00). Čistá funkce bez databáze, aby šla otestovat.
 * Pravidla z mockupu e-mailů: nejvýš 2 připomínky týdně a 1 denně, kdo dnes trénoval, nic nedostane,
 * po „Hexík usnul“ ticho až do návratu, odhlášení a testovací účty nic. Jen účty z letošní sezóny
 * (registrace od 1. 9. 2026), aby loňským deváťákům po přijímačkách nechodilo „do přijímaček zbývá…“.
 */

export const ZACATEK_SEZONY = "2026-09-01";
export const MAX_ZA_TYDEN = 2;

export interface EmailovyStav {
  odhlaseno?: boolean;
  /** Kdy naposledy odešel který e-mail (ISO). */
  odeslano?: Partial<Record<EmailZaka, string>>;
  /** Časy odeslaných připomínek (ISO), posledních pár kvůli stropu. */
  historie?: string[];
}

export interface VstupRozhodnuti {
  /** Datum registrace (YYYY-MM-DD, Praha). */
  registrace: string;
  emailPotvrzen: boolean;
  testovaci: boolean;
  /** Datum dokončené diagnostiky (YYYY-MM-DD) nebo null. */
  diagnostika: string | null;
  /** Dny s tréninkem (YYYY-MM-DD), libovolné pořadí. */
  treninky: string[];
  stav: EmailovyStav;
  /** Dnes v Praze (YYYY-MM-DD). */
  dnes: string;
  /** Teď (ISO), kvůli stropu za 7 dní. */
  ted: string;
}

export function rozdilDni(od: string, do_: string): number {
  return Math.round((Date.parse(do_) - Date.parse(od)) / 86400000);
}

/** Kolik dní v řadě trénoval(a) až do posledního tréninku včetně. */
export function serie(treninky: string[]): number {
  const dny = [...new Set(treninky)].sort();
  if (!dny.length) return 0;
  let n = 1;
  for (let i = dny.length - 1; i > 0 && rozdilDni(dny[i - 1], dny[i]) === 1; i--) n++;
  return n;
}

export function coPoslat(v: VstupRozhodnuti): EmailZaka | null {
  const { stav, dnes } = v;
  if (stav.odhlaseno || v.testovaci || !v.emailPotvrzen) return null;
  if (v.registrace < ZACATEK_SEZONY) return null;

  const tyden = Date.parse(v.ted) - 7 * 86400000;
  const nedavne = (stav.historie ?? []).filter((t) => Date.parse(t) > tyden);
  if (nedavne.length >= MAX_ZA_TYDEN) return null;
  if (nedavne.some((t) => Date.parse(t) > Date.parse(v.ted) - 20 * 3600000)) return null;

  const dny = [...new Set(v.treninky)].sort();
  const posledni = dny[dny.length - 1];
  const odeslanoDen = (id: EmailZaka) => stav.odeslano?.[id]?.slice(0, 10) ?? null;

  if (!posledni) {
    if (v.diagnostika) {
      const poDiag = rozdilDni(v.diagnostika, dnes);
      if (poDiag >= 1 && poDiag <= 7 && !odeslanoDen("plan")) return "plan";
      return null;
    }
    const poRegistraci = rozdilDni(v.registrace, dnes);
    if (poRegistraci >= 3 && poRegistraci <= 7 && !odeslanoDen("nezacal")) return "nezacal";
    return null;
  }

  if (posledni >= dnes) return null;
  const pauza = rozdilDni(posledni, dnes);
  const poPauze = (id: EmailZaka) => { const d = odeslanoDen(id); return !!d && d > posledni; };
  if (pauza >= 7 && pauza <= 13 && !poPauze("spi")) return "spi";
  if (pauza >= 3 && pauza <= 6 && !poPauze("styska") && !poPauze("spi")) return "styska";
  return null;
}
