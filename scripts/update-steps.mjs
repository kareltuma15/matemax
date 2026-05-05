import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "../src/data/databaze.json");
const db = JSON.parse(readFileSync(dbPath, "utf-8"));

// Improved reseni_kroky for first 30 examples (ZLO_001 – ZLO_030)
const improvedSteps = {
  ZLO_001: ["Jmenovatelé jsou stejné → sečteme jen čitatele: 1 + 1 = 2", "Výsledek: 2/3"],
  ZLO_002: ["Jmenovatelé jsou stejné → sečteme čitatele: 1 + 1 = 2", "2/4 zkrátíme: GCD(2,4) = 2 → 2/4 = 1/2"],
  ZLO_003: ["Jmenovatelé jsou stejné → sečteme čitatele: 2 + 1 = 3", "Výsledek: 3/5 (nelze zkrátit)"],
  ZLO_004: ["Hledáme NSN(3, 4) = 12", "Převedeme: 1/3 = 4/12 a 1/4 = 3/12", "Sečteme: 4/12 + 3/12 = 7/12"],
  ZLO_005: ["Hledáme NSN(2, 6) = 6", "Převedeme: 1/2 = 3/6, 1/6 zůstává 1/6", "Sečteme: 3/6 + 1/6 = 4/6 = 2/3"],
  ZLO_006: ["Jmenovatelé jsou stejné → odečteme čitatele: 3 − 1 = 2", "2/4 zkrátíme: GCD(2,4) = 2 → 2/4 = 1/2"],
  ZLO_007: ["Jmenovatelé jsou stejné → odečteme čitatele: 5 − 1 = 4", "4/6 zkrátíme: GCD(4,6) = 2 → 4/6 = 2/3"],
  ZLO_008: ["Hledáme NSN(4, 2) = 4", "Převedeme: 1/2 = 2/4", "Odečteme: 3/4 − 2/4 = 1/4"],
  ZLO_009: ["Násobení zlomků: čitatele × čitatele, jmenovatele × jmenovatele", "1 × 1 = 1, 2 × 3 = 6", "Výsledek: 1/6"],
  ZLO_010: ["Násobíme: (2 × 3) / (3 × 4) = 6/12", "Zkrátíme: GCD(6, 12) = 6 → 6/12 = 1/2"],
  ZLO_011: ["NSN(3, 4) = 12", "2/3 = 8/12, 3/4 = 9/12", "8/12 + 9/12 = 17/12 (nevlastní zlomek, nelze zkrátit)"],
  ZLO_012: ["NSN(4, 5) = 20", "1/4 = 5/20, 2/5 = 8/20", "5/20 + 8/20 = 13/20"],
  ZLO_013: ["NSN(6, 4) = 12", "5/6 = 10/12, 3/4 = 9/12", "10/12 + 9/12 = 19/12"],
  ZLO_014: ["NSN(3, 4, 6) = 12", "2/3 = 8/12, 3/4 = 9/12, 1/6 = 2/12", "8/12 + 9/12 − 2/12 = 15/12 = 5/4"],
  ZLO_015: ["NSN(2, 3, 6) = 6", "1/2 = 3/6, 1/3 = 2/6, 1/6 = 1/6", "3/6 + 2/6 + 1/6 = 6/6 = 1"],
  ZLO_016: ["NSN(6, 3) = 6", "2/3 = 4/6", "5/6 − 4/6 = 1/6"],
  ZLO_017: ["NSN(8, 4) = 8", "3/4 = 6/8", "7/8 − 6/8 = 1/8"],
  ZLO_018: ["NSN(4, 3) = 12", "5/4 = 15/12, 2/3 = 8/12", "15/12 − 8/12 = 7/12"],
  ZLO_019: ["Násobíme: (3 × 5) / (5 × 6) = 15/30", "GCD(15, 30) = 15 → 15/30 = 1/2"],
  ZLO_020: ["Násobíme: (4 × 7) / (7 × 8) = 28/56", "GCD(28, 56) = 28 → 28/56 = 1/2"],
  ZLO_021: ["Násobíme: (2 × 9) / (3 × 10) = 18/30", "GCD(18, 30) = 6 → 18/30 = 3/5"],
  ZLO_022: ["Dělení = násobení převráceným zlomkem: 3/4 ÷ 1/2 = 3/4 × 2/1", "3 × 2 = 6, 4 × 1 = 4 → 6/4", "GCD(6,4) = 2 → 6/4 = 3/2"],
  ZLO_023: ["Dělení: 2/3 ÷ 4/9 = 2/3 × 9/4", "(2 × 9) / (3 × 4) = 18/12", "GCD(18,12) = 6 → 18/12 = 3/2"],
  ZLO_024: ["Dělení: 5/8 ÷ 5/4 = 5/8 × 4/5", "(5 × 4) / (8 × 5) = 20/40", "GCD(20,40) = 20 → 20/40 = 1/2"],
  ZLO_025: ["Smíšené číslo 2 a 3/4: celá část × jmenovatel + čitatel", "2 × 4 + 3 = 11", "Výsledek: 11/4"],
  ZLO_026: ["Smíšené číslo 3 a 2/5: 3 × 5 + 2 = 17", "Výsledek: 17/5"],
  ZLO_027: ["7 ÷ 3 = 2 se zbytkem 1", "2 je celá část, 1/3 je zlomková část", "Výsledek: 2 a 1/3"],
  ZLO_028: ["11 ÷ 4 = 2 se zbytkem 3", "2 je celá část, 3/4 je zlomková část", "Výsledek: 2 a 3/4"],
  ZLO_029: ["Hledáme GCD(12, 18) = 6", "12 ÷ 6 = 2, 18 ÷ 6 = 3", "Zkrácený zlomek: 2/3"],
  ZLO_030: ["Hledáme GCD(15, 25) = 5", "15 ÷ 5 = 3, 25 ÷ 5 = 5", "Zkrácený zlomek: 3/5"],
};

let updated = 0;
for (const ex of db.examples) {
  if (improvedSteps[ex.id]) {
    ex.reseni_kroky = improvedSteps[ex.id];
    updated++;
  }
}

writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
console.log(`Updated ${updated} examples with improved reseni_kroky`);
