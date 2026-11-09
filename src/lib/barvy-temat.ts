import type { CSSProperties } from "react";

/**
 * Každý okruh má svou barvu a ikonu, aby appka nebyla jednobarevná a žák okruh poznal na první pohled.
 * `barva` je plná (text, pruh postupu, dlaždice s bílým textem), `tint` světlé pozadí. Barvy mají proti bílé kontrast aspoň 4,5 : 1.
 * Tmavý režim si světlé pozadí dopočítá v globals.css (třídy tema-tint, tema-tint-fill, tema-text).
 * Ikona je obsah atributu `d` v mřížce 24 × 24 (kreslí se tahem, ne výplní).
 */
export interface VzhledTematu {
  barva: string;
  tint: string;
  ikona: string;
}

const MODRA = { barva: "#2E6DA4", tint: "#E4EEF7" };
const JANTAR = { barva: "#A66300", tint: "#FDF0DA" };
const FIALOVA = { barva: "#5B55D6", tint: "#EBEAFE" };
const RUZOVA = { barva: "#C2366B", tint: "#FCE7EF" };
const TYRKYS = { barva: "#0F7F76", tint: "#DDF3F0" };
const ORANZ = { barva: "#C4521A", tint: "#FDE9DE" };
const ZELENA = { barva: "#3B7A24", tint: "#E8F4DF" };
const PURPUR = { barva: "#8E3FA8", tint: "#F4E7F9" };
const BRIDLICE = { barva: "#44507A", tint: "#E9EBF3" };

const POCITANI = "M3 6h6M6 3v6M15 6h6M4 15l5 5M9 15l-5 5M15 16h6M15 20h6";
const BUBLINA = "M4 5h16v11H9l-5 4V5ZM8 9h8M8 12.5h5";
const ZLOMEK = "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18ZM12 3v18M12 12h9";
const KRUZITKO = "M12 3v3M12 6L6 21M12 6l6 15M8.5 15h7";
const GRAF = "M4 20h16M7 20v-6M12 20V6M17 20V10";

const VZHLED: Record<string, VzhledTematu> = {
  // 5. třída
  p5_pocitani: { ...MODRA, ikona: POCITANI },
  p5_jednotky: { ...JANTAR, ikona: "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18ZM12 7v5l3.5 2" },
  p5_slovni: { ...FIALOVA, ikona: BUBLINA },
  p5_zlomky: { ...RUZOVA, ikona: ZLOMEK },
  p5_obsah: { ...TYRKYS, ikona: "M4 4h16v16H4ZM4 12h16M12 4v16" },
  p5_telesa: { ...ORANZ, ikona: "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3ZM4 7.5l8 4.5l8-4.5M12 12v9" },
  p5_rysovani: { ...ZELENA, ikona: KRUZITKO },
  p5_grafy: { ...PURPUR, ikona: GRAF },
  // 9. třída
  zlomky: { ...RUZOVA, ikona: ZLOMEK },
  vyrazy: { ...MODRA, ikona: POCITANI },
  rovnice: { ...FIALOVA, ikona: "M5 9h14M5 15h14" },
  geometrie: { ...TYRKYS, ikona: "M12 4l9 16H3L12 4Z" },
  slovni_ulohy: { ...JANTAR, ikona: BUBLINA },
  grafy_logika: { ...PURPUR, ikona: GRAF },
  konstrukce: { ...ZELENA, ikona: KRUZITKO },
  uhly: { ...ORANZ, ikona: "M4 20L19 5M4 20h16M12.5 20a8.5 8.5 0 0 0-2.5-6" },
  souhrnne: { ...BRIDLICE, ikona: "M12 3l2.7 5.6l6.1.8l-4.4 4.3l1 6.1l-5.4-2.9l-5.4 2.9l1-6.1l-4.4-4.3l6.1-.8L12 3Z" },
};

const VYCHOZI: VzhledTematu = { ...MODRA, ikona: POCITANI };

export function vzhledTematu(tema: string): VzhledTematu {
  return VZHLED[tema] ?? VYCHOZI;
}

/** Barvy okruhu jako proměnné CSS pro prvek a jeho potomky. */
export function temaStyl(tema: string): CSSProperties {
  const { barva, tint } = vzhledTematu(tema);
  return { "--tema-barva": barva, "--tema-tint": tint } as CSSProperties;
}
