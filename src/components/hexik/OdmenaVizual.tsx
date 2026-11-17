"use client";

import Hexik from "./Hexik";
import { IKONA_ODMENY, type Odmena } from "@/lib/sbirka";

/** Jak odměna vypadá v šatníku, v sadách a v truhle: Hexík, vzorek vzhledu, miniatura pozadí nebo ikona. */
export default function OdmenaVizual({ o, velikost = 52 }: { o: Odmena; velikost?: number }) {
  if (o.typ === "podoba") return <Hexik podoba={o.klic} staticky style={{ width: velikost }} />;
  if (o.typ === "vzhled") return <span className="mm-swatch" data-vz={o.klic} style={{ width: velikost * 1.6, height: velikost }} aria-hidden="true"><i /><i /></span>;
  if (o.typ === "pozadi") return <span className="mm-banner mm-nahled block" data-pozadi={o.klic === "klasik" ? undefined : o.klic} style={{ width: velikost * 1.6, height: velikost }} aria-hidden="true" />;
  return <span style={{ fontSize: velikost * 0.62, lineHeight: 1 }} aria-hidden="true">{IKONA_ODMENY[o.klic] ?? "✨"}</span>;
}
