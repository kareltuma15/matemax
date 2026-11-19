/**
 * Nálada Hexíka na Domově (Karel schválil 19. 11. 2026, jemně a bez výčitek):
 *  - ospalý: dítě 2 a víc dní netrénovalo
 *  - stýská se mu: včera trénovalo, série má aspoň 2 dny a je večer (od 17 h), dnes ještě ne → hrozí přerušení série
 *  - jinak normální
 */
export type NaladaHexika = "neutral" | "ospaly" | "smutny";

const denStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function naladaHexika(p: { lastActiveDate: string | null; streak: number }, ted: Date): NaladaHexika {
  if (!p.lastActiveDate) return "neutral";
  const dnes = denStr(ted);
  if (p.lastActiveDate === dnes) return "neutral";
  const [r, m, d] = p.lastActiveDate.split("-").map(Number);
  const posledni = new Date(r, m - 1, d);
  const dnu = Math.round((new Date(ted.getFullYear(), ted.getMonth(), ted.getDate()).getTime() - posledni.getTime()) / 86400000);
  if (dnu >= 2) return "ospaly";
  if (dnu === 1 && p.streak >= 2 && ted.getHours() >= 17) return "smutny";
  return "neutral";
}
