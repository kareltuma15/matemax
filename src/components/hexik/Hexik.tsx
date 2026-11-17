"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { hexikSvg, podobaHexika } from "@/lib/hexik-svg";
import type { Hexik3D } from "@/lib/hexik3d/scena";

interface Props {
  podoba: string;
  etapa?: number;
  className?: string;
  /** Bez vznášení (náhledy v mřížce). */
  staticky?: boolean;
  style?: React.CSSProperties;
  /**
   * 3D Hexík (Sbírka, šatník, oslavy, u příkladu). `"setrne"` = v klidu se nekreslí, jen při reakci (u příkladů).
   * Bez WebGL zůstane 2D kresba. Načítá se zvlášť, takže 3D knihovna nezpomalí stránky bez 3D Hexíka.
   */
  d3?: boolean | "setrne";
  /** Otáčení tažením (jen s d3). */
  otacet?: boolean;
}

/** Reakce Hexíka (jásot, tanec…) přichází jako událost na prvku, viz hexik-efekty.ts → reaguj. */
export const HEXIK_REAKCE_EVENT = "hx-reakce";

/** Hexík (avatar žáka). SVG je naše vlastní kresba, žádný vstup od uživatele. */
const Hexik = forwardRef<HTMLSpanElement, Props>(function Hexik({ podoba, etapa = 1, className = "", staticky, style, d3, otacet }, ref) {
  const html = useMemo(() => hexikSvg(podoba, etapa), [podoba, etapa]);
  // Záře kolem 3D Hexíka stejně jako u 2D (zlatý, neon…; v 5. etapě s čepicí zlatá)
  const pp = podobaHexika(podoba);
  const zare = pp.svit === "hx-svit-zlato" || (etapa >= 5 && pp.hlava) ? "zlato" : pp.svit === "hx-svit-cyan" ? "cyan" : undefined;
  const obal = useRef<HTMLSpanElement | null>(null);
  const inst = useRef<Hexik3D | null>(null);
  const [je3d, setJe3d] = useState(false);
  const posledni = useRef({ podoba, etapa });
  posledni.current = { podoba, etapa };

  // Spuštění 3D (jen v prohlížeči, knihovna se načte až teď)
  useEffect(() => {
    if (!d3 || !obal.current) return;
    let zruseno = false;
    let canvas: HTMLCanvasElement | null = null;
    import("@/lib/hexik3d/scena").then(({ vytvorHexika3D, umi3D }) => {
      if (zruseno || !obal.current || !umi3D()) return;
      canvas = document.createElement("canvas");
      canvas.className = "hx-canvas";
      if (otacet) canvas.style.cursor = "grab";
      obal.current.appendChild(canvas);
      try {
        inst.current = vytvorHexika3D(canvas, posledni.current.podoba, posledni.current.etapa, { otacet, setrne: d3 === "setrne" });
        setJe3d(true);
      } catch {
        canvas.remove(); canvas = null;
      }
    }).catch(() => { /* bez 3D zůstane 2D */ });
    const el = obal.current;
    const naReakci = (e: Event) => inst.current?.reaguj((e as CustomEvent<string>).detail);
    el.addEventListener(HEXIK_REAKCE_EVENT, naReakci);
    return () => {
      zruseno = true;
      el.removeEventListener(HEXIK_REAKCE_EVENT, naReakci);
      inst.current?.znic(); inst.current = null;
      canvas?.remove();
      setJe3d(false);
    };
  }, [d3, otacet]);

  useEffect(() => { inst.current?.nastav(podoba, etapa); }, [podoba, etapa]);

  return (
    <span
      ref={(el) => {
        obal.current = el;
        if (typeof ref === "function") ref(el); else if (ref) ref.current = el;
      }}
      className={`${staticky ? "block" : "hx"} ${d3 ? "hx-obal3d" : ""} ${je3d ? "hx-3d" : ""} ${className}`}
      style={style}
      aria-hidden="true"
      data-3d={je3d ? "1" : undefined}
      data-zare={zare}
    >
      <span className="hx-svg" dangerouslySetInnerHTML={{ __html: html }} />
    </span>
  );
});

export default Hexik;
