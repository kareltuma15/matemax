// Datové opravy LaTeXu, které renderer (segmentace prózy) neumí spravit sám:
//   • rozbité příkazy slepené s písmenem: „\cdota", „\timesC" (parse error),
//   • dvojité exponenty z míchání unicode a LaTeX horních indexů: „2¹^{2}",
//     „2⁻^{3}" (KaTeX: Double superscript),
//   • exponent zapsaný slovem: „(-1)^sudé" (diakritika v horním indexu),
//   • próza natlačená DOVNITŘ $…$ (těch se segmentér nedotkne): celá věta
//     v dolarech (SES_ZLO_01) a „nebo" mezi mocninami (t04_08).
//
// Při té příležitosti oprava SES_VYR_13, kde vyšel špatný výsledek:
// (x+2)(1−x) − 2x·(−½)·x = −x+2, ne −2x²−x+2 (ověřeno dosazením x=2 → 0).
//
// Spustit: node scripts/fix-latex-rozbite.mjs   (idempotentní)
import fs from "fs";

const OPRAVY = {
  "src/data/databaze.json": {
    MOC_034: { reseni_kroky: { 1: "$(-1)^{100} = 1$" } },
    MOC_035: { reseni_kroky: { 1: "$(-1)^{101} = -1$" } },
    SES_VYR_08: {
      reseni_kroky: { 0: "$3a \\cdot a − 3a \\cdot 2 + 2 \\cdot 1 − 2 \\cdot a$" },
    },
    SES_VYR_13: {
      odpoved: "-x + 2",
      reseni_kroky: [
        "$(x + 2)(1 − x) = x − x^{2} + 2 − 2x = −x^{2} − x + 2$",
        "Druhý člen: $2x \\cdot \\frac{-1}{2} \\cdot x = −x^{2}$",
        "Celý výraz: $(−x^{2} − x + 2) − (−x^{2}) = −x + 2$",
      ],
    },
    SES_ZLO_01: {
      zadani: "Pizza: sníš $\\frac{2}{9}$ pizzy, bratr sní $\\frac{4}{9}$ pizzy. Jakou část pizzy sníte dohromady?",
    },
  },
  "src/data/cermat-200.json": {
    t02_20: {
      reseni_kroky: {
        1: "B je o $\\frac{1}{3}$ menší než C: $B = C − \\frac{1}{3} \\cdot C = 60 − 20 = 40$",
        2: "A je o $\\frac{2}{5}$ větší než B: $A = B + \\frac{2}{5} \\cdot B = 40 + 16 = 56$",
      },
    },
    t04_08: {
      zadani: "Které je větší: $2^{6}$ nebo $3^{4}$?",
    },
    t04_11: {
      reseni_kroky: {
        0: "$(2^{3})^{4} = 2^{12}$",
        1: "$2^{12} \\div 2^{6} = 2^{12-6} = 2^{6}$",
      },
    },
    t04_20: {
      zadani: "Vyjádřete jako zlomek: $2^{-3} + 3^{-2}$",
      reseni_kroky: {
        0: "$2^{-3} = \\frac{1}{2^{3}} = \\frac{1}{8}$",
        1: "$3^{-2} = \\frac{1}{3^{2}} = \\frac{1}{9}$",
      },
    },
  },
};

let zmen = 0;

for (const [file, perId] of Object.entries(OPRAVY)) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const ex of data.examples) {
    const op = perId[ex.id];
    if (!op) continue;
    for (const [pole, hodnota] of Object.entries(op)) {
      if (pole === "reseni_kroky" && !Array.isArray(hodnota)) {
        // Bodové úpravy jednotlivých kroků podle indexu.
        for (const [i, text] of Object.entries(hodnota)) {
          if (ex.reseni_kroky[i] !== text) { ex.reseni_kroky[i] = text; zmen++; }
        }
      } else if (JSON.stringify(ex[pole]) !== JSON.stringify(hodnota)) {
        ex[pole] = hodnota; zmen++;
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

console.log(zmen === 0 ? "Nic k opravě ✅" : `Opraveno polí: ${zmen} ✅`);
