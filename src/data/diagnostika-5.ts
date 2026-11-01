import { examples5 } from "@/data/examples";
import type { DBExample } from "@/types";
import { TEMATA_ORDER_5 } from "@/types";

/**
 * Diagnostika pro 5. třídu: z každého okruhu tři úlohy z databáze 5. třídy (L1, L2, L3).
 * Žák dostane nejdřív L2; když ji zvládne, dostane L3, jinak L1 (stejně jako u 9. třídy).
 * Úlohy jsou záměrně z různých typů (výpočet, slovní úloha, obrázek, výběr, rýsování), nejsou příliš dlouhé
 * a jejich správné odpovědi hlídá audit odpovědí.
 */
export const DIAG5_IDS: Record<(typeof TEMATA_ORDER_5)[number], [string, string, string]> = {
  p5_pocitani: ["P5_POC_03", "P5_POC_35", "P5_POC_42"],
  p5_jednotky: ["P5_JED_03", "P5_JED_08", "P5_JED_09"],
  p5_slovni: ["P5_SLO_16", "P5_SLO_07", "P5_SLO_15"],
  p5_zlomky: ["P5_ZLO_02", "P5_ZLO_39", "P5_ZLO_12"],
  p5_obsah: ["P5_OBS_31", "P5_OBS_08", "P5_OBS_26"],
  p5_telesa: ["P5_TEL_20", "P5_TEL_05", "P5_TEL_14"],
  p5_rysovani: ["P5_RYS_03", "P5_RYS_04", "P5_RYS_11"],
  p5_grafy: ["P5_GRA_16", "P5_GRA_35", "P5_GRA_41"],
};

/** Otázka diagnostiky pro daný okruh a úroveň (1–3). */
export function diag5Question(tema: string, level: 1 | 2 | 3): DBExample {
  const ids = DIAG5_IDS[tema as keyof typeof DIAG5_IDS];
  const q = ids ? examples5.find((e) => e.id === ids[level - 1]) : undefined;
  if (!q) throw new Error(`Diagnostika 5: chybí otázka ${tema} L${level}`);
  return q;
}
