"use client";

import type { TaskImage } from "@/types";
import DiagramView from "./DiagramView";

/**
 * Vykreslí obrázek úlohy podle hybridního modelu:
 *  - "parametric" → ostré, dark-mode-aware SVG přes DiagramView (opakující se typy),
 *  - "static"     → obrázek ze souboru v public/obrazky/ (nepravidelný dlouhý ocas).
 *
 * Statický obrázek dostává bílé pozadí a rámeček, aby figura s tmavými tahy byla
 * čitelná i v tmavém režimu (statika na téma nereaguje). Preferuj SVG s
 * průhledným pozadím. Viz docs/OBRAZKOVE_ULOHY_STRATEGIE.md.
 */
export default function TaskImageView({ image }: { image: TaskImage }) {
  if (image.kind === "parametric") {
    return <DiagramView diagram={image.diagram} />;
  }

  return (
    <div className="w-full flex justify-center my-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        width={image.width}
        height={image.height}
        alt={image.alt}
        loading="lazy"
        className="rounded-xl"
        style={{
          maxWidth: "100%",
          height: "auto",
          background: "#fff",
          border: "1px solid #e2e8f0",
          padding: 8,
        }}
      />
    </div>
  );
}
