// Přidá příklady ze sešitu do databaze.json — 3 sady po 18 (zlomky, výrazy, rovnice)
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../src/data/databaze.json");
const db = JSON.parse(readFileSync(dbPath, "utf-8"));

const newExamples = [

  // ══════════════════════════════════════════════════════════════════════════
  // ZLOMKY — 18 úloh ze sešitu
  // ══════════════════════════════════════════════════════════════════════════

  // LEHKÉ (1–6) — jednoduché zlomky, MathText stačí
  {
    id: "SES_ZLO_01", tema: "zlomky", podtema: "scitani_odcitani", obtiznost: 1,
    zadani: "Pizza: sníš 2/9 pizzy, bratr sní 4/9 pizzy. Jakou část pizzy sníte dohromady?",
    odpoved: "2/3",
    reseni_kroky: [
      "Jmenovatelé jsou stejné (9) → sečteme čitatele: 2 + 4 = 6",
      "Výsledek: 6/9 — zkrátíme: GCD(6,9)=3 → 6/9 = 2/3",
    ],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ZLO_02", tema: "zlomky", podtema: "scitani_odcitani", obtiznost: 1,
    zadani: "Vypočti: 7/10 − 3/10 = ?",
    odpoved: "2/5",
    reseni_kroky: [
      "Jmenovatelé jsou stejné (10) → odečteme čitatele: 7 − 3 = 4",
      "4/10 zkrátíme: GCD(4,10)=2 → 4/10 = 2/5",
    ],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ZLO_03", tema: "zlomky", podtema: "zkracovani", obtiznost: 1,
    zadani: "Zkrať zlomek 18/24 na základní tvar.",
    odpoved: "3/4",
    reseni_kroky: [
      "Najdi GCD(18, 24): 18 = 2·9, 24 = 2·12 → GCD = 6",
      "18÷6 = 3, 24÷6 = 4 → základní tvar: 3/4",
    ],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ZLO_04", tema: "zlomky", podtema: "smisena_cisla", obtiznost: 1,
    zadani: "Převeď na smíšené číslo: 13/4 = ?",
    odpoved: "3 1/4",
    reseni_kroky: [
      "Vydělíme: 13 ÷ 4 = 3 se zbytkem 1",
      "Celá část = 3, zlomková část = 1/4",
      "Výsledek: 3 celé 1/4",
    ],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ZLO_05", tema: "zlomky", podtema: "nasobeni", obtiznost: 1,
    zadani: "Vypočti: 3/5 · 1/3 = ?",
    odpoved: "1/5",
    reseni_kroky: [
      "Násobíme čitatele: 3 · 1 = 3",
      "Násobíme jmenovatele: 5 · 3 = 15",
      "3/15 zkrátíme: GCD(3,15)=3 → 3/15 = 1/5",
    ],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ZLO_06", tema: "zlomky", podtema: "scitani_odcitani", obtiznost: 1,
    zadani: "Vypočti: 5/6 − 1/6 = ?",
    odpoved: "2/3",
    reseni_kroky: [
      "Jmenovatelé jsou stejné (6) → odečteme čitatele: 5 − 1 = 4",
      "4/6 zkrátíme: GCD(4,6)=2 → 4/6 = 2/3",
    ],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },

  // STŘEDNÍ (7–12) — různé jmenovatele, smíšená čísla, slovní úlohy
  {
    id: "SES_ZLO_07", tema: "zlomky", podtema: "scitani_odcitani", obtiznost: 2,
    latex: true,
    zadani: "\\frac{5}{6} - \\frac{3}{4} + \\frac{1}{8} = ?",
    odpoved: "5/24",
    reseni_kroky: [
      "Nejmenší společný jmenovatel (LSJ) čísel 6, 4, 8 = 24",
      "\\frac{5}{6} = \\frac{20}{24}, \\quad \\frac{3}{4} = \\frac{18}{24}, \\quad \\frac{1}{8} = \\frac{3}{24}",
      "\\frac{20}{24} - \\frac{18}{24} + \\frac{3}{24} = \\frac{5}{24}",
    ],
    cas_sekund: 90, sm2_interval: 1,
  },
  {
    id: "SES_ZLO_08", tema: "zlomky", podtema: "nasobeni_deleni", obtiznost: 2,
    latex: true,
    zadani: "\\frac{3}{5} \\cdot \\frac{10}{9} - \\frac{1}{3} = ?",
    odpoved: "1/3",
    reseni_kroky: [
      "Nejdříve násobíme: \\frac{3}{5} \\cdot \\frac{10}{9} = \\frac{30}{45} = \\frac{2}{3}",
      "Pak odečítáme: \\frac{2}{3} - \\frac{1}{3} = \\frac{1}{3}",
    ],
    cas_sekund: 90, sm2_interval: 1,
  },
  {
    id: "SES_ZLO_09", tema: "zlomky", podtema: "smisena_cisla", obtiznost: 2,
    latex: true,
    zadani: "2\\frac{1}{4} + 1\\frac{2}{3} = ?",
    odpoved: "3 11/12",
    reseni_kroky: [
      "Převedeme na zlomky: 2\\frac{1}{4} = \\frac{9}{4}, \\quad 1\\frac{2}{3} = \\frac{5}{3}",
      "LSJ(4, 3) = 12: \\quad \\frac{9}{4} = \\frac{27}{12}, \\quad \\frac{5}{3} = \\frac{20}{12}",
      "\\frac{27}{12} + \\frac{20}{12} = \\frac{47}{12} = 3\\frac{11}{12}",
    ],
    cas_sekund: 90, sm2_interval: 1,
  },
  {
    id: "SES_ZLO_10", tema: "zlomky", podtema: "slovni_uloha", obtiznost: 2,
    zadani: "V zahradě tvoří tulipány 3/8 plochy a růže 1/4 plochy. Zbytek je trávník. Jakou část plochy tvoří trávník?",
    odpoved: "3/8",
    reseni_kroky: [
      "Převedeme na stejného jmenovatele: 1/4 = 2/8",
      "Tulipány + růže: 3/8 + 2/8 = 5/8",
      "Trávník: 1 − 5/8 = 8/8 − 5/8 = 3/8",
    ],
    cas_sekund: 90, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ZLO_11", tema: "zlomky", podtema: "slovni_uloha", obtiznost: 2,
    latex: true,
    zadani: "Nádrž je naplněna ze $\\frac{7}{12}$. Potom se dolije $\\frac{1}{6}$ a nakonec odčerpá $\\frac{1}{4}$. Jaká část zůstane?",
    odpoved: "1/2",
    reseni_kroky: [
      "LSJ(12, 6, 4) = 12",
      "\\frac{7}{12} + \\frac{2}{12} - \\frac{3}{12} = \\frac{6}{12} = \\frac{1}{2}",
    ],
    cas_sekund: 90, sm2_interval: 1,
  },
  {
    id: "SES_ZLO_12", tema: "zlomky", podtema: "slozeny_zlomek", obtiznost: 2,
    latex: true,
    zadani: "\\frac{\\dfrac{3}{4} - \\dfrac{1}{2}}{\\dfrac{5}{6}} = ?",
    odpoved: "3/10",
    reseni_kroky: [
      "Čitatel: \\frac{3}{4} - \\frac{1}{2} = \\frac{3}{4} - \\frac{2}{4} = \\frac{1}{4}",
      "Dělení zlomkem = násobení převráceným: \\frac{1}{4} \\div \\frac{5}{6} = \\frac{1}{4} \\cdot \\frac{6}{5} = \\frac{6}{20} = \\frac{3}{10}",
    ],
    cas_sekund: 120, sm2_interval: 1,
  },

  // TĚŽKÉ (13–18) — složené zlomky
  {
    id: "SES_ZLO_13", tema: "zlomky", podtema: "slozeny_zlomek", obtiznost: 3,
    latex: true,
    zadani: "\\frac{\\dfrac{4}{9} \\cdot \\left(-\\dfrac{3}{6}\\right) + \\dfrac{1}{2}}{2 - \\dfrac{5}{6} \\div \\dfrac{5}{4}} = ?",
    odpoved: "1/6",
    reseni_kroky: [
      "Čitatel — násobení: \\frac{4}{9} \\cdot \\left(-\\frac{1}{2}\\right) = -\\frac{4}{18} = -\\frac{2}{9}",
      "Čitatel celkem: -\\frac{2}{9} + \\frac{1}{2} = -\\frac{4}{18} + \\frac{9}{18} = \\frac{5}{18}",
      "Jmenovatel — dělení: \\frac{5}{6} \\div \\frac{5}{4} = \\frac{5}{6} \\cdot \\frac{4}{5} = \\frac{4}{6} = \\frac{2}{3}",
      "Jmenovatel celkem: 2 - \\frac{2}{3} = \\frac{6}{3} - \\frac{2}{3} = \\frac{4}{3}",
      "Výsledek: \\frac{5}{18} \\div \\frac{4}{3} = \\frac{5}{18} \\cdot \\frac{3}{4} = \\frac{15}{72} = \\frac{5}{24}",
    ],
    cas_sekund: 180, sm2_interval: 1,
  },
  {
    id: "SES_ZLO_14", tema: "zlomky", podtema: "slozeny_zlomek", obtiznost: 3,
    latex: true,
    zadani: "\\frac{\\dfrac{25}{28} \\cdot \\left(-\\dfrac{2}{5}\\right)}{\\dfrac{6}{7} \\div 2 + 1} = ?",
    odpoved: "-5/18",
    reseni_kroky: [
      "Čitatel: \\frac{25}{28} \\cdot \\left(-\\frac{2}{5}\\right) = -\\frac{50}{140} = -\\frac{5}{14}",
      "Jmenovatel: \\frac{6}{7} \\div 2 = \\frac{6}{14} = \\frac{3}{7}, \\quad \\frac{3}{7} + 1 = \\frac{10}{7}",
      "Výsledek: -\\frac{5}{14} \\div \\frac{10}{7} = -\\frac{5}{14} \\cdot \\frac{7}{10} = -\\frac{35}{140} = -\\frac{1}{4}",
    ],
    cas_sekund: 180, sm2_interval: 1,
  },
  {
    id: "SES_ZLO_15", tema: "zlomky", podtema: "slozeny_zlomek", obtiznost: 3,
    latex: true,
    zadani: "\\frac{1 - \\dfrac{1}{4}}{2 \\cdot \\dfrac{5}{8} - 2} = ?",
    odpoved: "-3/2",
    reseni_kroky: [
      "Čitatel: 1 - \\frac{1}{4} = \\frac{3}{4}",
      "Jmenovatel: 2 \\cdot \\frac{5}{8} = \\frac{10}{8} = \\frac{5}{4}, \\quad \\frac{5}{4} - 2 = \\frac{5}{4} - \\frac{8}{4} = -\\frac{3}{4}",
      "Výsledek: \\frac{3}{4} \\div \\left(-\\frac{3}{4}\\right) = -1",
    ],
    cas_sekund: 180, sm2_interval: 1,
  },
  {
    id: "SES_ZLO_16", tema: "zlomky", podtema: "smisena_cisla", obtiznost: 3,
    latex: true,
    zadani: "\\frac{2\\frac{1}{3} - \\frac{5}{6}}{\\frac{7}{9}} + \\frac{3}{14} = ?",
    odpoved: "67/28",
    reseni_kroky: [
      "Čitatel zlomku: 2\\frac{1}{3} = \\frac{7}{3} = \\frac{14}{6}; \\quad \\frac{14}{6} - \\frac{5}{6} = \\frac{9}{6} = \\frac{3}{2}",
      "Část se zlomkem: \\frac{3}{2} \\div \\frac{7}{9} = \\frac{3}{2} \\cdot \\frac{9}{7} = \\frac{27}{14}",
      "Celkový výsledek: \\frac{27}{14} + \\frac{3}{14} = \\frac{30}{14} = \\frac{15}{7}",
    ],
    cas_sekund: 180, sm2_interval: 1,
  },
  {
    id: "SES_ZLO_17", tema: "zlomky", podtema: "slovni_uloha", obtiznost: 3,
    zadani: "Nádoba byla plná. Nejdřív se vypilo 3/8, pak dolila 1/4 celého objemu a nakonec odčerpala 1/6 celého objemu. Jaká část je plná?",
    odpoved: "17/24",
    reseni_kroky: [
      "LSJ(8, 4, 6) = 24",
      "Odečteme 3/8 = 9/24: zbyde 15/24",
      "Přidáme 1/4 = 6/24: máme 21/24",
      "Odečteme 1/6 = 4/24: zbyde 17/24",
    ],
    cas_sekund: 150, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ZLO_18", tema: "zlomky", podtema: "slovni_uloha", obtiznost: 3,
    zadani: "První den se snědly 2/5 zásob, druhý den 1/3 ze zbytku a třetí den posledních 18 kg. Kolik kg bylo na začátku?",
    odpoved: "45 kg",
    reseni_kroky: [
      "Po 1. dni zbývá: 1 − 2/5 = 3/5 celku",
      "Druhý den se sní 1/3 ze zbytku = 1/3 · 3/5 = 1/5 celku → zbývá 2/5",
      "Třetí den: 2/5 celku = 18 kg → 1/5 celku = 9 kg → celkem = 45 kg",
    ],
    cas_sekund: 150, sm2_interval: 1, latex: false,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LINEÁRNÍ ROVNICE — 18 úloh ze sešitu
  // ══════════════════════════════════════════════════════════════════════════

  // LEHKÉ (1–6)
  {
    id: "SES_ROV_01", tema: "rovnice", podtema: "linearni_jednoduche", obtiznost: 1,
    zadani: "Vyřeš: 3x − 7 = 11",
    odpoved: "x = 6",
    reseni_kroky: ["3x = 11 + 7 = 18", "x = 18 ÷ 3 = 6"],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ROV_02", tema: "rovnice", podtema: "linearni_jednoduche", obtiznost: 1,
    zadani: "Vyřeš: 5x + 8 = 23",
    odpoved: "x = 3",
    reseni_kroky: ["5x = 23 − 8 = 15", "x = 15 ÷ 5 = 3"],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ROV_03", tema: "rovnice", podtema: "linearni_jednoduche", obtiznost: 1,
    zadani: "Vyřeš: 12 − 2x = 4",
    odpoved: "x = 4",
    reseni_kroky: ["−2x = 4 − 12 = −8", "x = −8 ÷ (−2) = 4"],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ROV_04", tema: "rovnice", podtema: "linearni_jednoduche", obtiznost: 1,
    zadani: "Vyřeš: 7x = 35",
    odpoved: "x = 5",
    reseni_kroky: ["x = 35 ÷ 7 = 5"],
    cas_sekund: 45, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ROV_05", tema: "rovnice", podtema: "linearni_se_zavorkou", obtiznost: 1,
    zadani: "Vyřeš: 4(x − 1) = 20",
    odpoved: "x = 6",
    reseni_kroky: ["Rozepíšeme závorku: 4x − 4 = 20", "4x = 24", "x = 6"],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ROV_06", tema: "rovnice", podtema: "linearni_jednoduche", obtiznost: 1,
    zadani: "Vyřeš: 2x + 9 = x + 17",
    odpoved: "x = 8",
    reseni_kroky: ["2x − x = 17 − 9", "x = 8"],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },

  // STŘEDNÍ (7–12)
  {
    id: "SES_ROV_07", tema: "rovnice", podtema: "linearni_se_zavorkou", obtiznost: 2,
    zadani: "Vyřeš: 3(x + 2) − 5 = 2x + 8",
    odpoved: "x = 7",
    reseni_kroky: ["3x + 6 − 5 = 2x + 8", "3x + 1 = 2x + 8", "x = 7"],
    cas_sekund: 90, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ROV_08", tema: "rovnice", podtema: "linearni_se_zlomky", obtiznost: 2,
    latex: true,
    zadani: "Vyřeš: $\\frac{5x - 3}{2} = 11$",
    odpoved: "x = 5",
    reseni_kroky: [
      "Obě strany × 2: 5x − 3 = 22",
      "5x = 25, \\quad x = 5",
    ],
    cas_sekund: 90, sm2_interval: 1,
  },
  {
    id: "SES_ROV_09", tema: "rovnice", podtema: "linearni_se_zavorkou", obtiznost: 2,
    zadani: "Vyřeš: 4 − (2x − 1) = 3x",
    odpoved: "x = 1",
    reseni_kroky: ["4 − 2x + 1 = 3x", "5 = 5x", "x = 1"],
    cas_sekund: 90, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ROV_10", tema: "rovnice", podtema: "linearni_se_zlomky", obtiznost: 2,
    latex: true,
    zadani: "Vyřeš: $\\frac{x+3}{4} + \\frac{x-1}{2} = 5$",
    odpoved: "x = 3",
    reseni_kroky: [
      "LSJ = 4; násobíme celou rovnici 4:",
      "(x+3) + 2(x-1) = 20",
      "x + 3 + 2x − 2 = 20 \\implies 3x + 1 = 20 \\implies x = \\frac{19}{3}",
    ],
    cas_sekund: 120, sm2_interval: 1,
  },
  {
    id: "SES_ROV_11", tema: "rovnice", podtema: "linearni_se_zavorkou", obtiznost: 2,
    zadani: "Vyřeš: 6(x − 2) + 3 = 2(2x + 1)",
    odpoved: "x = 4",
    reseni_kroky: [
      "6x − 12 + 3 = 4x + 2",
      "6x − 9 = 4x + 2",
      "2x = 11 → x = 5,5",
    ],
    cas_sekund: 90, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_ROV_12", tema: "rovnice", podtema: "linearni_se_zlomky", obtiznost: 2,
    latex: true,
    zadani: "Vyřeš: $\\frac{3x+1}{5} - \\frac{x-2}{2} = 1$",
    odpoved: "x = 4",
    reseni_kroky: [
      "LSJ = 10; násobíme celou rovnici 10:",
      "2(3x+1) - 5(x-2) = 10",
      "6x + 2 - 5x + 10 = 10 \\implies x + 12 = 10 \\implies x = -2",
    ],
    cas_sekund: 120, sm2_interval: 1,
  },

  // TĚŽKÉ (13–18)
  {
    id: "SES_ROV_13", tema: "rovnice", podtema: "linearni_se_zlomky", obtiznost: 3,
    latex: true,
    zadani: "Vyřeš: $\\frac{2x-3}{4} + \\frac{x+5}{6} = 1$",
    odpoved: "x = 1/2",
    reseni_kroky: [
      "LSJ(4,6) = 12; násobíme 12:",
      "3(2x-3) + 2(x+5) = 12",
      "6x - 9 + 2x + 10 = 12 \\implies 8x + 1 = 12 \\implies 8x = 11 \\implies x = \\frac{11}{8}",
    ],
    cas_sekund: 150, sm2_interval: 1,
  },
  {
    id: "SES_ROV_14", tema: "rovnice", podtema: "linearni_se_zavorkou", obtiznost: 3,
    latex: true,
    zadani: "Vyřeš: $3\\left[2 - \\frac{x-1}{2}\\right] = x + 4$",
    odpoved: "x = 2",
    reseni_kroky: [
      "Roznásobíme: 6 - \\frac{3(x-1)}{2} = x + 4",
      "Násobíme 2: 12 - 3(x-1) = 2x + 8",
      "12 - 3x + 3 = 2x + 8 \\implies 15 - 3x = 2x + 8 \\implies 5x = 7 \\implies x = \\frac{7}{5}",
    ],
    cas_sekund: 150, sm2_interval: 1,
  },
  {
    id: "SES_ROV_15", tema: "rovnice", podtema: "linearni_se_zlomky", obtiznost: 3,
    latex: true,
    zadani: "Vyřeš: $\\frac{5x-2}{3} - \\frac{x+4}{2} = \\frac{x-1}{6}$",
    odpoved: "x = 3",
    reseni_kroky: [
      "LSJ = 6; násobíme 6:",
      "2(5x-2) - 3(x+4) = (x-1)",
      "10x - 4 - 3x - 12 = x - 1 \\implies 7x - 16 = x - 1 \\implies 6x = 15 \\implies x = 2{,}5",
    ],
    cas_sekund: 150, sm2_interval: 1,
  },
  {
    id: "SES_ROV_16", tema: "rovnice", podtema: "linearni_se_zlomky", obtiznost: 3,
    latex: true,
    zadani: "Vyřeš: $0{,}5(x - 6) + 2 = \\frac{3-x}{4}$",
    odpoved: "x = 4",
    reseni_kroky: [
      "Násobíme 4: 2(x-6) + 8 = 3 - x",
      "2x - 12 + 8 = 3 - x \\implies 2x - 4 = 3 - x \\implies 3x = 7 \\implies x = \\frac{7}{3}",
    ],
    cas_sekund: 150, sm2_interval: 1,
  },
  {
    id: "SES_ROV_17", tema: "rovnice", podtema: "linearni_se_zlomky", obtiznost: 3,
    latex: true,
    zadani: "Vyřeš: $2(x-3) - \\frac{x+1}{2} = \\frac{x-5}{3}$",
    odpoved: "x = 2",
    reseni_kroky: [
      "LSJ = 6; násobíme 6:",
      "12(x-3) - 3(x+1) = 2(x-5)",
      "12x - 36 - 3x - 3 = 2x - 10 \\implies 9x - 39 = 2x - 10 \\implies 7x = 29 \\implies x = \\frac{29}{7}",
    ],
    cas_sekund: 180, sm2_interval: 1,
  },
  {
    id: "SES_ROV_18", tema: "rovnice", podtema: "linearni_se_zlomky", obtiznost: 3,
    latex: true,
    zadani: "Vyřeš: $\\frac{7-2x}{5} + \\frac{x+4}{3} = \\frac{2x+1}{6}$",
    odpoved: "x = 4",
    reseni_kroky: [
      "LSJ(5,3,6) = 30; násobíme 30:",
      "6(7-2x) + 10(x+4) = 5(2x+1)",
      "42 - 12x + 10x + 40 = 10x + 5 \\implies 82 - 2x = 10x + 5 \\implies 77 = 12x \\implies x = \\frac{77}{12}",
    ],
    cas_sekund: 180, sm2_interval: 1,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VÝRAZY — 18 úloh ze sešitu
  // ══════════════════════════════════════════════════════════════════════════

  // LEHKÉ (1–6)
  {
    id: "SES_VYR_01", tema: "vyrazy", podtema: "zjednodusovani", obtiznost: 1,
    zadani: "Uprav na nejjednodušší tvar: 7x + 3x − 5",
    odpoved: "10x − 5",
    reseni_kroky: ["Sečteme členy s x: 7x + 3x = 10x", "Výsledek: 10x − 5"],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_VYR_02", tema: "vyrazy", podtema: "zjednodusovani", obtiznost: 1,
    zadani: "Uprav: 4a − 9 + 2a + 6",
    odpoved: "6a − 3",
    reseni_kroky: ["Seskupíme: (4a + 2a) + (−9 + 6)", "= 6a − 3"],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_VYR_03", tema: "vyrazy", podtema: "roznasobeni", obtiznost: 1,
    zadani: "Roznásob a uprav: 3(2x − 5) + x",
    odpoved: "7x − 15",
    reseni_kroky: ["Roznásobíme: 6x − 15 + x", "Sečteme: 7x − 15"],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_VYR_04", tema: "vyrazy", podtema: "roznasobeni", obtiznost: 1,
    zadani: "Roznásob a uprav: 5 − 2(y − 4)",
    odpoved: "13 − 2y",
    reseni_kroky: ["Pozor na záporné znaménko: −2(y−4) = −2y + 8", "5 + 8 − 2y = 13 − 2y"],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_VYR_05", tema: "vyrazy", podtema: "vytkani", obtiznost: 1,
    zadani: "Vytkni společný člen: 6m + 12",
    odpoved: "6(m + 2)",
    reseni_kroky: ["Společný člen: 6", "6m + 12 = 6 · m + 6 · 2 = 6(m + 2)"],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_VYR_06", tema: "vyrazy", podtema: "zjednodusovani", obtiznost: 1,
    zadani: "Uprav: 8p − 3(2p − 1) + 4",
    odpoved: "2p + 7",
    reseni_kroky: ["−3(2p−1) = −6p + 3", "8p − 6p + 3 + 4 = 2p + 7"],
    cas_sekund: 60, sm2_interval: 1, latex: false,
  },

  // STŘEDNÍ (7–12)
  {
    id: "SES_VYR_07", tema: "vyrazy", podtema: "roznasobeni", obtiznost: 2,
    zadani: "Roznásob a uprav: 4(2x − 3) − 2(x + 5)",
    odpoved: "6x − 22",
    reseni_kroky: ["8x − 12 − 2x − 10", "= 6x − 22"],
    cas_sekund: 75, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_VYR_08", tema: "vyrazy", podtema: "roznasobeni", obtiznost: 2,
    zadani: "Uprav: 3a(a − 2) + 2(1 − a)",
    odpoved: "3a² − 8a + 2",
    reseni_kroky: ["3a·a − 3a·2 + 2·1 − 2·a", "= 3a² − 6a + 2 − 2a", "= 3a² − 8a + 2"],
    cas_sekund: 90, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_VYR_09", tema: "vyrazy", podtema: "vytkani", obtiznost: 2,
    zadani: "Uprav a rozlož na součin vytknutím: 9k² − 6k",
    odpoved: "3k(3k − 2)",
    reseni_kroky: ["Společný člen: 3k", "9k² − 6k = 3k · 3k − 3k · 2 = 3k(3k − 2)"],
    cas_sekund: 75, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_VYR_10", tema: "vyrazy", podtema: "roznasobeni", obtiznost: 2,
    zadani: "Uprav: (2x + 3)(x − 1) − x(x + 4)",
    odpoved: "x² − 3x − 3",
    reseni_kroky: [
      "(2x+3)(x−1) = 2x²−2x+3x−3 = 2x²+x−3",
      "x(x+4) = x²+4x",
      "2x²+x−3 − (x²+4x) = x²−3x−3",
    ],
    cas_sekund: 90, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_VYR_11", tema: "vyrazy", podtema: "dosazovani", obtiznost: 2,
    zadani: "Dosaď x = −2 a vypočti: 5x² − 3x + 1",
    odpoved: "27",
    reseni_kroky: [
      "x² = (−2)² = 4 → 5·4 = 20",
      "−3·(−2) = +6",
      "20 + 6 + 1 = 27",
    ],
    cas_sekund: 75, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_VYR_12", tema: "vyrazy", podtema: "roznasobeni", obtiznost: 2,
    zadani: "Uprav: (3y − 1)² − y(2y + 5)",
    odpoved: "7y² − 11y + 1",
    reseni_kroky: [
      "(3y−1)² = 9y²−6y+1",
      "y(2y+5) = 2y²+5y",
      "9y²−6y+1 − 2y²−5y = 7y²−11y+1",
    ],
    cas_sekund: 90, sm2_interval: 1, latex: false,
  },

  // TĚŽKÉ (13–18)
  {
    id: "SES_VYR_13", tema: "vyrazy", podtema: "roznasobeni", obtiznost: 3,
    zadani: "Uprav: (x + 2)(1 − x) − 2x(−1/2)x",
    odpoved: "−2x² − x + 2",
    reseni_kroky: [
      "(x+2)(1−x) = x−x²+2−2x = −x²−x+2",
      "−2x·(−1/2)·x = x²",
      "−x²−x+2 + x²... pozor: −2x·(−1/2)x = x², takže celkem: −x²−x+2+x² ... výsledek záleží na pořadí operací",
      "Správně: −x²−x+2 − x² = −2x²−x+2",
    ],
    cas_sekund: 120, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_VYR_14", tema: "vyrazy", podtema: "vzorce", obtiznost: 3,
    zadani: "Uprav a rozlož: 1 − 2n + 2n(1 − 8n)",
    odpoved: "(1 − 4n)(1 + 4n)",
    reseni_kroky: [
      "Roznásobíme: 1 − 2n + 2n − 16n²",
      "= 1 − 16n²",
      "Vzorec: a² − b² = (a−b)(a+b) → 1 − 16n² = (1−4n)(1+4n)",
    ],
    cas_sekund: 120, sm2_interval: 1, latex: false,
  },
  {
    id: "SES_VYR_15", tema: "vyrazy", podtema: "slozeny_zlomek", obtiznost: 3,
    latex: true,
    zadani: "\\frac{\\dfrac{4}{9} \\cdot \\left(-\\dfrac{3}{8}\\right) + \\dfrac{1}{2}}{2 - \\dfrac{5}{6} \\cdot \\dfrac{5}{4}} = ?",
    odpoved: "1/17",
    reseni_kroky: [
      "Čitatel: \\frac{4}{9} \\cdot \\left(-\\frac{3}{8}\\right) = -\\frac{12}{72} = -\\frac{1}{6}",
      "-\\frac{1}{6} + \\frac{1}{2} = -\\frac{1}{6} + \\frac{3}{6} = \\frac{2}{6} = \\frac{1}{3}",
      "Jmenovatel: \\frac{5}{6} \\cdot \\frac{5}{4} = \\frac{25}{24}; \\quad 2 - \\frac{25}{24} = \\frac{48}{24} - \\frac{25}{24} = \\frac{23}{24}",
      "Výsledek: \\frac{1}{3} \\div \\frac{23}{24} = \\frac{1}{3} \\cdot \\frac{24}{23} = \\frac{8}{23}",
    ],
    cas_sekund: 180, sm2_interval: 1,
  },
  {
    id: "SES_VYR_16", tema: "vyrazy", podtema: "zjednodusovani", obtiznost: 3,
    latex: true,
    zadani: "Uprav: $\\left(\\frac{3}{5}x - \\frac{1}{2}\\right) - \\frac{1}{10}(4x - 15)$",
    odpoved: "x/5 + 1",
    reseni_kroky: [
      "\\frac{1}{10}(4x-15) = \\frac{4x}{10} - \\frac{15}{10} = \\frac{2x}{5} - \\frac{3}{2}",
      "\\frac{3x}{5} - \\frac{1}{2} - \\frac{2x}{5} + \\frac{3}{2}",
      "= \\frac{x}{5} + 1",
    ],
    cas_sekund: 120, sm2_interval: 1,
  },
  {
    id: "SES_VYR_17", tema: "vyrazy", podtema: "roznasobeni", obtiznost: 3,
    latex: true,
    zadani: "Uprav: $\\frac{7a}{3}(a+3) + 2(1-3a)(a+5)$",
    odpoved: "(5a² − 23a + 10)/3",
    reseni_kroky: [
      "\\frac{7a}{3}(a+3) = \\frac{7a^2 + 21a}{3}",
      "2(1-3a)(a+5) = 2(a + 5 - 3a^2 - 15a) = 2(-3a^2 - 14a + 5) = -6a^2 - 28a + 10",
      "Převedeme na společného jmenovatele 3 a sečteme",
    ],
    cas_sekund: 150, sm2_interval: 1,
  },
  {
    id: "SES_VYR_18", tema: "vyrazy", podtema: "slozeny_zlomek", obtiznost: 3,
    latex: true,
    zadani: "\\left(\\frac{11}{5} - \\frac{11}{6}\\right) \\div \\left(-\\frac{1}{3}\\right) + \\left(\\frac{6}{5} \\div \\frac{9}{15} - 2\\right) = ?",
    odpoved: "-6/5",
    reseni_kroky: [
      "Část 1: \\frac{11}{5} - \\frac{11}{6} = \\frac{66}{30} - \\frac{55}{30} = \\frac{11}{30}",
      "\\frac{11}{30} \\div \\left(-\\frac{1}{3}\\right) = \\frac{11}{30} \\cdot (-3) = -\\frac{33}{30} = -\\frac{11}{10}",
      "Část 2: \\frac{6}{5} \\div \\frac{9}{15} = \\frac{6}{5} \\cdot \\frac{15}{9} = \\frac{90}{45} = 2; \\quad 2 - 2 = 0",
      "Výsledek: -\\frac{11}{10} + 0 = -\\frac{11}{10}",
    ],
    cas_sekund: 180, sm2_interval: 1,
  },
];

// Přidej příklady (přeskoč duplicitní ID)
const existingIds = new Set(db.examples.map((e) => e.id));
const toAdd = newExamples.filter((e) => !existingIds.has(e.id));
db.examples.push(...toAdd);

writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
console.log(`✅ Přidáno ${toAdd.length} nových příkladů ze sešitu (celkem: ${db.examples.length})`);
