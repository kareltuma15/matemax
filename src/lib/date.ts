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

/** Datum o `daysBack` kalendářních dní dříve (v místním čase; bezpečné přes přechod letního času). */
export function localDateDaysAgo(daysBack: number, from: Date = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - daysBack);
  return d;
}
