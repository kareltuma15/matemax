/**
 * Kronika novinek (src/data/kronika-obsahu.json) bez dalších závislostí, aby ji mohla číst i úvodní stránka
 * a Domov (novinky) bez načítání celé databáze příkladů. Počty a čerstvost počítá lib/obsah.ts.
 */
import kronikaData from "@/data/kronika-obsahu.json";

export type OblastId = "priklady9" | "priklady5" | "odmeny" | "odznaky" | "testy" | "diagnostika" | "videolekce" | "vyzvy";

export interface ZapisKroniky {
  /** Den vydání naostro (YYYY-MM-DD). null = hotové, ale ještě nenasazené. */
  datum: string | null;
  oblast: OblastId;
  popis: string;
}
export interface Kronika { stav: Record<string, number>; zapisy: ZapisKroniky[] }
export const KRONIKA = kronikaData as Kronika;

export const dnyMezi = (od: string, do_: string) =>
  Math.round((Date.parse(do_ + "T00:00:00Z") - Date.parse(od + "T00:00:00Z")) / 86400000);
