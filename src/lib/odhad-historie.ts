/** Denní záznamy odhadu bodů v prohlížeči (zvlášť pro 5. a 9. třídu, nejvýš 120 dní). */
import type { Trida } from "@/types";

export interface OdhadZaznam {
  /** Den „YYYY-MM-DD“ (místní čas). */
  d: string;
  /** Celkový odhad bodů. */
  b: number;
  /** Body po tématech. */
  t: Record<string, number>;
}

const klic = (trida: Trida) => `matemax-odhad-historie-${trida}`;
const MAX_ZAZNAMU = 120;

export function localLoadOdhady(trida: Trida): OdhadZaznam[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(klic(trida));
    const data = raw ? (JSON.parse(raw) as OdhadZaznam[]) : [];
    return Array.isArray(data) ? data.filter((z) => z && typeof z.d === "string" && typeof z.b === "number") : [];
  } catch { return []; }
}

/** Uloží dnešní záznam (přepíše ten ze stejného dne) a vrátí aktuální historii seřazenou od nejstaršího. */
export function localSaveOdhad(trida: Trida, zaznam: OdhadZaznam, historie: OdhadZaznam[]): OdhadZaznam[] {
  const nova = [...historie.filter((z) => z.d !== zaznam.d), zaznam].sort((a, b) => a.d.localeCompare(b.d)).slice(-MAX_ZAZNAMU);
  try { localStorage.setItem(klic(trida), JSON.stringify(nova)); } catch { /* plné úložiště nevadí */ }
  return nova;
}
