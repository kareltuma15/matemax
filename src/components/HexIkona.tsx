import type { ReactNode } from "react";
import { vzhledTematu } from "@/lib/barvy-temat";

/** Šestiúhelník je motiv značky Matematika Snadno; souřadnice v mřížce 48 × 48. */
export const HEX_BODY = "24,2 43,13 43,35 24,46 5,35 5,13";

/** Ikona okruhu v šestiúhelníku v barvě okruhu. Rodič musí nastavit `temaStyl(tema)`. */
export function HexIkona({ tema, velikost = 48 }: { tema: string; velikost?: number }) {
  return (
    <svg aria-hidden="true" width={velikost} height={velikost} viewBox="0 0 48 48" className="shrink-0">
      <polygon points={HEX_BODY} className="tema-tint-fill" />
      <g transform="translate(12 12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tema-text">
        <path d={vzhledTematu(tema).ikona} />
      </g>
    </svg>
  );
}

/** Tmavá hlavička se dvěma levandulovými šestiúhelníky v rohu. */
export function HlavickaZnacky({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[20px] p-5 text-white" style={{ background: "#0D1B3E" }}>
      <svg aria-hidden="true" width="150" height="130" viewBox="0 0 150 130" className="absolute" style={{ right: -24, top: -18 }}>
        <polygon points="60,8 96,29 96,71 60,92 24,71 24,29" fill="#AFACFB" opacity="0.22" />
        <polygon points="118,62 146,78 146,110 118,126 90,110 90,78" fill="#AFACFB" opacity="0.14" />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}
