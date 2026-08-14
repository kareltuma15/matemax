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

  if (image.kind === "tabulka") {
    const cell = (v: string | number | null) => (v === null || v === undefined ? "?" : String(v));
    return (
      <figure className="my-1 w-full">
        {image.nazev && (
          <figcaption className="text-center text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            {image.nazev}
          </figcaption>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" style={{ color: "var(--text-primary)" }}>
            <thead>
              <tr>
                {image.hlavicka.map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 font-bold text-center"
                    style={{ background: "#eff6ff", border: "1px solid #cbd5e1", color: "#2E6DA4" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {image.radky.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-2 text-center ${ci === 0 ? "font-semibold" : ""} ${c === null ? "font-black" : ""}`}
                      style={{
                        border: "1px solid #cbd5e1",
                        background: ci === 0 ? "#f8fafc" : "transparent",
                        color: c === null ? "#2E6DA4" : "var(--text-primary)",
                      }}
                    >
                      {cell(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </figure>
    );
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
