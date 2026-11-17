"use client";

import { forwardRef, useMemo } from "react";
import { hexikSvg } from "@/lib/hexik-svg";

interface Props {
  podoba: string;
  etapa?: number;
  className?: string;
  /** Bez vznášení (náhledy v mřížce). */
  staticky?: boolean;
  style?: React.CSSProperties;
}

/** Hexík (avatar žáka). SVG je naše vlastní kresba, žádný vstup od uživatele. */
const Hexik = forwardRef<HTMLSpanElement, Props>(function Hexik({ podoba, etapa = 1, className = "", staticky, style }, ref) {
  const html = useMemo(() => hexikSvg(podoba, etapa), [podoba, etapa]);
  return (
    <span
      ref={ref}
      className={`${staticky ? "block" : "hx"} ${className}`}
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

export default Hexik;
