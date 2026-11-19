"use client";

import { useEffect, useState } from "react";
import { aktualniSezona } from "@/lib/sbirka";
import { localDateStr } from "@/lib/date";

const SEZONNI: Record<string, string> = { vanoce: "vanocni", zima: "zimni", finis: "finis" };

/**
 * 3D miniatura truhly (obchod ve Sbírce, karta testu nanečisto): vykreslí ji sdílený renderer
 * miniatur (hexik3d/miniatury.ts, druh „truhla“) a dál je to obrázek. Než se vykreslí,
 * nebo bez WebGL, zůstane dnešní CSS truhla.
 */
export default function TruhlaMiniatura({ druh, velikost = 64, className = "" }: { druh: string; velikost?: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let zruseno = false;
    // Sezónní truhla vypadá podle aktuální sezóny (mimo sezónu jako vánoční)
    const model = druh === "sezonni" ? SEZONNI[aktualniSezona(localDateStr())?.id ?? "vanoce"] : druh;
    import("@/lib/hexik3d/miniatury")
      .then(({ miniatura }) => miniatura("truhla", model, 1, velikost * 2))
      .then((u) => { if (!zruseno && u) setSrc(u); })
      .catch(() => { /* zůstane CSS truhla */ });
    return () => { zruseno = true; };
  }, [druh, velikost]);
  if (!src) {
    return <span className={`hx-truhla hx-mala shrink-0 ${className}`} data-druh={druh}><span className="hx-vika" /><span className="hx-telo" /><span className="hx-zamek" /></span>;
  }
  // eslint-disable-next-line @next/next/no-img-element -- obrázek z prohlížeče (blob URL)
  return <img src={src} alt="" className={`shrink-0 ${className}`} style={{ width: velikost, height: velikost, objectFit: "contain" }} data-truhla3d={druh} draggable={false} />;
}
