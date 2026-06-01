// Druhý batch oprav: cisselne_rady + vyrazy
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../src/data/databaze.json");
const db = JSON.parse(readFileSync(dbPath, "utf-8"));

const fixes = {

  // ── ČÍSELNÉ ŘADY ────────────────────────────────────────────────────────────

  CIS_013: [
    "Najdi vzor: 7−3=4, 11−7=4, 15−11=4 → rozdíl vždy +4 (aritmetická posloupnost)",
    "Společný rozdíl d = 4",
    "Další člen: 15 + 4 = 19",
  ],
  CIS_014: [
    "Najdi vzor v rozdílech: 3−1=2, 6−3=3, 10−6=4, 15−10=5 → rozdíly rostou o 1",
    "Jsou to trojúhelníková čísla: 1, 1+2, 1+2+3, 1+2+3+4, 1+2+3+4+5, ...",
    "Další rozdíl: +6 → 15 + 6 = 21",
  ],
  CIS_015: [
    "Fibonacciho posloupnost: každý člen = součet dvou PŘEDCHOZÍCH",
    "2+3=5 ✓, 3+5=8 ✓, 5+8=13 ✓",
    "Další člen: 8 + 13 = 21",
  ],
  CIS_016: [
    "Najdi vzor: 64÷32=2, 32÷16=2, 16÷8=2 → kvocient q = 2, ale dělíme (q = 1/2)",
    "Geometrická posloupnost: každý člen = předchozí ÷ 2",
    "Další člen: 8 ÷ 2 = 4",
  ],
  CIS_017: [
    "Aritmetická posloupnost: a₁ = 3, společný rozdíl d = 4",
    "Vzorec n-tého členu: aₙ = a₁ + (n−1) · d",
    "Pro n = 5: a₅ = 3 + (5−1) · 4 = 3 + 16 = 19",
    "Ověření: 3, 7, 11, 15, 19 ✓",
  ],
  CIS_018: [
    "Součet 1+2+3+...+n — Gaussův vzorec: S = n · (první + poslední) ÷ 2",
    "Intuice: spáruj 1+10=11, 2+9=11, ... → 5 párů po 11 = 55",
    "Vzorec: S = 10 · (1+10) ÷ 2 = 10 · 11 ÷ 2 = 55",
  ],
  CIS_019: [
    "Geometrická posloupnost: a₁ = 2, kvocient q = 3 (každý člen ×3: 2→6→18)",
    "Vzorec n-tého členu: aₙ = a₁ · q^(n−1)",
    "Pro n = 4: a₄ = 2 · 3^(4−1) = 2 · 3³ = 2 · 27 = 54",
  ],
  CIS_020: [
    "Najdi vzor v rozdílech: 2−1=1, 4−2=2, 7−4=3, 11−7=4 → rozdíly rostou o 1",
    "Příští rozdíl: +5",
    "Další člen: 11 + 5 = 16",
  ],
  CIS_021: [
    "Aritmetická posloupnost: a₁ = 5, d = 3 (8−5=3, 11−8=3 ✓)",
    "Vzorec: aₙ = a₁ + (n−1) · d",
    "a₁₀ = 5 + (10−1) · 3 = 5 + 27 = 32",
  ],
  CIS_022: [
    "Geometrická posloupnost: kvocient q = 2 (každý člen ×2)",
    "Ověření: 5×2=10, 10×2=20, 20×2=40 ✓",
    "Další člen: 40 × 2 = 80",
  ],
  CIS_023: [
    "Sudá čísla 2, 4, 6, ..., 20: je jich 10 (n = 10)",
    "Gaussův vzorec: S = n · (a₁ + aₙ) ÷ 2 = 10 · (2 + 20) ÷ 2 = 10 · 11 = 110",
    "Nebo: S = 2·(1+2+...+10) = 2 · 55 = 110",
  ],
  CIS_024: [
    "Geometrická posloupnost: 256÷128=2, 128÷64=2 → kvocient q = 1/2 (dělíme 2)",
    "Další člen: 32 ÷ 2 = 16",
  ],
  CIS_025: [
    "Jsou to druhé mocniny (čtverce): 1²=1, 2²=4, 3²=9, 4²=16, 5²=25",
    "Vzor: n-tý člen = n²",
    "Šestý člen: 6² = 36",
  ],
  CIS_026: [
    "Aritmetická posloupnost: a₁ = 2, d = 3",
    "Vzorec: aₙ = a₁ + (n−1) · d",
    "a₂₀ = 2 + (20−1) · 3 = 2 + 19 · 3 = 2 + 57 = 59",
  ],
  CIS_027: [
    "Gaussův vzorec: S = n · (n+1) / 2",
    "Proč? Spáruj: 1+100=101, 2+99=101, ... → 50 párů po 101 = 5050",
    "S = 100 · 101 ÷ 2 = 5050",
  ],
  CIS_028: [
    "Klesající aritmetická posloupnost: a₁ = 10, d = 7−10 = −3",
    "Vzorec: aₙ = a₁ + (n−1) · d",
    "a₁₅ = 10 + (15−1) · (−3) = 10 − 42 = −32",
    "Pozor: záporný d → posloupnost klesá!",
  ],
  CIS_029: [
    "Máme vzorec: aₙ = n² + 1",
    "Dosadíme n = 7: a₇ = 7² + 1 = 49 + 1 = 50",
    "Ověření prvních pár členů: a₁=2, a₂=5, a₃=10, a₄=17... ✓",
  ],
  CIS_030: [
    "Geometrická posloupnost: q = 3 (3×3=9, 9×3=27, 27×3=81 ✓)",
    "Jsou to mocniny trojky: 3¹, 3², 3³, 3⁴, 3⁵",
    "Další člen: 81 × 3 = 243 (= 3⁵)",
  ],
  CIS_031: [
    "Lichá čísla 1, 3, 5, ..., 19: je jich 10 (n = 10)",
    "Gaussův vzorec: S = n · (a₁ + aₙ) ÷ 2 = 10 · (1+19) ÷ 2 = 10 · 10 = 100",
    "Zajímavost: součet prvních n lichých čísel je vždy n² (10² = 100) ✓",
  ],
  CIS_032: [
    "Fibonacciho posloupnost: každý člen = součet dvou předchozích",
    "1, 1, 2, 3, 5, 8, 13, 21, ...",
    "6. člen: 5 + 3 = 8",
  ],

  // ── VÝRAZY — DOSAZOVÁNÍ ─────────────────────────────────────────────────────

  VYR_009: [
    "Dosadíme x = 4 do výrazu (x−1)(x+1):",
    "(4−1) · (4+1) = 3 · 5 = 15",
    "Alternativa: vzorec rozdílu čtverců → x²−1 = 4²−1 = 16−1 = 15",
  ],
  VYR_010: [
    "Dosadíme x = 3: x²−2x+1",
    "x² = 3² = 9",
    "2x = 2·3 = 6",
    "Výsledek: 9 − 6 + 1 = 4",
    "Tip: x²−2x+1 = (x−1)² = (3−1)² = 2² = 4 ✓",
  ],
  VYR_011: [
    "Dosadíme x = 2 do (x+3)²:",
    "Nejdříve závorka: x+3 = 2+3 = 5",
    "Pak mocnina: 5² = 25",
  ],
  VYR_012: [
    "Dosadíme x = −1 do x²+x−1:",
    "Pozor na záporné číslo! (−1)² = +1 (záporné číslo na sudou mocninu = kladné)",
    "x² = (−1)² = 1",
    "x = −1",
    "Výsledek: 1 + (−1) − 1 = −1",
  ],
  VYR_013: [
    "Dosadíme t = 3 do (2t−1)²:",
    "Nejdříve závorka: 2t−1 = 2·3−1 = 6−1 = 5",
    "Pak mocnina: 5² = 25",
  ],
  VYR_014: [
    "Dosadíme a=5, b=3 do (a+b)(a−b):",
    "(5+3) · (5−3) = 8 · 2 = 16",
    "Vzorec rozdílu čtverců: (a+b)(a−b) = a²−b² = 25−9 = 16 ✓",
  ],
  VYR_015: [
    "Dosadíme x = 5 do x²−3x+2:",
    "x² = 25",
    "3x = 15",
    "Výsledek: 25 − 15 + 2 = 12",
  ],
  VYR_016: [
    "Dosadíme x = 4 do √x + x/2:",
    "√4 = 2 (protože 2² = 4)",
    "x/2 = 4/2 = 2",
    "Výsledek: 2 + 2 = 4",
  ],
  VYR_017: [
    "Dosadíme x = 3 do 2x²−x−3:",
    "x² = 9 → 2x² = 18",
    "x = 3",
    "Výsledek: 18 − 3 − 3 = 12",
  ],
  VYR_018: [
    "Dosadíme x=6, y=4 do x+y+xy:",
    "x+y = 6+4 = 10",
    "xy = 6·4 = 24",
    "Výsledek: 10 + 24 = 34",
  ],
  VYR_019: [
    "Dosadíme x = 2 do x³−x²+x−1:",
    "x³ = 2³ = 8",
    "x² = 2² = 4",
    "Výsledek: 8 − 4 + 2 − 1 = 5",
  ],
  VYR_020: [
    "Dosadíme a=5, b=3 do a²−2ab+b²:",
    "Poznáme vzorec: (a−b)² = a²−2ab+b²",
    "(5−3)² = 2² = 4",
    "Nebo přímo: 25 − 2·15 + 9 = 25 − 30 + 9 = 4",
  ],
  VYR_021: [
    "Dosadíme x = 2 do 2^x + x² + x:",
    "2^x = 2² = 4 (2 na druhou)",
    "x² = 2² = 4",
    "x = 2",
    "Výsledek: 4 + 4 + 2 = 10",
  ],
  VYR_022: [
    "Dosadíme x = 3 do x³−3x²+3x−1:",
    "Poznáme vzorec: (x−1)³ = x³−3x²+3x−1",
    "(3−1)³ = 2³ = 8",
    "Nebo přímo: 27 − 27 + 9 − 1 = 8 ✓",
  ],
  VYR_023: [
    "Dosadíme x=6, y=4 do (x+y)/(x−y):",
    "Čitatel: x+y = 6+4 = 10",
    "Jmenovatel: x−y = 6−4 = 2",
    "Výsledek: 10 ÷ 2 = 5",
  ],
};

let updated = 0;
for (const ex of db.examples) {
  if (fixes[ex.id]) {
    ex.reseni_kroky = fixes[ex.id];
    updated++;
  }
}

writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
console.log(`✅ Aktualizováno ${updated} příkladů (batch 2)`);
