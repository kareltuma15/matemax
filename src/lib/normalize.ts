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

export function checkAnswer(userAnswer: string, correct: string): boolean {
  const u = normalize(userAnswer);
  const c = normalize(correct);
  return u === c;
}
