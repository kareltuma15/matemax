// Datum ve tvaru YYYY-MM-DD. V appce je „datum" vždy KALENDÁŘNÍ DEN UŽIVATELE:
//  • v prohlížeči podle jeho časového pásma (localDateStr),
//  • na serveru (běží v UTC) podle Prahy (pragueDateStr).
//
// Nikdy nepoužívej new Date().toISOString().slice(0, 10) — vrací datum v UTC. V Česku je to
// mezi půlnocí a druhou ráno špatný den, a pokud se před tím udělá setHours(0, 0, 0, 0),
// dokonce CELÝ DEN předchozí den (místní půlnoc je v UTC ještě včera). Tak zmizel dnešní
// trénink z heatmapy aktivity.

export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function pragueDateStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(d);
}

/** Pondělí (o půlnoci, místní čas) týdne, který je `tydnuZpet` týdnů před týdnem data `d`. 0 = pondělí tohoto týdne. */
export function pondeliTydne(d: Date, tydnuZpet = 0): Date {
  const dow = d.getDay(); // 0=Ne,1=Po…
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - (dow === 0 ? 6 : dow - 1) - 7 * tydnuZpet);
}

/** Datum o `daysBack` kalendářních dní dříve (v místním čase; bezpečné přes přechod letního času). */
export function localDateDaysAgo(daysBack: number, from: Date = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - daysBack);
  return d;
}
