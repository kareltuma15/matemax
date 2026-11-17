/**
 * Kód Generálka z testu nanečisto. Jen na serveru (klíč MATEMAX_DOPORUCENI_SECRET, stejný jako
 * v appce Vyhodnocení testů, takže kód umí spočítat i ona a ukázat ho u výsledků).
 *
 * Kód = „GEN-“ + 6 znaků odvozených z HMAC-SHA256(klíč, "generalka:" + den testu), abeceda bez
 * zaměnitelných znaků (bez 0/O, 1/I/L). Stejný kód pro všechny, kdo daný den psali test (5. i 9. třída).
 * Uplatnit jde 45 dní po testu. Kód nic neodemyká kromě kosmetických odměn ve Sbírce.
 */
import { createHmac } from "node:crypto";
import { pragueDateStr } from "./date";

const ABECEDA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const PLATNOST_DNI = 45;

export function kodGeneralky(secret: string, den: string): string {
  const h = createHmac("sha256", secret).update(`generalka:${den}`, "utf8").digest();
  let kod = "";
  for (let i = 0; i < 6; i++) kod += ABECEDA[h[i] % ABECEDA.length];
  return `GEN-${kod}`;
}

/** Sjednotí zápis: malá písmena, mezery, pomlčky a chybějící „GEN“ nevadí. */
export function normalizujKod(vstup: string): string | null {
  const s = String(vstup ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const jadro = s.startsWith("GEN") ? s.slice(3) : s;
  if (jadro.length !== 6) return null;
  return `GEN-${jadro}`;
}

/** Ověří kód a vrátí den testu, ke kterému patří (hledá posledních 45 dní včetně dneška). */
export function overKodGeneralky(secret: string, vstup: string, ted = new Date()): string | null {
  const kod = normalizujKod(vstup);
  if (!kod) return null;
  for (let i = 0; i <= PLATNOST_DNI; i++) {
    const den = pragueDateStr(new Date(ted.getTime() - i * 86400000));
    if (kodGeneralky(secret, den) === kod) return den;
  }
  return null;
}
