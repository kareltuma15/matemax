"use client";

import { useEffect, useState } from "react";
import Hexik from "./Hexik";
import { IKONA_ODMENY, SLOTY, type Odmena } from "@/lib/sbirka";
import { miniatura, miniaturaZPameti, type DruhMiniatury } from "@/lib/hexik3d/miniatury";

const S_MINIATUROU = new Set<string>(["podoba", ...SLOTY]);

/** 2D podoba (bez WebGL a než se 3D miniatura vykreslí). */
function Dvourozmerne({ o, velikost, vyplnit = false }: { o: Odmena; velikost: number; vyplnit?: boolean }) {
  if (o.typ === "podoba") return <Hexik podoba={o.klic} staticky style={{ width: velikost }} />;
  return <span style={{ fontSize: velikost * (vyplnit ? 0.95 : 0.62), lineHeight: 1 }} aria-hidden="true">{IKONA_ODMENY[o.klic] ?? "✨"}</span>;
}

/** 3D miniatura z modelu Hexíka (podoby a doplňky na tělo), dokud není, ukáže se 2D. */
function Miniatura3D({ o, velikost, etapa, vyplnit }: { o: Odmena; velikost: number; etapa: number; vyplnit: boolean }) {
  const druh = o.typ as DruhMiniatury;
  const [url, setUrl] = useState<string | null>(() => miniaturaZPameti(druh, o.klic, etapa));
  useEffect(() => {
    let zivy = true;
    void miniatura(druh, o.klic, etapa).then((u) => { if (zivy) setUrl(u); });
    return () => { zivy = false; };
  }, [druh, o.klic, etapa]);
  if (!url) return <Dvourozmerne o={o} velikost={velikost} />;
  const rozmer = vyplnit ? "100%" : velikost * 1.3;
  // eslint-disable-next-line @next/next/no-img-element -- miniatura je blob z prohlížeče, ne soubor pro next/image
  return <img src={url} alt="" aria-hidden="true" width={192} height={192} style={{ width: rozmer, height: rozmer, objectFit: "contain" }} data-testid="miniatura-3d" />;
}

/** Jak odměna vypadá v šatníku, v sadách a v truhle: 3D miniatura, vzorek vzhledu, miniatura pozadí nebo ikona. */
export default function OdmenaVizual({ o, velikost = 52, etapa = 1, vyplnit = false }: { o: Odmena; velikost?: number; etapa?: number; vyplnit?: boolean }) {
  if (o.typ === "vzhled") return <span className="mm-swatch" data-vz={o.klic} style={{ width: velikost * 1.6, height: velikost }} aria-hidden="true"><i /><i /></span>;
  if (o.typ === "pozadi") return <span className="mm-banner mm-nahled block" data-pozadi={o.klic === "klasik" ? undefined : o.klic} style={{ width: velikost * 1.6, height: velikost }} aria-hidden="true" />;
  if (S_MINIATUROU.has(o.typ) && o.klic !== "nic") return <Miniatura3D o={o} velikost={velikost} etapa={etapa} vyplnit={vyplnit} />;
  return <Dvourozmerne o={o} velikost={velikost} vyplnit={vyplnit} />;
}
