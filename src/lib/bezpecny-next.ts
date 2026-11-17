/**
 * Kam se vrátit po přihlášení / registraci (?next=…). Jen cesty uvnitř MateMaxu: „//jinde.cz“ nebo
 * „/\jinde.cz“ by prohlížeč vzal jako jiný web.
 */
export function bezpecnyNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || next.length > 4000) return null;
  return next;
}

/**
 * Po registraci se normálně jde na uvítání (/vitej). Výjimka: doporučení po testu nanečisto
 * a propojení s Testy nanečisto, ze kterých žák k registraci přišel — tam se vrátí rovnou.
 */
export function navratPoRegistraci(next: string | null | undefined): string | null {
  const n = bezpecnyNext(next);
  if (!n) return null;
  return n.startsWith("/trenink?doporuceni=") || n.startsWith("/propojit?") ? n : null;
}
