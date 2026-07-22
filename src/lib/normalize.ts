export function normalize(raw: string): string {
  const s = raw.trim().replace(/\s/g, "").toLowerCase();

  // Extract value after "=" — handles "x=7" → "7", "x = 1/2" → "1/2"
  const eqIdx = s.indexOf("=");
  const value = eqIdx >= 0 ? s.slice(eqIdx + 1) : s;

  const fractionMatch = value.match(/^(-?\d+)\/(-?\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]);
    const den = parseInt(fractionMatch[2]);
    if (den === 0) return value;
    const g = gcd(Math.abs(num), Math.abs(den));
    const sign = den < 0 ? -1 : 1;
    return `${(sign * num) / g}/${(sign * den) / g}`;
  }

  if (/^-?\d+$/.test(value)) return value;

  // Decimal with comma or dot
  const decMatch = value.match(/^(-?\d+)[.,](\d+)$/);
  if (decMatch) return value.replace(",", ".");

  // Number + unit suffix ("3roky" → "3", "160km" → "160", "1,5hodiny" → "1.5", "15km/h" → "15")
  // Only strips when followed by a letter — colons/slashes (times like "11:00") are kept as-is
  const unitMatch = value.match(/^(-?\d+(?:[.,]\d+)?(?:\/\d+)?)[a-záčďéěíňóřšťúůýž%°]/);
  if (unitMatch) return normalize(unitMatch[1]);

  return value;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Číselná hodnota odpovědi, nebo null když ji nelze určit.
 *
 * Zvládne: 7 · 3,5 · 3.5 · 7/2 · „3 1/2" · „3 a 1/2" (smíšené číslo, jak ho
 * píše sešit) · „10 cm". Díky tomu se porovnává HODNOTA, ne zápis — žák, který
 * napíše 47/12 místo 3 11/12, má pravdu a nesmí dostat křížek.
 *
 * Pozor na pořadí: mezery se zahazují až po rozpoznání smíšeného čísla,
 * jinak by se z „3 11/12" stalo „311/12".
 */
export function toValue(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim().toLowerCase().replace(/\s+/g, " ");

  // „x = 1/2" → „1/2"
  const eqIdx = s.indexOf("=");
  if (eqIdx >= 0) s = s.slice(eqIdx + 1).trim();

  s = s.replace(",", ".");

  // Jednotka na konci („10 cm", „15 %") — jen když před ní zbude samotné číslo
  const unit = s.match(/^([-\d\s./]+?)\s*[a-záčďéěíňóřšťúůýž%°]+(?:\/[a-záčďéěíňóřšťúůýž]+)?$/);
  if (unit) s = unit[1].trim();

  // Smíšené číslo: „3 1/2" i „3 a 1/2". Oddělovač (mezera nebo „a") je POVINNÝ,
  // jinak by se „47/12" rozpadlo na 4 + 7/12.
  const mixed = s.match(/^(-?\d+)(?:\s+|\s*a\s*)(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = parseInt(mixed[1]);
    const num = parseInt(mixed[2]);
    const den = parseInt(mixed[3]);
    if (den === 0) return null;
    const sign = whole < 0 ? -1 : 1;
    return whole + sign * (num / den);
  }

  // Zlomek
  const frac = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (frac) {
    const den = parseInt(frac[2]);
    return den === 0 ? null : parseInt(frac[1]) / den;
  }

  // Celé nebo desetinné číslo
  if (/^-?\d+(?:\.\d+)?$/.test(s)) return parseFloat(s);

  return null;
}

export function checkAnswer(userAnswer: string, correct: string): boolean {
  // Když jde obojí převést na číslo, rozhoduje hodnota — 47/12 = 3 11/12 = 3,9166…
  const u = toValue(userAnswer);
  const c = toValue(correct);
  if (u !== null && c !== null) return Math.abs(u - c) < 1e-9;

  // Popisné odpovědi („2 řešení", „α = 65°, β = 115°") dál porovnáváme textem
  return normalize(userAnswer) === normalize(correct);
}

/**
 * Odpověď je správná, ale žák ji zapsal jinak než databáze (47/12 vs 3 11/12).
 * Používá se k pochvale s ukázkou druhého tvaru — z rozdílu se stane mikrolekce
 * místo křížku.
 */
export function isDifferentForm(userAnswer: string, correct: string): boolean {
  if (!checkAnswer(userAnswer, correct)) return false;
  return normalize(userAnswer) !== normalize(correct);
}
