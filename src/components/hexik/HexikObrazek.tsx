"use client";

import { useEffect, useState } from "react";
import Hexik from "./Hexik";
import type { DruhMiniatury } from "@/lib/hexik3d/miniatury";

/**
 * 3D Hexík jako obrázek (úvodní stránka, novinky): vyrenderuje se jednou sdíleným 3D rendererem
 * (hexik3d/miniatury.ts) a dál je to obyčejný obrázek, takže stránka nezpomalí. Než se obrázek
 * vykreslí, nebo bez WebGL (starý telefon), zůstane 2D kresba (nebo `zalozni`).
 * `druh` jiný než „podoba“ = doplněk na Hexíkovi se záběrem na dané místo (klíč doplňku v `podoba`).
 */
export default function HexikObrazek({ podoba, etapa = 3, druh = "podoba", px = 256, className, style, alt = "", zalozni }: {
  podoba: string; etapa?: number; druh?: DruhMiniatury; px?: number; className?: string; style?: React.CSSProperties; alt?: string; zalozni?: React.ReactNode;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let zruseno = false;
    import("@/lib/hexik3d/miniatury")
      .then(({ miniatura }) => miniatura(druh, podoba, etapa, px))
      .then((u) => { if (!zruseno && u) setSrc(u); })
      .catch(() => { /* zůstane 2D */ });
    return () => { zruseno = true; };
  }, [podoba, etapa, druh, px]);
  if (!src) return zalozni !== undefined ? <>{zalozni}</> : <Hexik podoba={druh === "podoba" ? podoba : "klasik"} etapa={etapa} staticky className={className} style={style} />;
  // eslint-disable-next-line @next/next/no-img-element -- obrázek z prohlížeče (data/blob URL), ne ze serveru
  return <img src={src} alt={alt} className={className} style={{ objectFit: "contain", ...style }} data-hexik3d="1" draggable={false} />;
}
