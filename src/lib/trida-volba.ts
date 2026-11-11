import type { Trida } from "@/types";

// Bez importů za běhu (jen typy): používá ho i e2e test bez prohlížeče.

export function isTrida(v: unknown): v is Trida {
  return v === 5 || v === 9;
}

/** Jak dlouho po vytvoření se účet bez třídy bere jako čerstvá registrace (třída se převezme z prohlížeče). */
const NOVY_UCET_MS = 24 * 60 * 60 * 1000;

/**
 * Co udělat se třídou po přihlášení. Třída z účtu vždy vyhraje. Účet bez třídy: čerstvá registrace přes Google
 * (žák třídu zvolil před přesměrováním) si ji převezme z prohlížeče; starší účet bez třídy je 9. třída, protože
 * volba v prohlížeči může zůstat po jiném účtu na stejném zařízení (dřív tak deváťák viděl appku pro 5. třídu).
 */
export function tridaPoPrihlaseni(
  tridaUctu: unknown, lokalni: Trida | null, vytvoreno: string, ted: number
): { doProhlizece?: Trida; kUctu?: Trida } {
  const z = Number(tridaUctu);
  if (isTrida(z)) return { doProhlizece: z };
  const novyUcet = ted - new Date(vytvoreno).getTime() < NOVY_UCET_MS;
  if (novyUcet && lokalni) return { kUctu: lokalni };
  return { doProhlizece: 9 };
}
