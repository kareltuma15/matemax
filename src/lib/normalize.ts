export function normalize(raw: string): string {
  const s = raw.trim().replace(/\s/g, "").toLowerCase();

  const fractionMatch = s.match(/^(-?\d+)\/(-?\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]);
    const den = parseInt(fractionMatch[2]);
    if (den === 0) return s;
    const g = gcd(Math.abs(num), Math.abs(den));
    const sign = den < 0 ? -1 : 1;
    return `${(sign * num) / g}/${(sign * den) / g}`;
  }

  if (/^-?\d+$/.test(s)) return s;

  // Decimal with comma or dot
  const decMatch = s.match(/^(-?\d+)[.,](\d+)$/);
  if (decMatch) return s.replace(",", ".");

  return s;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function checkAnswer(userAnswer: string, correct: string): boolean {
  const u = normalize(userAnswer);
  const c = normalize(correct);
  return u === c;
}
